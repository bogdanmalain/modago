// src/services/chatService.js
// Serviciu pentru sistemul de mesagerie ModaGo

import { supabase } from "../supabaseClient";

/**
 * Găsește sau creează o conversație între buyer și seller pentru un item.
 * Returnează conversația (cu date despre item și celălalt user).
 */
export async function getOrCreateConversation({ itemId, buyerId, sellerId }) {
  if (!itemId || !buyerId || !sellerId) {
    throw new Error("Lipsesc parametri pentru conversație.");
  }

  if (buyerId === sellerId) {
    throw new Error("Nu poți deschide chat pentru propriul anunț.");
  }

  // Verifică dacă există deja
  const { data: existing, error: fetchErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("item_id", itemId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (existing) return existing;

  // Creează conversație nouă
  const { data: created, error: createErr } = await supabase
    .from("conversations")
    .insert({ item_id: itemId, buyer_id: buyerId, seller_id: sellerId })
    .select("*")
    .single();

  if (createErr) throw createErr;
  return created;
}

/**
 * Încarcă toate conversațiile user-ului curent,
 * cu ultimul mesaj, info item și info celălalt user.
 */
export async function fetchConversations(userId) {
  if (!userId) return [];

  // 1. Fetch conversații + item
  const { data, error } = await supabase
    .from("conversations")
    .select("*, item:items(id, title, images, price)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  const convos = (data || []).filter((c) => !c.hidden_for?.includes(userId));

  // 2. Colectează toate user ID-urile unice
  const userIds = new Set();
  convos.forEach((c) => {
    if (c.buyer_id) userIds.add(c.buyer_id);
    if (c.seller_id) userIds.add(c.seller_id);
  });

  // 3. Fetch profiles separat
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", Array.from(userIds));

  const profileMap = {};
  (profiles || []).forEach((p) => {
    profileMap[p.id] = p;
  });

  // 4. Atașează profiluri + ultimul mesaj + unread count
  const withExtras = await Promise.all(
    convos.map(async (c) => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at, read_at")
        .eq("conversation_id", c.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .neq("sender_id", userId)
        .is("read_at", null)
        .is("deleted_at", null);

      return {
        ...c,
        buyer: profileMap[c.buyer_id] || {
          id: c.buyer_id,
          username: "Utilizator",
        },
        seller: profileMap[c.seller_id] || {
          id: c.seller_id,
          username: "Utilizator",
        },
        lastMessage: msgs?.[0] || null,
        unreadCount: count || 0,
      };
    }),
  );

  return withExtras;
}

/**
 * Încarcă mesajele unei conversații (paginat).
 */
export async function fetchMessages(
  conversationId,
  { limit = 50, before } = {},
) {
  if (!conversationId) return [];

  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reverse();
}

/**
 * Trimite un mesaj.
 */
export async function sendMessage({ conversationId, senderId, content }) {
  if (!conversationId || !senderId || !content?.trim()) {
    throw new Error("Mesaj invalid.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Marchează mesajele ca citite.
 */
export async function markMessagesAsRead(conversationId, userId) {
  if (!conversationId || !userId) return;

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) console.log("⚠️ markAsRead error:", error);
}

/**
 * Subscrie la mesaje noi în timp real.
 * Returnează channel-ul (pentru cleanup).
 */
export function subscribeToMessages(conversationId, onNewMessage) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload?.new) onNewMessage(payload.new);
      },
    )
    .subscribe();

  return channel;
}
// ── Soft delete mesaj propriu ──
export async function deleteMessage(messageId, userId) {
  try {
    const { data: msg, error: fetchError } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("id", messageId)
      .single();

    console.log("🔍 msg găsit:", msg, "fetchError:", fetchError);

    if (fetchError || !msg) throw new Error("Mesajul nu există");
    if (msg.sender_id !== userId) throw new Error("Nu poți șterge acest mesaj");

    const { data, error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);

    console.log("🗑️ update result:", data, "error:", error);

    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.log("❌ deleteMessage:", e.message);
    return { success: false, error: e.message };
  }
}

// ── Ascunde conversația doar pentru user-ul curent ──
export async function hideConversation(conversationId, userId) {
  try {
    const { data: convo, error: fetchError } = await supabase
      .from("conversations")
      .select("hidden_for")
      .eq("id", conversationId)
      .single();

    if (fetchError || !convo) throw new Error("Conversația nu există");

    const hiddenFor = new Set(convo.hidden_for ?? []);
    hiddenFor.add(userId);

    const { error } = await supabase
      .from("conversations")
      .update({ hidden_for: Array.from(hiddenFor) })
      .eq("id", conversationId);

    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.log("❌ hideConversation:", e.message);
    return { success: false, error: e.message };
  }
}

// ── Marchează conversația ca finalizată (apelat după escrow) ──
export async function markConversationCompleted(conversationId) {
  try {
    const { error } = await supabase
      .from("conversations")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.log("❌ markConversationCompleted:", e.message);
    return { success: false };
  }
}
