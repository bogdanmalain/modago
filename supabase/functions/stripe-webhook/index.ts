// ================================================================
// ModaGo – Edge Function: stripe-webhook
// Fișier: supabase/functions/stripe-webhook/index.ts
//
// Primește evenimente de la Stripe și actualizează starea comenzilor.
// Toate operațiile sunt idempotente (safe pentru retry-uri Stripe).
//
// Evenimente gestionate:
//   payment_intent.succeeded       → order: paid, escrow: hold
//   payment_intent.payment_failed  → order: cancelled
//   charge.refunded                → order: refunded, escrow: refund
//
// Configurare în Stripe Dashboard → Webhooks:
//   URL: https://[project].supabase.co/functions/v1/stripe-webhook
//   Events: payment_intent.succeeded, payment_intent.payment_failed,
//           charge.refunded
// ================================================================

// @ts-nocheck
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// ── Handler principal ─────────────────────────────────────────────
Deno.serve(async (req) => {
  // Stripe trimite întotdeauna POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1. Verifică semnătura Stripe (securitate critică)
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("Webhook fără semnătură Stripe");
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Semnătură webhook invalidă:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`Webhook primit: ${event.type} [${event.id}]`);

  // 2. Dispatch pe tipul evenimentului
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        // Ignorăm evenimentele necunoscute (Stripe poate trimite mai multe)
        console.log(`Eveniment ignorat: ${event.type}`);
    }
  } catch (err) {
    console.error(`Eroare la procesarea evenimentului ${event.type}:`, err);
    // Returnăm 500 → Stripe va retry automat
    return new Response("Processing error", { status: 500 });
  }

  // Stripe așteaptă 200 pentru a considera webhook-ul procesat
  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ── payment_intent.succeeded ──────────────────────────────────────
// Plata a fost procesată cu succes → deblocăm escrow-ul
async function handlePaymentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const { order_id, price_mdl, item_id } = pi.metadata;

  if (!order_id) {
    console.error("PaymentIntent fără order_id în metadata:", pi.id);
    return;
  }

  // Verificare idempotență: dacă order-ul e deja 'paid', nu facem nimic
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status, stripe_payment_intent_id")
    .eq("id", order_id)
    .single();

  if (!order) {
    console.error(`Order ${order_id} negăsit pentru PI ${pi.id}`);
    return;
  }

  if (order.status !== "pending_payment") {
    console.log(
      `Order ${order_id} deja procesat (status: ${order.status}). Skip.`,
    );
    return;
  }

  // Obținem charge_id din PaymentIntent (pentru refund-uri ulterioare)
  const chargeId = pi.latest_charge as string | null;

  // Actualizăm order-ul → status: paid
  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      stripe_charge_id: chargeId,
    })
    .eq("id", order_id)
    .eq("status", "pending_payment"); // guard împotriva race conditions

  if (updateError) {
    console.error(`Eroare actualizare order ${order_id}:`, updateError);
    throw updateError;
  }

  // Înregistrăm tranzacția în ledger-ul escrow
  await supabaseAdmin.from("escrow_transactions").insert({
    order_id,
    type: "hold",
    amount_mdl: Number(price_mdl) || 0,
    stripe_id: pi.id,
    notes: `Plată confirmată. Charge: ${chargeId ?? "N/A"}`,
  });

  // Marcăm anunțul ca vândut — dispare din listări
  if (item_id) {
    await supabaseAdmin
      .from("items")
      .update({ status: "sold" })
      .eq("id", item_id);
  }

  // Notificăm vânzătorul (push notification via Edge Function separată)
  await notifySeller(order_id, "new_order");

  console.log(`✅ Order ${order_id} → paid (PI: ${pi.id})`);
}

// ── payment_intent.payment_failed ────────────────────────────────
async function handlePaymentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const { order_id } = pi.metadata;
  if (!order_id) return;

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("id", order_id)
    .single();

  if (!order || order.status !== "pending_payment") return;

  await supabaseAdmin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", order_id);

  console.log(`❌ Order ${order_id} → cancelled (PI eșuat: ${pi.id})`);
}

// ── charge.refunded ───────────────────────────────────────────────
// Apelat când admin face refund din Stripe Dashboard sau
// când release-funds face un refund programatic
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  if (!charge.payment_intent) return;

  // Găsim order-ul după stripe_charge_id
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status, price_mdl, item_id")
    .eq("stripe_charge_id", charge.id)
    .maybeSingle();

  if (!order) {
    console.log(`Charge ${charge.id} nu are order asociat. Skip.`);
    return;
  }

  // Dacă deja refunded, skip
  if (order.status === "refunded") return;

  await supabaseAdmin
    .from("orders")
    .update({ status: "refunded", stripe_refund_id: charge.id })
    .eq("id", order.id);

  await supabaseAdmin.from("escrow_transactions").insert({
    order_id: order.id,
    type: "refund",
    amount_mdl: Number(order.price_mdl),
    stripe_id: charge.id,
    notes: "Refund procesat prin Stripe",
  });

  // Anunțul redevine disponibil pentru vânzare
  if (order.item_id) {
    await supabaseAdmin
      .from("items")
      .update({ status: "active" })
      .eq("id", order.item_id);
  }

  await notifyBuyer(order.id, "refund_processed");

  console.log(`💸 Order ${order.id} → refunded`);
}

// ── Push notifications (placeholder – de conectat cu serviciul tău) ──
async function notifySeller(orderId: string, event: string): Promise<void> {
  try {
    await supabaseAdmin.functions.invoke("push-notification", {
      body: { order_id: orderId, event, recipient: "seller" },
    });
  } catch (err) {
    // Non-blocking: notificările nu trebuie să blocheze plata
    console.warn("Push notification eșuat (non-critic):", err);
  }
}

async function notifyBuyer(orderId: string, event: string): Promise<void> {
  try {
    await supabaseAdmin.functions.invoke("push-notification", {
      body: { order_id: orderId, event, recipient: "buyer" },
    });
  } catch (err) {
    console.warn("Push notification eșuat (non-critic):", err);
  }
}
