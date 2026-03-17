// src/services/itemsService.js
// COMPONENTĂ: itemsService
// ROL:
// - CRUD pe tabelul items
//
// MODIFICĂRI:
// - adăugate funcții helper pentru Vacation Mode
// - fetchItems ascunde anunțurile userului logat când vacation_mode_enabled este activ
// - fetchMoreFromSeller nu mai returnează anunțurile userului logat când Vacation Mode este activ
// - fetchSimilarItems exclude anunțurile userului logat când Vacation Mode este activ
// - restul logicii existente rămâne neschimbată

import { supabase } from "../supabaseClient";
import { removeFavoritesByItem } from "./favoritesService";

async function getVacationContext() {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user ?? null;

    return {
      currentUserId: user?.id ? String(user.id) : null,
      vacationModeEnabled: Boolean(user?.user_metadata?.vacation_mode_enabled),
    };
  } catch (e) {
    console.log("⚠️ getVacationContext warning:", e);
    return {
      currentUserId: null,
      vacationModeEnabled: false,
    };
  }
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function fetchItems() {
  const { currentUserId, vacationModeEnabled } = await getVacationContext();

  let query = supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (vacationModeEnabled && currentUserId) {
    query = query.neq("user_id", currentUserId);
  }

  const { data, error } = await query;

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

  const { currentUserId, vacationModeEnabled } = await getVacationContext();
  const sellerId = String(userId);

  if (
    vacationModeEnabled &&
    currentUserId &&
    String(currentUserId) === sellerId
  ) {
    return [];
  }

  let query = supabase
    .from("items")
    .select("*")
    .eq("user_id", sellerId)
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

  const { currentUserId, vacationModeEnabled } = await getVacationContext();

  let query = supabase
    .from("items")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (excludeItemId != null) {
    query = query.neq("id", String(excludeItemId));
  }

  if (vacationModeEnabled && currentUserId) {
    query = query.neq("user_id", currentUserId);
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
  if (!itemId) {
    throw new Error("[itemsService] itemId lipsește pentru ștergere.");
  }

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