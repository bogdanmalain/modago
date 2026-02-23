// src/services/favoritesService.js
// Responsabilitate: TOT ce ține de tabelul favorites

import { supabase } from "../supabaseClient";

// ─── Read ────────────────────────────────────────────────────────────────────

// Lista de item_id-uri favorite ale unui user
export async function fetchFavoriteIdsForUser(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => String(r.item_id));
}

// Map { item_id -> true } pentru un set de item-uri — folosit în liste (Home, Search)
export async function fetchFavoritesMapForUser(userId, itemIds) {
  if (!userId || !itemIds?.length) return {};

  const ids = itemIds.map(String);

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", userId)
    .in("item_id", ids);

  if (error) throw error;

  const map = {};
  for (const row of data ?? []) map[String(row.item_id)] = true;
  return map;
}

// Map { item_id -> count } — numărul de favorite per item, pentru carduri
export async function fetchFavoritesCountsForItems(itemIds) {
  if (!itemIds?.length) return {};

  const ids = itemIds.map(String);

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .in("item_id", ids);

  if (error) throw error;

  const map = {};
  for (const row of data ?? []) {
    const k = String(row.item_id);
    map[k] = (map[k] ?? 0) + 1;
  }
  return map;
}

// Item-urile complete favorite ale unui user, în ordinea adăugării
export async function fetchFavoriteItems(userId) {
  if (!userId) return [];

  const { data: favRows, error: favError } = await supabase
    .from("favorites")
    .select("item_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favError) throw favError;

  const ids = (favRows ?? []).map((r) => String(r.item_id));
  if (!ids.length) return [];

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .in("id", ids);

  if (itemsError) throw itemsError;

  const byId = new Map((items ?? []).map((it) => [String(it.id), it]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

// ─── Write ───────────────────────────────────────────────────────────────────

// Adaugă favorite — idempotent, nu crapă pe duplicate
export async function addFavorite(userId, itemId) {
  if (!userId) throw new Error("[favoritesService] userId lipsește.");

  const { error } = await supabase
    .from("favorites")
    .upsert(
      { user_id: userId, item_id: String(itemId) },
      { onConflict: "user_id,item_id", ignoreDuplicates: true },
    );

  if (error) throw error;
  return true;
}

// Elimină favorite
export async function removeFavorite(userId, itemId) {
  if (!userId) throw new Error("[favoritesService] userId lipsește.");

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", String(itemId));

  if (error) throw error;
  return true;
}

// Toggle: primește starea curentă, returnează starea nouă { favored: boolean }
export async function toggleFavorite({ userId, itemId, isFav }) {
  if (!userId || !itemId)
    throw new Error("[favoritesService] userId sau itemId lipsește.");

  if (isFav) {
    await removeFavorite(userId, itemId);
    return { favored: false };
  }

  await addFavorite(userId, itemId);
  return { favored: true };
}

// Curăță toate favoritele unui item — apelat înainte de deleteItem dacă nu ai CASCADE
export async function removeFavoritesByItem(itemId) {
  if (!itemId) return;

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("item_id", String(itemId));

  if (error) throw error;
}
