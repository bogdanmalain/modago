// src/services/accountDeletionService.js
// Ce este: service client pentru ștergerea contului prin Edge Function.
// Ce s-a modificat:
// - expune deleteMyAccount pentru apel din UI
// - normalizează mesajele de eroare venite din backend

import { supabase } from "../supabaseClient";

export async function deleteMyAccount() {
  const { data, error } = await supabase.functions.invoke("delete-my-account", {
    body: {},
  });

  if (error) {
    const message =
      error?.context?.error || error?.message || "Nu am putut șterge contul.";
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
