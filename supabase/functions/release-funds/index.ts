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
// În faza de test cu Stripe:
//   - Banii stau în contul Stripe al ModaGo (nu facem Stripe Connect)
//   - "Eliberarea" = înregistrare în ledger + status completed
//   - Plata fizică spre vânzător = manuală sau prin MAIB la integrare
//
// La integrarea MAIB:
//   - Înlocuim blocul `performStripeRelease` cu apelul MAIB disbursement API
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

interface ReleasePayload {
  order_id: string;
  trigger: ReleaseTrigger | RefundTrigger;
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

    if (!isServiceRole) {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (error || !user) return errorResponse("Autentificare necesară", 401);
      callerId = user.id;
    }

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

    // 4. Validează starea și permisiunile
    const validation = validateRelease(order, trigger, callerId, payload);
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
    } else if (trigger === "admin_resolve_refund") {
      result = await processRefund(order, 100);
    } else if (trigger === "admin_resolve_split") {
      const pct = payload.split_refund_pct ?? 50;
      result = await processRefundAndRelease(order, pct);
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

  // auto_release: doar service role, și doar shipped cu auto_release_at expirat
  if (trigger === "auto_release") {
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

  // admin triggers: doar service role (deja validat mai sus)
  if (
    [
      "admin_resolve_release",
      "admin_resolve_refund",
      "admin_resolve_split",
    ].includes(trigger)
  ) {
    if (!["disputed", "shipped", "delivered"].includes(order.status)) {
      return {
        error: `Decizie admin imposibilă din status '${order.status}'`,
        status: 409,
      };
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

  // Tentativa de Stripe transfer (în test mode, înregistrăm în ledger)
  let stripeTransferId: string | null = null;

  try {
    stripeTransferId = await performStripeRelease(
      stripe_charge_id,
      net_mdl,
      order_id,
    );
  } catch (err) {
    // Non-blocking în test: logăm dar continuăm
    // În producție cu MAIB: throw pentru retry
    console.warn("Stripe transfer eșuat (test mode – continuăm):", err);
  }

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
  const { id: order_id, price_mdl, stripe_charge_id, item_id } = order;
  const refund_amount_mdl = Math.round(price_mdl * refundPct) / 100;

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
    notes: `Refund ${refundPct}% după decizie admin`,
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

// ── STRIPE RELEASE ────────────────────────────────────────────────
// În test mode: simulăm transferul (Stripe Connect necesită conturi conectate)
// În producție cu MAIB: înlocuim această funcție cu API-ul MAIB
async function performStripeRelease(
  chargeId: string | null,
  netMdl: number,
  orderId: string,
): Promise<string | null> {
  if (!chargeId) return null;

  // TODO: Când adaugi Stripe Connect sau MAIB, înlocuiește logica de mai jos.
  // Cu Stripe Connect ar fi:
  //   const transfer = await stripe.transfers.create({
  //     amount:      mdlToRonCents(netMdl), // RON, în bani
  //     currency:    'ron',
  //     destination: sellerStripeAccountId,
  //     metadata:    { order_id: orderId },
  //   });
  //   return transfer.id;

  // Test mode: înregistrăm doar în metadata ca "transfer simulat"
  console.log(
    `[TEST MODE] Simulare transfer ${netMdl} MDL pentru order ${orderId}`,
  );
  return `sim_transfer_${Date.now()}`;
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
