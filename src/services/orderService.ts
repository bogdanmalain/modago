// ================================================================
// ModaGo – Order Service
// Fișier: src/services/orderService.ts
// Toate interacțiunile cu tabelul `orders` și cele adiacente
// ================================================================

import { supabase } from "../supabaseClient";
import * as FileSystem from "expo-file-system/legacy";
import type {
  Order,
  OrderWithDetails,
  ShippingAddress,
  EscrowTransaction,
  SellerReview,
  Dispute,
  DisputeEvidence,
  SellerRatingSummary,
  CreateOrderPayload,
  AddTrackingPayload,
  OpenDisputePayload,
  CreateReviewPayload,
} from "../types/escrow";
import { calculateOrderAmounts } from "../types/escrow";

// ── ORDERS ───────────────────────────────────────────────────────

/**
 * Inițiază o comandă și returnează client_secret Stripe
 * pentru a completa plata în frontend.
 * Logica financiară și crearea PaymentIntent sunt în Edge Function.
 */
export async function initiateCheckout(payload: CreateOrderPayload): Promise<{
  order_id: string;
  client_secret: string;
  amount_mdl: number;
}> {
  const { data, error } = await supabase.functions.invoke("initiate-payment", {
    body: payload,
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Preia o comandă completă cu detalii listing + utilizatori
 */
export async function getOrderById(orderId: string): Promise<OrderWithDetails> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      item:items (
        id, title, price, images
      ),
      dispute:disputes (*),
      review:seller_reviews (*)
    `,
    )
    .eq("id", orderId)
    .single();

  if (error) throw error;

  const order = data as OrderWithDetails;
  const profiles = await getProfilesByIds([order.buyer_id, order.seller_id]);

  return {
    ...order,
    buyer: profiles[order.buyer_id],
    seller: profiles[order.seller_id],
  };
}

/**
 * Toate comenzile utilizatorului curent (ca buyer sau seller)
 */
export async function getMyOrders(): Promise<{
  asBuyer: OrderWithDetails[];
  asSeller: OrderWithDetails[];
}> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      item:items (id, title, price, images)
    `,
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const orders = (data ?? []) as OrderWithDetails[];
  const allIds = orders.flatMap((o) => [o.buyer_id, o.seller_id]);
  const profiles = await getProfilesByIds(allIds);

  const withProfiles = orders.map((o) => ({
    ...o,
    buyer: profiles[o.buyer_id],
    seller: profiles[o.seller_id],
  }));

  return {
    asBuyer: withProfiles.filter((o) => o.buyer_id === userId),
    asSeller: withProfiles.filter((o) => o.seller_id === userId),
  };
}

/**
 * Soldul vânzătorului:
 * - pending_mdl: bani din comenzi plătite, dar necompletate încă (escrow)
 * - available_mdl: bani eliberați (comenzi finalizate), încă neretrași
 */
export async function getMyBalance(): Promise<{
  pending_mdl: number;
  available_mdl: number;
}> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const [ordersRes, withdrawalsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("net_mdl, status")
      .eq("seller_id", userId)
      .in("status", ["paid", "shipped", "delivered", "completed"]),
    supabase
      .from("withdrawal_requests")
      .select("amount_mdl, status")
      .eq("user_id", userId)
      .in("status", ["pending", "paid"]),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (withdrawalsRes.error) throw withdrawalsRes.error;

  let pending_mdl = 0;
  let available_mdl = 0;

  (ordersRes.data ?? []).forEach((o) => {
    if (o.status === "completed") {
      available_mdl += Number(o.net_mdl);
    } else {
      pending_mdl += Number(o.net_mdl);
    }
  });

  (withdrawalsRes.data ?? []).forEach((w) => {
    available_mdl -= Number(w.amount_mdl);
  });

  const { data: adjustments, error: adjustmentsError } = await supabase
    .from("balance_adjustments")
    .select("amount_mdl")
    .eq("user_id", userId);
  if (adjustmentsError) throw adjustmentsError;
  (adjustments ?? []).forEach((a) => {
    available_mdl += Number(a.amount_mdl);
  });

  return {
    pending_mdl: Math.round(pending_mdl * 100) / 100,
    available_mdl: Math.round(Math.max(0, available_mdl) * 100) / 100,
  };
}

// ── RETRAGERI ─────────────────────────────────────────────────────

export type WithdrawalRequest = {
  id: string;
  user_id: string;
  amount_mdl: number;
  card_holder_name: string;
  card_number_last4: string;
  iban: string;
  status: "pending" | "paid" | "rejected";
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
};

/**
 * Creează o cerere de retragere. Reține doar ultimele 4 cifre ale
 * cardului (referință pentru procesarea manuală) — nu stocăm
 * niciodată numărul complet de card în baza de date.
 */
export async function createWithdrawalRequest(payload: {
  amount_mdl: number;
  card_holder_name: string;
  card_number: string;
  iban: string;
}): Promise<WithdrawalRequest> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const digitsOnly = payload.card_number.replace(/\D/g, "");
  const last4 = digitsOnly.slice(-4);
  const iban = payload.iban.replace(/\s/g, "").toUpperCase();

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .insert({
      user_id: userId,
      amount_mdl: payload.amount_mdl,
      card_holder_name: payload.card_holder_name.trim(),
      card_number_last4: last4,
      iban,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Preia profiluri (username, avatar_url) pentru un set de user id-uri.
 * `orders` are FK către `users` (auth), nu direct către `profiles`,
 * deci PostgREST nu poate face embed automat — le preluăm separat.
 */
async function getProfilesByIds(
  userIds: string[],
): Promise<Record<string, { id: string; username: string; avatar_url?: string }>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", uniqueIds);

  if (error) throw error;

  const map: Record<string, { id: string; username: string; avatar_url?: string }> = {};
  (data ?? []).forEach((p) => {
    map[p.id] = p;
  });
  return map;
}

// ── SHIPPING ADDRESSES ───────────────────────────────────────────

export async function getMyAddresses(): Promise<ShippingAddress[]> {
  const { data, error } = await supabase
    .from("shipping_addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveAddress(
  address: Omit<
    ShippingAddress,
    "id" | "user_id" | "created_at" | "updated_at"
  >,
): Promise<ShippingAddress> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const { data, error } = await supabase
    .from("shipping_addresses")
    .insert({ ...address, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAddress(
  addressId: string,
  address: Omit<
    ShippingAddress,
    "id" | "user_id" | "created_at" | "updated_at" | "is_default"
  >,
): Promise<ShippingAddress> {
  const { data, error } = await supabase
    .from("shipping_addresses")
    .update(address)
    .eq("id", addressId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAddress(addressId: string): Promise<void> {
  const { error } = await supabase
    .from("shipping_addresses")
    .delete()
    .eq("id", addressId);

  if (error) throw error;
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const { error: unsetError } = await supabase
    .from("shipping_addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .neq("id", addressId);

  if (unsetError) throw unsetError;

  const { error } = await supabase
    .from("shipping_addresses")
    .update({ is_default: true })
    .eq("id", addressId);

  if (error) throw error;
}

// ── SELLER: TRACKING ─────────────────────────────────────────────

/**
 * Vânzătorul adaugă numărul de tracking (paid → shipped)
 */
export async function addTracking(payload: AddTrackingPayload): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      courier_name: payload.courier_name,
      tracking_number: payload.tracking_number,
    })
    .eq("id", payload.order_id)
    .eq("status", "paid"); // guard suplimentar

  if (error) throw error;

  // Notificăm cumpărătorul (push + banner in-app) — non-blocking
  try {
    await supabase.functions.invoke("push-notification", {
      body: {
        order_id: payload.order_id,
        event: "order_shipped",
        recipient: "buyer",
      },
    });
  } catch (e) {
    console.warn("Notificare order_shipped eșuată (non-critic):", e);
  }
}

// ── BUYER: CONFIRMARE LIVRARE ────────────────────────────────────

/**
 * Cumpărătorul confirmă primirea coletului.
 * Apelează direct Edge Function `release-funds` (trigger: buyer_confirm),
 * care validează + eliberează fondurile și trece order-ul: shipped → completed.
 */
export async function confirmDelivery(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("release-funds", {
    body: { order_id: orderId, trigger: "buyer_confirm" },
  });

  if (error) throw new Error(error.message);
}

// ── DISPUTE ───────────────────────────────────────────────────────

export async function openDispute(
  payload: OpenDisputePayload,
): Promise<Dispute> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const { data, error } = await supabase
    .from("disputes")
    .insert({
      order_id: payload.order_id,
      opened_by: userId,
      reason: payload.reason,
    })
    .select()
    .single();

  if (error) throw error;

  // Marcăm comanda ca disputată — blochează auto-release-ul și confirmarea
  // directă de livrare cât timp disputa e deschisă. Permis de RLS
  // (orders_update_buyer: shipped → disputed).
  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "disputed", has_open_ticket: true })
    .eq("id", payload.order_id);

  if (orderError) throw orderError;

  return data;
}

/**
 * Preia disputa unei comenzi (cel mult una per comandă, în designul actual),
 * sau null dacă nu s-a deschis niciodată una.
 */
export async function getDisputeForOrder(
  orderId: string,
): Promise<Dispute | null> {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * URL semnat temporar pentru o poză de dovadă (bucket-ul e privat —
 * vizibil doar pentru buyer/seller-ul comenzii, via RLS pe storage.objects).
 */
export async function getDisputeEvidenceSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("dispute-evidence")
    .createSignedUrl(storagePath, 60 * 60);

  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function addDisputeEvidence(
  disputeId: string,
  type: "image" | "text_note",
  descriptionOrPath: string,
): Promise<DisputeEvidence> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const { data, error } = await supabase
    .from("dispute_evidence")
    .insert({
      dispute_id: disputeId,
      uploaded_by: userId,
      type,
      ...(type === "image"
        ? { storage_path: descriptionOrPath }
        : { description: descriptionOrPath }),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const g: any = global as any;
  const binary = g.atob ? g.atob(base64) : atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Upload imagine dovadă în Supabase Storage.
 * Notă: NU folosim fetch(uri).blob() — pe Android, pentru URI-uri
 * content:// (cele întoarse de ImagePicker din galerie), asta aruncă des
 * "Network request failed". Citim fișierul ca base64 via expo-file-system,
 * la fel ca la upload-ul pozelor de anunț (AddItemScreen.js).
 */
export async function uploadDisputeImage(
  disputeId: string,
  uri: string,
): Promise<string> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  const info = await FileSystem.getInfoAsync(uri);
  if (!info?.exists) throw new Error("Fișierul nu există pe device.");

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64) throw new Error("Nu pot citi poza (base64 gol).");

  const bytes = base64ToUint8Array(base64);
  const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${disputeId}/${userId}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("dispute-evidence")
    .upload(path, bytes, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });

  if (uploadError) throw uploadError;
  return path;
}

export async function getDisputeEvidence(
  disputeId: string,
): Promise<DisputeEvidence[]> {
  const { data, error } = await supabase
    .from("dispute_evidence")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ── ADMIN ─────────────────────────────────────────────────────────
// Necesită profiles.is_admin = true pentru contul curent — vizibilitatea
// e garantată de RLS (disputes_select_admin / orders_select_admin), nu
// doar de UI. Rezolvarea efectivă e validată din nou server-side în
// release-funds (isPrivileged), deci gating-ul de UI e doar confort.

export async function isCurrentUserAdmin(): Promise<boolean> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.is_admin;
}

export interface OpenDisputeSummary extends Dispute {
  order: {
    id: string;
    price_mdl: number;
    buyer_id: string;
    seller_id: string;
    item?: { title?: string } | null;
  };
}

export async function getOpenDisputes(): Promise<OpenDisputeSummary[]> {
  const { data, error } = await supabase
    .from("disputes")
    .select(
      "*, order:orders(id, price_mdl, buyer_id, seller_id, item:items(title))",
    )
    .in("status", ["open", "under_review"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OpenDisputeSummary[];
}

export async function getResolvedDisputes(): Promise<OpenDisputeSummary[]> {
  const { data, error } = await supabase
    .from("disputes")
    .select(
      "*, order:orders(id, price_mdl, buyer_id, seller_id, item:items(title))",
    )
    .in("status", ["resolved_release", "resolved_refund", "resolved_split", "closed"])
    .order("resolved_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OpenDisputeSummary[];
}

export type AdminResolution =
  | "admin_resolve_release"
  | "admin_resolve_refund"
  | "admin_resolve_split";

export async function resolveDisputeAsAdmin(
  orderId: string,
  trigger: AdminResolution,
  splitRefundPct?: number,
): Promise<void> {
  const { error } = await supabase.functions.invoke("release-funds", {
    body: {
      order_id: orderId,
      trigger,
      ...(splitRefundPct !== undefined
        ? { split_refund_pct: splitRefundPct }
        : {}),
    },
  });

  if (error) throw new Error(error.message);
}

// ── NEGOCIERE DIRECTĂ (buyer propune, seller acceptă/respinge) ────
// Acceptarea mută bani reale, deci trece prin release-funds (validat
// server-side). Propunerea și respingerea sunt doar update-uri de status,
// permise direct de RLS (disputes_update_buyer_offer / _seller_reject).

export async function proposeRefundOffer(
  disputeId: string,
  pct: number,
): Promise<void> {
  const { error } = await supabase
    .from("disputes")
    .update({ buyer_offer_pct: pct, offer_status: "pending" })
    .eq("id", disputeId);

  if (error) throw error;
}

export async function rejectRefundOffer(
  disputeId: string,
  orderId: string,
): Promise<void> {
  const { error } = await supabase
    .from("disputes")
    .update({ offer_status: "rejected", status: "under_review" })
    .eq("id", disputeId);

  if (error) throw error;

  // Non-blocking: notificarea nu trebuie să blocheze respingerea ofertei.
  try {
    await supabase.functions.invoke("push-notification", {
      body: { order_id: orderId, event: "dispute_escalated", recipient: "buyer" },
    });
  } catch {
    // ignorăm — vezi comentariul de mai sus
  }
}

export async function acceptRefundOffer(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("release-funds", {
    body: { order_id: orderId, trigger: "seller_accept_offer" },
  });

  if (error) throw new Error(error.message);
}

// ── DISPUTE CHAT ──────────────────────────────────────────────────

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export async function getDisputeMessages(
  disputeId: string,
): Promise<DisputeMessage[]> {
  const { data, error } = await supabase
    .from("dispute_messages")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendDisputeMessage(
  disputeId: string,
  body: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nu ești autentificat.");

  const { error } = await supabase
    .from("dispute_messages")
    .insert({ dispute_id: disputeId, sender_id: user.id, body });

  if (error) throw error;
}

// ── RETUR ÎNAINTE DE RAMBURSARE ──────────────────────────────────
// Folosit când vânzătorul e vinovat (produs neconform) — cumpărătorul
// trebuie să trimită produsul înapoi înainte de rambursarea completă,
// iar costul AWB-ului e scăzut din soldul vânzătorului, nu din al lui.

export async function requireReturnBeforeRefund(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("release-funds", {
    body: { order_id: orderId, trigger: "admin_require_return" },
  });
  if (error) throw new Error(error.message);
}

export async function submitReturnShipment(
  disputeId: string,
  trackingNumber: string,
  shippingCostMdl: number,
): Promise<void> {
  const { error } = await supabase
    .from("disputes")
    .update({
      return_stage: "shipped",
      return_tracking_number: trackingNumber,
      return_shipping_cost_mdl: shippingCostMdl,
      return_shipped_at: new Date().toISOString(),
    })
    .eq("id", disputeId);
  if (error) throw error;
}

export async function confirmReturnReceived(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("release-funds", {
    body: { order_id: orderId, trigger: "seller_confirm_return" },
  });
  if (error) throw new Error(error.message);
}

export async function adminForceConfirmReturn(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("release-funds", {
    body: { order_id: orderId, trigger: "admin_confirm_return" },
  });
  if (error) throw new Error(error.message);
}

// ── REVIEWS ───────────────────────────────────────────────────────

export async function submitReview(
  payload: CreateReviewPayload,
): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Utilizator neautentificat");

  // Preluăm seller_id din order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("seller_id")
    .eq("id", payload.order_id)
    .single();

  if (orderError) throw orderError;

  const { error } = await supabase.from("seller_reviews").insert({
    order_id: payload.order_id,
    reviewer_id: userId,
    seller_id: order.seller_id,
    rating: payload.rating,
    comment: payload.comment,
  });

  if (error) throw error;
}

export async function getSellerRating(
  sellerId: string,
): Promise<SellerRatingSummary | null> {
  const { data, error } = await supabase
    .from("seller_rating_summary")
    .select("*")
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSellerReviews(
  sellerId: string,
  limit = 20,
): Promise<SellerReview[]> {
  const { data, error } = await supabase
    .from("seller_reviews")
    .select(
      `
      *,
      reviewer:profiles!seller_reviews_reviewer_id_fkey (
        username, avatar_url
      )
    `,
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ── ESCROW TRANSACTIONS ───────────────────────────────────────────

export async function getOrderTransactions(
  orderId: string,
): Promise<EscrowTransaction[]> {
  const { data, error } = await supabase
    .from("escrow_transactions")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ── NOTIFICĂRI IN-APP (banner la login / intrare în aplicație) ───

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  order_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function getUnreadNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: AppNotification) => void,
) {
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Record<string, unknown> }) =>
        onInsert(payload.new as unknown as AppNotification),
    )
    .subscribe();
}

// ── REALTIME SUBSCRIPTIONS ───────────────────────────────────────

/**
 * Subscripție realtime la schimbările de status ale unei comenzi.
 * Folosit în OrderStatusScreen pentru actualizare live.
 */
// Înlocuiește de la linia 359 până la final cu:

export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: Order) => void,
) {
  return supabase
    .channel(`order-${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload: { new: Record<string, unknown> }) =>
        onUpdate(payload.new as unknown as Order),
      //                              ^^^^^^^^
      // Supabase tipează payload.new ca Record<string,unknown>
      // → double cast necesar pentru tipul nostru custom
    )
    .subscribe();
}
