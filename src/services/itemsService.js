// src/services/itemsService.js
// COMPONENTĂ: itemsService
// ROL:
// - CRUD pe tabelul items
// MODIFICARE:
// - adăugate funcții pentru recomandări în ItemDetails:
//   • fetchMoreFromSeller
//   • fetchSimilarItems
// - restul logicii existente rămâne neschimbată

import { supabase } from "../supabaseClient";
import { removeFavoritesByItem } from "./favoritesService";

// ─── Read ────────────────────────────────────────────────────────────────────

export async function fetchItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMyItems(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchItemById(itemId) {
  if (!itemId) throw new Error("[itemsService] itemId lipsește.");

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", String(itemId))
    .single();

  if (error) throw error;
  return data;
}

// ─── Recommenders pentru ItemDetails ────────────────────────────────────────

export async function fetchMoreFromSeller({
  userId,
  excludeItemId,
  limit = 6,
}) {
  if (!userId) return [];

  let query = supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (excludeItemId != null) {
    query = query.neq("id", String(excludeItemId));
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).slice(0, limit);
}

export async function fetchSimilarItems({
  category,
  excludeItemId,
  limit = 6,
}) {
  if (!category) return [];

  let query = supabase
    .from("items")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (excludeItemId != null) {
    query = query.neq("id", String(excludeItemId));
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).slice(0, limit);
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function createItem(payload) {
  if (!payload?.user_id) {
    throw new Error(
      "[itemsService] createItem: payload.user_id este obligatoriu.",
    );
  }

  const { data, error } = await supabase
    .from("items")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateItem(itemId, payload) {
  if (!itemId) throw new Error("[itemsService] itemId lipsește pentru update.");

  const { data, error } = await supabase
    .from("items")
    .update(payload)
    .eq("id", String(itemId))
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteItem(itemId) {
  if (!itemId)
    throw new Error("[itemsService] itemId lipsește pentru ștergere.");

  // Curățăm favorites înainte (nu avem CASCADE pe FK pentru că item_id e text)
  await removeFavoritesByItem(itemId);

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", String(itemId));

  if (error) throw error;
  return true;
}

// Alias pentru compatibilitate cu cod existent
export const deleteItemById = deleteItem;
