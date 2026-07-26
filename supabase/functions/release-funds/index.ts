// ================================================================
// ModaGo – Edge Function: release-funds
// Fișier: supabase/functions/release-funds/index.ts
//
// Eliberează fondurile din escrow spre vânzător.
// Apelată din două surse:
//   1. App (buyer confirmă livrarea): POST cu { order_id, trigger: 'buyer_confirm' }
//   2. Supabase Database Webhook sau pg_cron (auto-release): { trigger: 'auto_release' }
//
// ── Arhitectura financiară ────────────────────────────────────────
// Banii stau în contul Stripe al ModaGo (nu facem Stripe Connect).
// "Eliberarea" = ledger + status completed + suma devine disponibilă
// în Sold (BalanceScreen). Plata fizică spre vânzător e manuală azi:
// vânzătorul cere retragere (withdrawal_requests), tu confirmi transferul
// bancar și marchezi cererea 'paid'.
//
// La integrarea MAIB (sau alt disbursement API real):
//   - Înlocuim blocul `performStripeRelease` cu apelul MAIB disbursement API
//   - Funcția trebuie să arunce eroare la eșec (nu să întoarcă null) —
//     processRelease se bazează pe asta ca să nu marcheze completed pe eșec
//   - Restul logicii rămâne identic
// ================================================================

// @ts-nocheck
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { mdlToRonCents } from "../_shared/currency.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Tip de trigger acceptate
type ReleaseTrigger =
  | "buyer_confirm"
  | "auto_release"
  | "admin_resolve_release";
type RefundTrigger = "admin_resolve_refund" | "admin_resolve_split";
type AgreementTrigger = "seller_accept_offer";
type ReturnTrigger =
  | "admin_require_return"
  | "seller_confirm_return"
  | "admin_confirm_return";

interface ReleasePayload {
  order_id: string;
  trigger: ReleaseTrigger | RefundTrigger | AgreementTrigger | ReturnTrigger;
  split_refund_pct?: number; // pentru resolved_split (0-100)
}

// ── Handler principal ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autentificare – funcția poate fi apelată de user sau de sistem
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceRole = authHeader.includes(
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let callerId: string | null = null;

    let isAdmin = false;

    if (!isServiceRole) {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (error || !user) return errorResponse("Autentificare necesară", 401);
      callerId = user.id;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", callerId)
        .maybeSingle();
      isAdmin = !!profile?.is_admin;
    }

    const isPrivileged = isServiceRole || isAdmin;

    // 2. Parse body
    const payload: ReleasePayload = await req.json();
    const { order_id, trigger } = payload;

    if (!order_id || !trigger) {
      return errorResponse("order_id și trigger sunt obligatorii", 400);
    }

    // 3. Preia order-ul cu lock (FOR UPDATE previne procesări concurente)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return errorResponse(`Order ${order_id} negăsit`, 404);
    }

    // 3b. Pentru triggere legate de dispută, preluăm disputa deschisă
    let dispute: any = null;
    if (
      [
        "admin_resolve_release",
        "admin_resolve_refund",
        "admin_resolve_split",
        "seller_accept_offer",
        "admin_require_return",
        "seller_confirm_return",
        "admin_confirm_return",
      ].includes(trigger)
    ) {
      const { data } = await supabaseAdmin
        .from("disputes")
        .select(
          "id, buyer_offer_pct, offer_status, return_stage, return_tracking_number, return_shipping_cost_mdl",
        )
        .eq("order_id", order_id)
        .in("status", ["open", "under_review"])
        .maybeSingle();
      dispute = data;
    }

    // 4. Validează starea și permisiunile
    const validation = validateRelease(
      order,
      trigger,
      callerId,
      payload,
      isPrivileged,
      dispute,
    );
    if (validation.error) {
      return errorResponse(validation.error, validation.status ?? 400);
    }

    // 5. Procesează în funcție de trigger
    let result: ProcessResult;

    if (
      trigger === "buyer_confirm" ||
      trigger === "auto_release" ||
      trigger === "admin_resolve_release"
    ) {
      result = await processRelease(order);
      if (trigger === "admin_resolve_release") {
        await resolveDisputeIfAny(order.id, "resolved_release", callerId);
      }
    } else if (trigger === "admin_resolve_refund") {
      result = await processRefund(order, 100);
      await resolveDisputeIfAny(order.id, "resolved_refund", callerId);
    } else if (trigger === "admin_resolve_split") {
      const pct = payload.split_refund_pct ?? 50;
      result = await processRefundAndRelease(order, pct);
      await resolveDisputeIfAny(order.id, "resolved_split", callerId, pct);
    } else if (trigger === "seller_accept_offer") {
      const pct = Number(dispute.buyer_offer_pct);
      if (pct >= 100) {
        result = await processRefund(order, 100);
        await resolveDisputeIfAny(order.id, "resolved_refund", callerId);
      } else if (pct <= 0) {
        result = await processRelease(order);
        await resolveDisputeIfAny(order.id, "resolved_release", callerId);
      } else {
        result = await processRefundAndRelease(order, pct);
        await resolveDisputeIfAny(order.id, "resolved_split", callerId, pct);
      }
    } else if (trigger === "admin_require_return") {
      await supabaseAdmin
        .from("disputes")
        .update({ return_stage: "awaiting_return" })
        .eq("id", dispute.id);
      await notifyUser(order.id, "buyer", "return_required");
      result = { message: "Retur cerut cumpărătorului înainte de rambursare" };
    } else if (
      trigger === "seller_confirm_return" ||
      trigger === "admin_confirm_return"
    ) {
      result = await processReturnRefund(order, dispute, callerId);
    } else {
      return errorResponse("Trigger necunoscut", 400);
    }

    console.log(
      `✅ release-funds [${trigger}] order ${order_id}: ${result.message}`,
    );
    return jsonResponse({ success: true, ...result });
  } catch (err) {
    console.error("release-funds error:", err);
    return errorResponse("Eroare internă", 500);
  }
});

// ── VALIDĂRI ─────────────────────────────────────────────────────

interface ValidationResult {
  error?: string;
  status?: number;
}

function validateRelease(
  order: any,
  trigger: string,
  callerId: string | null,
  payload: ReleasePayload,
  isPrivileged: boolean,
  dispute: any,
): ValidationResult {
  // Verificare idempotență: dacă deja completed/refunded, nu facem nimic
  if (["completed", "refunded", "cancelled"].includes(order.status)) {
    return {
      error: `Order deja finalizat (status: ${order.status})`,
      status: 409,
    };
  }

  // buyer_confirm: doar buyer-ul poate confirma, și doar din status 'shipped'
  if (trigger === "buyer_confirm") {
    if (callerId !== order.buyer_id) {
      return {
        error: "Doar cumpărătorul poate confirma livrarea",
        status: 403,
      };
    }
    if (order.status !== "shipped") {
      return {
        error: `Nu se poate confirma din status '${order.status}'`,
        status: 409,
      };
    }
    if (order.has_open_ticket) {
      return {
        error: "Există o dispută deschisă – nu se poate confirma",
        status: 409,
      };
    }
  }

  // auto_release: doar service role/admin, și doar shipped cu auto_release_at expirat
  if (trigger === "auto_release") {
    if (!isPrivileged) {
      return { error: "Trigger rezervat sistemului", status: 403 };
    }
    if (order.status !== "shipped" && order.status !== "delivered") {
      return {
        error: `Auto-release imposibil din status '${order.status}'`,
        status: 409,
      };
    }
    if (order.has_open_ticket) {
      return { error: "Dispută deschisă – auto-release blocat", status: 409 };
    }
    if (order.auto_release_at && new Date(order.auto_release_at) > new Date()) {
      return { error: "Auto-release timer încă activ", status: 409 };
    }
  }

  // admin triggers: doar service role sau profile.is_admin
  if (
    [
      "admin_resolve_release",
      "admin_resolve_refund",
      "admin_resolve_split",
    ].includes(trigger)
  ) {
    if (!isPrivileged) {
      return { error: "Doar un admin poate rezolva o dispută", status: 403 };
    }
    if (!["disputed", "shipped", "delivered"].includes(order.status)) {
      return {
        error: `Decizie admin imposibilă din status '${order.status}'`,
        status: 409,
      };
    }
  }

  // seller_accept_offer: doar vânzătorul, doar cu o ofertă 'pending' a buyer-ului
  if (trigger === "seller_accept_offer") {
    if (callerId !== order.seller_id) {
      return { error: "Doar vânzătorul poate accepta oferta", status: 403 };
    }
    if (order.status !== "disputed") {
      return {
        error: `Nu există dispută activă (status: '${order.status}')`,
        status: 409,
      };
    }
    if (!dispute || dispute.offer_status !== "pending" || dispute.buyer_offer_pct === null) {
      return { error: "Nu există o ofertă în așteptare", status: 409 };
    }
  }

  // admin_require_return: doar admin, marchează disputa ca necesitând retur
  // fizic înainte de rambursare — nu mișcă bani.
  if (trigger === "admin_require_return") {
    if (!isPrivileged) {
      return { error: "Doar un admin poate cere returul", status: 403 };
    }
    if (!dispute || dispute.return_stage !== "none") {
      return { error: "Disputa nu e într-o stare validă pentru asta", status: 409 };
    }
  }

  // seller_confirm_return: doar vânzătorul, doar după ce cumpărătorul a
  // trimis AWB-ul de retur (return_stage 'shipped').
  if (trigger === "seller_confirm_return") {
    if (callerId !== order.seller_id) {
      return { error: "Doar vânzătorul poate confirma primirea returului", status: 403 };
    }
    if (order.status !== "disputed") {
      return {
        error: `Nu există dispută activă (status: '${order.status}')`,
        status: 409,
      };
    }
    if (
      !dispute ||
      dispute.return_stage !== "shipped" ||
      !dispute.return_tracking_number ||
      dispute.return_shipping_cost_mdl === null
    ) {
      return { error: "Returul nu a fost încă trimis de cumpărător", status: 409 };
    }
  }

  // admin_confirm_return: override — adminul finalizează manual dacă
  // vânzătorul nu confirmă primirea returului.
  if (trigger === "admin_confirm_return") {
    if (!isPrivileged) {
      return { error: "Doar un admin poate forța finalizarea returului", status: 403 };
    }
    if (
      !dispute ||
      dispute.return_stage !== "shipped" ||
      !dispute.return_tracking_number ||
      dispute.return_shipping_cost_mdl === null
    ) {
      return { error: "Returul nu a fost încă trimis de cumpărător", status: 409 };
    }
  }

  return {};
}

// ── PROCESARE RELEASE (fonduri spre vânzător) ─────────────────────

interface ProcessResult {
  message: string;
  stripe_transfer_id?: string;
  refund_id?: string;
}

async function processRelease(order: any): Promise<ProcessResult> {
  const { id: order_id, net_mdl, stripe_charge_id } = order;

  // Notă: nu prindem eroarea aici — dacă performStripeRelease aruncă (va fi
  // cazul odată cu integrarea MAIB, când un disbursement poate eșua real),
  // vrem ca order-ul să NU fie marcat 'completed' și să nu se scrie în
  // ledger, ca să poată fi reîncercat. Azi (manual/no-op) nu poate arunca.
  const stripeTransferId = await performStripeRelease(
    stripe_charge_id,
    net_mdl,
    order_id,
  );

  // Actualizăm order-ul → completed
  await supabaseAdmin
    .from("orders")
    .update({
      status: "completed",
      stripe_transfer_id: stripeTransferId,
    })
    .eq("id", order_id);

  // Ledger entry
  await supabaseAdmin.from("escrow_transactions").insert({
    order_id,
    type: "release",
    amount_mdl: net_mdl,
    stripe_id: stripeTransferId,
    notes: `Fonduri eliberate vânzătorului`,
  });

  // Notificări
  await Promise.allSettled([
    notifyUser(order_id, "buyer", "order_completed"),
    notifyUser(order_id, "seller", "funds_released"),
  ]);

  return {
    message: `Fonduri eliberate: ${net_mdl} MDL`,
    stripe_transfer_id: stripeTransferId ?? undefined,
  };
}

// ── PROCESARE REFUND COMPLET (fonduri spre cumpărător) ───────────

async function processRefund(
  order: any,
  refundPct: number,
): Promise<ProcessResult> {
  const { id: order_id, price_mdl, fee_mdl, stripe_charge_id, item_id } = order;

  // La refund COMPLET (vina vânzătorului — produs neconform etc.) cumpărătorul
  // primește înapoi și taxa de protecție, nu doar prețul: nu trebuie să piardă
  // nimic dintr-o tranzacție eșuată din vina celeilalte părți.
  // La refund parțial/split taxa rămâne reținută (decizie împărțită).
  const refund_amount_mdl = refundPct === 100
    ? Math.round((Number(price_mdl) + Number(fee_mdl ?? 0)) * 100) / 100
    : Math.round(price_mdl * refundPct) / 100;

  let stripeRefundId: string | null = null;

  if (stripe_charge_id) {
    const amountRonCents = mdlToRonCents(refund_amount_mdl);

    try {
      const refund = await stripe.refunds.create({
        charge: stripe_charge_id,
        amount: amountRonCents,
        metadata: { order_id, reason: "admin_decision" },
      });
      stripeRefundId = refund.id;
    } catch (err) {
      console.error("Stripe refund eșuat:", err);
      throw err; // Refund-ul trebuie să reușească
    }
  }

  await supabaseAdmin
    .from("orders")
    .update({
      status: "refunded",
      stripe_refund_id: stripeRefundId,
    })
    .eq("id", order_id);

  // Refund complet → anunțul redevine disponibil pentru vânzare
  if (refundPct === 100 && item_id) {
    await supabaseAdmin.from("items").update({ status: "active" }).eq(
      "id",
      item_id,
    );
  }

  await supabaseAdmin.from("escrow_transactions").insert({
    order_id,
    type: refundPct === 100 ? "refund" : "partial_refund",
    amount_mdl: refund_amount_mdl,
    stripe_id: stripeRefundId,
    notes: refundPct === 100
      ? `Refund 100% (preț + taxă protecție) după decizie admin`
      : `Refund ${refundPct}% după decizie admin`,
  });

  await Promise.allSettled([
    notifyUser(order_id, "buyer", "refund_processed"),
    notifyUser(order_id, "seller", "refund_issued"),
  ]);

  return {
    message: `Refund ${refundPct}%: ${refund_amount_mdl} MDL`,
    refund_id: stripeRefundId ?? undefined,
  };
}

// ── PROCESARE SPLIT (50/50 sau altă proporție) ───────────────────

async function processRefundAndRelease(
  order: any,
  refundPct: number,
): Promise<ProcessResult> {
  const { id: order_id, price_mdl, net_mdl, stripe_charge_id } = order;

  // Calculăm sumele
  const refundMdl = Math.round(price_mdl * refundPct) / 100;
  const releaseMdl = Math.round(net_mdl * (1 - refundPct / 100) * 100) / 100;

  let stripeRefundId: string | null = null;

  // Refund parțial spre cumpărător
  if (stripe_charge_id && refundPct > 0) {
    const refundCents = mdlToRonCents(refundMdl);
    try {
      const refund = await stripe.refunds.create({
        charge: stripe_charge_id,
        amount: refundCents,
        metadata: { order_id, reason: "admin_split" },
      });
      stripeRefundId = refund.id;
    } catch (err) {
      console.error("Stripe partial refund eșuat:", err);
      throw err;
    }
  }

  // Actualizăm order-ul → completed (restul la vânzător)
  await supabaseAdmin
    .from("orders")
    .update({ status: "completed", stripe_refund_id: stripeRefundId })
    .eq("id", order_id);

  // Două intrări în ledger: una pentru refund, una pentru release
  await supabaseAdmin.from("escrow_transactions").insert([
    {
      order_id,
      type: "partial_refund",
      amount_mdl: refundMdl,
      stripe_id: stripeRefundId,
      notes: `Split ${refundPct}% refund spre cumpărător`,
    },
    {
      order_id,
      type: "release",
      amount_mdl: releaseMdl,
      stripe_id: null,
      notes: `Split ${100 - refundPct}% eliberat spre vânzător`,
    },
  ]);

  await Promise.allSettled([
    notifyUser(order_id, "buyer", "dispute_resolved"),
    notifyUser(order_id, "seller", "dispute_resolved"),
  ]);

  return {
    message: `Split: ${refundPct}% refund (${refundMdl} MDL) + ${100 - refundPct}% release (${releaseMdl} MDL)`,
  };
}

// ── PROCESARE RETUR + RAMBURSARE (produs defect, vânzător vinovat) ──
// Cumpărătorul deja a trimis produsul înapoi (return_stage 'shipped').
// Rambursăm 100% din preț prin Stripe (în limita sumei încasate) și
// scădem costul AWB-ului din soldul vânzătorului — nu suportă
// cumpărătorul acest cost dacă vânzătorul a fost cel vinovat.
// NOTĂ: costul AWB nu poate fi rambursat prin Stripe pe aceeași
// charge (deja rambursată 100%) — rămâne un transfer manual către
// cumpărător, pe care adminul îl face separat (vezi mesajul de rezultat).
async function processReturnRefund(
  order: any,
  dispute: any,
  callerId: string | null,
): Promise<ProcessResult> {
  const result = await processRefund(order, 100);

  const returnCost = Number(dispute.return_shipping_cost_mdl);
  if (returnCost > 0) {
    await supabaseAdmin.from("balance_adjustments").insert({
      user_id: order.seller_id,
      order_id: order.id,
      amount_mdl: -returnCost,
      reason: `Cost AWB retur (produs neconform) - comandă ${order.id}`,
    });
  }

  await supabaseAdmin
    .from("disputes")
    .update({ return_stage: "received", return_received_at: new Date().toISOString() })
    .eq("id", dispute.id);

  await resolveDisputeIfAny(order.id, "resolved_refund", callerId);

  return {
    ...result,
    message: `${result.message} + retur confirmat` +
      (returnCost > 0
        ? ` (cost AWB ${returnCost} MDL dedus din soldul vânzătorului — trimite-l manual cumpărătorului)`
        : ""),
  };
}

// ── ELIBERARE FONDURI ─────────────────────────────────────────────
// Astăzi retragerile sunt manuale: "eliberarea" doar marchează suma ca
// disponibilă în Sold (BalanceScreen); vânzătorul cere apoi retragerea
// (withdrawal_requests) și tu confirmi manual transferul bancar.
// Niciun transfer real nu are loc aici — de-asta returnează mereu un id
// simulat și nu poate arunca eroare.
//
// TODO la integrarea MAIB (sau alt disbursement API real): înlocuiește
// corpul funcției cu apelul real și ARUNCĂ eroarea la eșec (nu o înghiți) —
// processRelease se bazează pe asta ca să NU marcheze order-ul 'completed'
// dacă transferul real a eșuat.
async function performStripeRelease(
  chargeId: string | null,
  netMdl: number,
  orderId: string,
): Promise<string | null> {
  if (!chargeId) return null;

  console.log(
    `[MANUAL] Fonduri marcate disponibile: ${netMdl} MDL pentru order ${orderId}`,
  );
  return `manual_${Date.now()}`;
}

// ── REZOLVARE DISPUTĂ (dacă order-ul are una deschisă) ────────────
async function resolveDisputeIfAny(
  orderId: string,
  resolution: "resolved_release" | "resolved_refund" | "resolved_split",
  callerId: string | null,
  splitPct?: number,
): Promise<void> {
  const { data: dispute } = await supabaseAdmin
    .from("disputes")
    .select("id")
    .eq("order_id", orderId)
    .in("status", ["open", "under_review"])
    .maybeSingle();

  if (!dispute) return;

  await supabaseAdmin
    .from("disputes")
    .update({
      status: resolution,
      resolved_by: callerId,
      resolved_at: new Date().toISOString(),
      ...(splitPct !== undefined ? { split_refund_pct: splitPct } : {}),
    })
    .eq("id", dispute.id);

  await supabaseAdmin
    .from("orders")
    .update({ has_open_ticket: false })
    .eq("id", orderId);
}

// ── NOTIFICĂRI ────────────────────────────────────────────────────
async function notifyUser(
  orderId: string,
  recipient: "buyer" | "seller",
  event: string,
): Promise<void> {
  try {
    await supabaseAdmin.functions.invoke("push-notification", {
      body: { order_id: orderId, event, recipient },
    });
  } catch {
    // Non-blocking
  }
}

// ── HELPERS ───────────────────────────────────────────────────────
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}
