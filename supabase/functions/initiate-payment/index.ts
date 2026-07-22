// ================================================================
// ModaGo – Edge Function: initiate-payment
// Fișier: supabase/functions/initiate-payment/index.ts
//
// Flow:
//   App → această funcție → Stripe PaymentIntent → App (client_secret)
//   App completează plata în Stripe → stripe-webhook preia de aici
//
// Variabile de mediu necesare (Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY       sk_test_...
//   STRIPE_WEBHOOK_SECRET   whsec_...  (pentru stripe-webhook)
//
// NOTĂ: Stripe nu suportă MDL nativ. Folosim RON (leul românesc).
//   La integrarea MAIB: înlocuim doar blocul `createPaymentIntent`.
// ================================================================
// @ts-nocheck
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { STRIPE_CHARGE_CURRENCY, mdlToRonCents } from "../_shared/currency.ts";

// Taxă de protecție cumpărător (stil Vinted): procent + sumă fixă,
// suportată integral de cumpărător — vânzătorul primește 100% din preț.
const BUYER_FEE_PCT = 5;
const BUYER_FEE_FIXED_MDL = 2;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Handler principal ─────────────────────────────────────────────
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autentificare utilizator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Autentificare necesară", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return errorResponse("Token invalid", 401);
    }

    // 2. Parse body
    const { item_id, shipping_address_id } = await req.json();

    if (!item_id || !shipping_address_id) {
      return errorResponse(
        "item_id și shipping_address_id sunt obligatorii",
        400,
      );
    }

    // 3. Validează anunțul
    const { data: item, error: itemError } = await supabaseAdmin
      .from("items")
      .select("id, title, price, user_id, status")
      .eq("id", item_id)
      .single();

    if (itemError || !item) {
      return errorResponse("Anunț negăsit", 404);
    }

    if (item.status !== "active") {
      return errorResponse("Anunțul nu mai este disponibil", 409);
    }

    if (item.user_id === user.id) {
      return errorResponse("Nu poți cumpăra propriul anunț", 403);
    }

    // 4. Validează adresa de livrare
    const { data: address, error: addrError } = await supabaseAdmin
      .from("shipping_addresses")
      .select("*")
      .eq("id", shipping_address_id)
      .eq("user_id", user.id)
      .single();

    if (addrError || !address) {
      return errorResponse("Adresă de livrare negăsită", 404);
    }

    // 5. Calculează sumele — taxă de protecție cumpărător (stil Vinted):
    // cumpărătorul plătește preț + taxă; vânzătorul primește 100% din preț.
    const price_mdl = Number(item.price);
    const fee_pct = BUYER_FEE_PCT;
    const fee_mdl =
      Math.round((price_mdl * BUYER_FEE_PCT / 100 + BUYER_FEE_FIXED_MDL) * 100) /
      100;
    const net_mdl = price_mdl;
    const total_mdl = Math.round((price_mdl + fee_mdl) * 100) / 100;

    // Conversie pentru Stripe (RON, în bani) — se taxează prețul + taxa
    const amount_ron_cents = mdlToRonCents(total_mdl);

    // 6. Verifică că nu există deja o comandă activă pentru același anunț
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("item_id", item_id)
      .in("status", [
        "pending_payment",
        "paid",
        "shipped",
        "delivered",
        "disputed",
      ])
      .maybeSingle();

    if (existingOrder) {
      return errorResponse(
        "Există deja o comandă activă pentru acest anunț",
        409,
      );
    }

    // 7. Creează order-ul în DB (status: pending_payment)
    const shippingSnapshot = {
      full_name: address.full_name,
      phone: address.phone,
      city: address.city,
      address: address.address,
      postal_code: address.postal_code,
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        buyer_id: user.id,
        seller_id: item.user_id,
        item_id: item_id,
        status: "pending_payment",
        price_mdl: price_mdl,
        fee_pct: fee_pct,
        fee_mdl: fee_mdl,
        net_mdl: net_mdl,
        shipping_address: shippingSnapshot,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      return errorResponse("Eroare la crearea comenzii", 500);
    }

    // 7b. Rezervăm anunțul imediat — dispare din listări cât timp
    // comanda e în curs de plată (nu așteptăm confirmarea Stripe).
    await supabaseAdmin
      .from("items")
      .update({ status: "reserved" })
      .eq("id", item_id)
      .eq("status", "active");

    // 8. Creează Stripe PaymentIntent
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amount_ron_cents,
        currency: STRIPE_CHARGE_CURRENCY,
        metadata: {
          order_id: order.id,
          item_id: item_id,
          buyer_id: user.id,
          seller_id: item.user_id,
          price_mdl: price_mdl.toString(),
          fee_mdl: fee_mdl.toString(),
          total_mdl: total_mdl.toString(),
          // Identificator pentru webhook
          platform: "modago",
        },
        description: `ModaGo – ${item.title}`,
        // Permite confirmare automată din app
        automatic_payment_methods: { enabled: true },
      });
    } catch (piErr) {
      console.error("Stripe PaymentIntent error:", piErr);
      // Anulăm comanda și eliberăm anunțul — nu lăsăm o rezervare orfană
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);
      await supabaseAdmin
        .from("items")
        .update({ status: "active" })
        .eq("id", item_id)
        .eq("status", "reserved");
      return errorResponse("Eroare la inițierea plății", 500);
    }

    // 9. Actualizează order-ul cu PaymentIntent ID
    await supabaseAdmin
      .from("orders")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", order.id);

    // 10. Răspuns spre app
    return jsonResponse({
      order_id: order.id,
      client_secret: paymentIntent.client_secret,
      amount_mdl: price_mdl,
      fee_mdl: fee_mdl,
      total_mdl: total_mdl,
      amount_ron: amount_ron_cents / 100,
    });
  } catch (err) {
    console.error("initiate-payment error:", err);
    return errorResponse("Eroare internă de server", 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}
