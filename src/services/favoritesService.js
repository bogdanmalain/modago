// src/services/favoritesService.js
import { supabase } from "../supabaseClient";

export async function fetchFavoriteIdsForUser(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((r) => String(r.item_id));
}

export async function addFavorite(userId, itemId) {
  if (!userId) throw new Error("User not logged in.");
  const payload = { user_id: userId, item_id: String(itemId) };

  const { error } = await supabase.from("favorites").upsert(payload, {
    onConflict: "user_id,item_id",
  });

  if (error) throw error;
  return true;
}

export async function removeFavorite(userId, itemId) {
  if (!userId) throw new Error("User not logged in.");
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", String(itemId));

  if (error) throw error;
  return true;
}

export async function toggleFavorite(userId, itemId, shouldFav) {
  if (shouldFav) return addFavorite(userId, itemId);
  return removeFavorite(userId, itemId);
}
