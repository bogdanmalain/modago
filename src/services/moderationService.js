// Raportare de conținut + blocare utilizatori (cerință Google Play UGC).
import { supabase } from "../supabaseClient";

async function requireUserId() {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error("Trebuie să fii autentificat.");
  return userId;
}

/**
 * target: { type: 'item'|'user'|'conversation', itemId?, userId?, conversationId? }
 */
export async function submitReport(target, reason, details = "") {
  const reporterId = await requireUserId();

  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: target.type,
    item_id: target.itemId ?? null,
    reported_user_id: target.userId ?? null,
    conversation_id: target.conversationId ?? null,
    reason,
    details: details?.trim() || null,
  });

  if (error) throw error;
}

export async function blockUser(blockedId) {
  const blockerId = await requireUserId();
  const { error } = await supabase
    .from("blocked_users")
    .upsert(
      { blocker_id: blockerId, blocked_id: blockedId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function unblockUser(blockedId) {
  const blockerId = await requireUserId();
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

/** Set cu ID-urile utilizatorilor blocați de utilizatorul curent. */
export async function getBlockedIds() {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id;
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", userId);

  if (error) throw error;
  return new Set((data || []).map((r) => r.blocked_id));
}

export const REPORT_REASONS = [
  "Produs interzis sau contrafăcut",
  "Înșelătorie / fraudă",
  "Conținut nepotrivit",
  "Spam",
  "Altceva",
];
