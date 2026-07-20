// src/services/itemsService.js
// COMPONENTĂ: itemsService
// ROL:
// - CRUD pe tabelul items
//
// MODIFICĂRI:
// - adăugate helpers centralizate pentru path-urile din Supabase Storage
// - adăugată ștergere reală și strictă a imaginilor din bucket-ul "items"
// - adăugată funcție deleteItemWithImages() care oprește flow-ul dacă storage remove eșuează
// - fetchItems/fetchMoreFromSeller/fetchSimilarItems păstrează logica pentru Vacation Mode
// - restul logicii existente rămâne neschimbată

import { supabase } from "../supabaseClient";
import { removeFavoritesByItem } from "./favoritesService";

const STORAGE_BUCKET = "items";

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

export function extractStoragePathFromUrl(url, bucket = STORAGE_BUCKET) {
  const value = String(url || "").trim();
  if (!value) return null;

  if (
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.includes("/storage/v1/object/")
  ) {
    return value;
  }

  try {
    const u = new URL(value);
    const pathname = decodeURIComponent(u.pathname);

    const publicMarker = `/storage/v1/object/public/${bucket}/`;
    const signMarker = `/storage/v1/object/sign/${bucket}/`;
    const renderMarker = `/storage/v1/object/render/image/public/${bucket}/`;

    if (pathname.includes(publicMarker)) {
      return pathname.split(publicMarker)[1] || null;
    }

    if (pathname.includes(signMarker)) {
      return pathname.split(signMarker)[1] || null;
    }

    if (pathname.includes(renderMarker)) {
      return pathname.split(renderMarker)[1] || null;
    }

    const idx = pathname.indexOf(`/${bucket}/`);
    if (idx >= 0) {
      return pathname.slice(idx + bucket.length + 2) || null;
    }

    return null;
  } catch {
    return null;
  }
}

export function getStoragePathsFromImages(images, bucket = STORAGE_BUCKET) {
  const arr = Array.isArray(images) ? images : [];

  const paths = arr
    .map((entry) => {
      if (typeof entry === "string") {
        return extractStoragePathFromUrl(entry, bucket);
      }
      if (entry?.url) return extractStoragePathFromUrl(entry.url, bucket);
      if (entry?.uri) return extractStoragePathFromUrl(entry.uri, bucket);
      return null;
    })
    .filter(Boolean);

  return Array.from(new Set(paths));
}

export async function removeItemImagesFromStorage(
  images,
  bucket = STORAGE_BUCKET,
) {
  const paths = getStoragePathsFromImages(images, bucket);

  if (!paths.length) return true;

  console.log("🧹 removing storage paths:", paths);

  const { data, error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    console.log("❌ storage remove error:", error);
    throw error;
  }

  console.log("✅ storage remove result:", data);
  return true;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function fetchItems() {
  const { currentUserId, vacationModeEnabled } = await getVacationContext();

  let query = supabase
    .from("items")
    .select("*")
    .eq("status", "active")
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
    .eq("status", "active")
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
    .eq("status", "active")
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

  await removeFavoritesByItem(itemId);

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", String(itemId));

  if (error) throw error;
  return true;
}

export async function deleteItemWithImages(item, bucket = STORAGE_BUCKET) {
  if (!item?.id) {
    throw new Error("[itemsService] deleteItemWithImages: item.id lipsește.");
  }

  await removeFavoritesByItem(item.id);
  await removeItemImagesFromStorage(item.images || [], bucket);

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", String(item.id));

  if (error) throw error;
  return true;
}

// Alias pentru compatibilitate cu cod existent
export const deleteItemById = deleteItem;
