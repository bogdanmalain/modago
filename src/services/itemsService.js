// src/services/itemsService.js
import { supabase } from "../supabaseClient";

// ✅ Fetch items
export async function fetchItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ✅ Create item
export async function createItem(payload) {
  const p = payload || {};
  const user_id = p.user_id || p.userId || p.owner_id || null;

  const toInsert = { ...p };
  delete toInsert.userId;

  if (user_id) toInsert.user_id = user_id;

  const { data, error } = await supabase
    .from("items")
    .insert([toInsert])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ✅ Update item
export async function updateItem(itemId, payload) {
  if (!itemId) throw new Error("Lipsește itemId pentru update.");

  const { data, error } = await supabase
    .from("items")
    .update(payload)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ✅ Delete item (RLS: doar owner)
export async function deleteItemById(itemId) {
  if (!itemId) throw new Error("Lipsește itemId pentru ștergere.");

  const iid = String(itemId);

  // șterge favorite pe item (ca să nu rămână „mizerie”)
  // (dacă tabela favorites nu există / RLS blochează, aici poate da eroare)
  const { error: favErr } = await supabase
    .from("favorites")
    .delete()
    .eq("item_id", iid);

  // dacă vrei strict, poți ignora favErr. Eu îl las să arunce ca să vezi clar problema.
  if (favErr) throw favErr;

  const { error } = await supabase.from("items").delete().eq("id", iid);
  if (error) throw error;

  return true;
}

// ✅ Alias (ca să nu mai schimbi importuri aiurea prin screen-uri)
export async function deleteItem(itemId) {
  return deleteItemById(itemId);
}

// ✅ Favorites count per item (pentru Home / Details)
export async function fetchFavoritesCounts(itemIds) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) return {};

  const ids = itemIds.map((x) => String(x));

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .in("item_id", ids);

  if (error) throw error;

  const map = {};
  for (const row of data || []) {
    const k = String(row.item_id);
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

// ✅ Map: item_id -> true (favorite-urile mele)
export async function fetchMyFavoritesMap(userId, itemIds) {
  if (!userId || !Array.isArray(itemIds) || itemIds.length === 0) return {};

  const ids = itemIds.map((x) => String(x));

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", userId)
    .in("item_id", ids);

  if (error) throw error;

  const map = {};
  for (const row of data || []) map[String(row.item_id)] = true;
  return map;
}

// ✅ Toggle favorite
export async function toggleFavorite({ userId, itemId, isFav }) {
  if (!userId || !itemId) throw new Error("Lipsește userId sau itemId.");

  const iid = String(itemId);

  if (isFav) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("item_id", iid);

    if (error) throw error;
    return { favored: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert([{ user_id: userId, item_id: iid }]);

  if (error) throw error;
  return { favored: true };
}

// ✅ My items (doar ale mele)
export async function fetchMyItems(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ✅ Favorite items (listează item-urile pe care le-am favoritat)
export async function fetchMyFavoriteItems(userId) {
  if (!userId) return [];

  // 1) ia item_id-urile favorite
  const { data: favs, error: favErr } = await supabase
    .from("favorites")
    .select("item_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favErr) throw favErr;

  const ids = (favs || []).map((x) => String(x.item_id)).filter(Boolean);
  if (ids.length === 0) return [];

  // 2) ia item-urile
  const { data: items, error: itemsErr } = await supabase
    .from("items")
    .select("*")
    .in("id", ids);

  if (itemsErr) throw itemsErr;

  // 3) păstrează ordinea după favorite created_at
  const byId = new Map((items || []).map((it) => [String(it.id), it]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
