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
  order_completed: { title: "Comandă finalizată", body: "Comanda ta a fost finalizată cu succes." },
  refund_processed: { title: "Rambursare procesată", body: "Ai primit banii înapoi." },
  refund_issued: { title: "Rambursare emisă", body: "S-a emis o rambursare pentru comanda ta." },
  dispute_resolved: { title: "Dispută rezolvată", body: "Disputa comenzii tale a fost rezolvată." },
};

serve(async (req) => {
  try {
    const payload = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (payload?.order_id && payload?.event && payload?.recipient) {
      return await handleOrderEvent(supabase, payload);
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

  const recipientId = recipient === "buyer" ? order.buyer_id : order.seller_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", recipientId)
    .single();

  const pushToken = profile?.push_token;
  if (!pushToken) {
    return new Response("No push token", { status: 200 });
  }

  const copy = ORDER_EVENT_COPY[event] ?? {
    title: "ModaGo",
    body: "Ai o actualizare la o comandă.",
  };

  const result = await sendExpoPush({
    to: pushToken,
    sound: "default",
    title: copy.title,
    body: copy.body,
    data: { type: "order_event", orderId: order_id, event },
  });

  console.log("Push result:", JSON.stringify(result));
  return new Response(JSON.stringify({ success: true }), {
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
