// supabase/functions/push-notification/index.ts
// Edge Function: trimite push notification pentru mesaje noi și evenimente de comandă.
// Apelată din două surse:
//   1. Database Webhook pe INSERT în messages → { type, table, record: {...} }
//   2. release-funds / stripe-webhook (evenimente de comandă) → { order_id, event, recipient }
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ORDER_EVENT_COPY: Record<string, { title: string; body: string }> = {
  new_order: { title: "Comandă nouă!", body: "Ai o comandă nouă de expediat." },
  order_shipped: { title: "Coletul a fost expediat", body: "Vânzătorul a adăugat AWB-ul, urmărește livrarea." },
  order_completed: { title: "Comandă finalizată", body: "Comanda ta a fost finalizată cu succes." },
  funds_released: { title: "Fonduri disponibile", body: "Suma e disponibilă în Sold — poți cere retragerea." },
  refund_processed: { title: "Rambursare procesată", body: "Ai primit banii înapoi." },
  refund_issued: { title: "Rambursare emisă", body: "S-a emis o rambursare pentru comanda ta." },
  dispute_resolved: { title: "Dispută rezolvată", body: "Disputa comenzii tale a fost rezolvată." },
  dispute_escalated: { title: "Dispută în analiză", body: "Vânzătorul a respins oferta ta — ModaGo va decide." },
  return_required: { title: "Trebuie să returnezi produsul", body: "Trimite produsul înapoi cu AWB ca să primești rambursarea completă." },
};

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const payload = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (payload?.order_id && payload?.event && payload?.recipient) {
      return await handleOrderEvent(supabase, payload, req.headers.get("Authorization"));
    }

    // Webhook payload: { type, table, record, ... }
    const message = payload?.record;
    if (!message?.conversation_id || !message?.sender_id || !message?.content) {
      return new Response("Missing data", { status: 400 });
    }

    // 1. Găsește conversația
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .select("buyer_id, seller_id, item:items(title)")
      .eq("id", message.conversation_id)
      .single();

    if (convoErr || !convo) {
      return new Response("Conversation not found", { status: 404 });
    }

    // 2. Determină destinatarul (celălalt user)
    const recipientId =
      message.sender_id === convo.buyer_id ? convo.seller_id : convo.buyer_id;

    // 3. Ia push token + sender name
    const [recipientRes, senderRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("push_token")
        .eq("id", recipientId)
        .single(),
      supabase
        .from("profiles")
        .select("username")
        .eq("id", message.sender_id)
        .single(),
    ]);

    const pushToken = recipientRes?.data?.push_token;
    if (!pushToken) {
      return new Response("No push token", { status: 200 });
    }

    const senderName = senderRes?.data?.username || "Cineva";
    const itemTitle = convo.item?.title || "un articol";

    // 4. Trimite via Expo Push API
    const pushResult = await sendExpoPush({
      to: pushToken,
      sound: "default",
      title: senderName,
      body:
        message.content.length > 100
          ? message.content.slice(0, 100) + "…"
          : message.content,
      data: {
        type: "new_message",
        conversationId: message.conversation_id,
        itemTitle,
      },
    });
    console.log("Push result:", JSON.stringify(pushResult));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Push function error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ── Evenimente de comandă (release-funds / stripe-webhook) ──────────
async function handleOrderEvent(
  supabase: ReturnType<typeof createClient>,
  payload: { order_id: string; event: string; recipient: "buyer" | "seller" },
  authHeader: string | null,
) {
  const { order_id, event, recipient } = payload;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("buyer_id, seller_id")
    .eq("id", order_id)
    .single();

  if (orderErr || !order) {
    return new Response("Order not found", { status: 404 });
  }

  // Autorizare: apeluri de la alte edge functions folosesc service role key.
  // Apeluri directe din client (ex. seller adaugă AWB) trebuie să vină
  // de la unul dintre participanții comenzii.
  const isServiceRole = !!authHeader && authHeader.includes(SERVICE_ROLE_KEY);
  if (!isServiceRole) {
    const {
      data: { user },
    } = await supabase.auth.getUser((authHeader ?? "").replace("Bearer ", ""));
    if (!user || (user.id !== order.buyer_id && user.id !== order.seller_id)) {
      return new Response("Not authorized for this order", { status: 403 });
    }
  }

  const recipientId = recipient === "buyer" ? order.buyer_id : order.seller_id;

  const copy = ORDER_EVENT_COPY[event] ?? {
    title: "ModaGo",
    body: "Ai o actualizare la o comandă.",
  };

  // Înregistrăm mereu notificarea in-app (banner la login/intrare în app),
  // indiferent dacă push token-ul există sau notificările sunt permise.
  await supabase.from("notifications").insert({
    user_id: recipientId,
    type: event,
    order_id,
    title: copy.title,
    body: copy.body,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", recipientId)
    .single();

  const pushToken = profile?.push_token;
  if (!pushToken) {
    return new Response(JSON.stringify({ success: true, push: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await sendExpoPush({
    to: pushToken,
    sound: "default",
    title: copy.title,
    body: copy.body,
    data: { type: "order_event", orderId: order_id, event },
  });

  console.log("Push result:", JSON.stringify(result));
  return new Response(JSON.stringify({ success: true, push: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendExpoPush(pushPayload: Record<string, unknown>) {
  const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(pushPayload),
  });

  return pushResponse.json();
}
