// supabase/functions/delete-my-account/index.ts
// Ce este: Edge Function pentru ștergerea completă a contului ModaGo.
// Ce s-a modificat:
// - verifică dacă userul are comenzi active ca buyer sau seller și blochează ștergerea
// - dacă nu există blocaje, șterge favorite, anunțuri, imagini și contul din auth
// - tratează elegant lipsa unor tabele opționale precum orders sau profiles

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const STORAGE_BUCKET = "items";

const BLOCKING_ORDER_STATUSES = [
  "paid",
  "awaiting_shipment",
  "shipped",
  "delivered_pending_confirmation",
  "disputed",
  "refund_pending",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isMissingRelationError(error: unknown) {
  const message = String((error as any)?.message || "").toLowerCase();
  const code = String((error as any)?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("could not find the table") ||
    message.includes("not found")
  );
}

function extractStoragePathFromUrl(url: string, bucket = STORAGE_BUCKET) {
  const value = String(url || "").trim();
  if (!value) return null;

  if (
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.includes("/storage/v1/object/")
  ) {
    return value.split("?")[0] || null;
  }

  try {
    const decoded = decodeURIComponent(value);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/render/image/public/${bucket}/`,
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
    ];

    for (const marker of markers) {
      const idx = decoded.indexOf(marker);
      if (idx >= 0) {
        return decoded.slice(idx + marker.length).split("?")[0] || null;
      }
    }

    const urlObj = new URL(value);
    const pathname = decodeURIComponent(urlObj.pathname);
    const bucketMarker = `/${bucket}/`;
    const idx = pathname.indexOf(bucketMarker);

    if (idx >= 0) {
      return pathname.slice(idx + bucketMarker.length) || null;
    }

    return null;
  } catch {
    return null;
  }
}

function getStoragePathsFromImages(images: unknown[], bucket = STORAGE_BUCKET) {
  const arr = Array.isArray(images) ? images : [];

  const paths = arr
    .map((entry: any) => {
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

async function removeStoragePathsBestEffort(
  admin: ReturnType<typeof createClient>,
  paths: string[],
  bucket = STORAGE_BUCKET,
) {
  const cleanPaths = Array.from(new Set((paths || []).filter(Boolean)));
  if (!cleanPaths.length) return;

  const chunkSize = 100;

  for (let i = 0; i < cleanPaths.length; i += chunkSize) {
    const chunk = cleanPaths.slice(i, i + chunkSize);
    const { error } = await admin.storage.from(bucket).remove(chunk);

    if (error) {
      console.log("⚠️ storage remove warning:", error.message);
    }
  }
}

async function checkBlockingOrders(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  try {
    const [sellerRes, buyerRes] = await Promise.all([
      admin
        .from("orders")
        .select("id,status", { count: "exact", head: false })
        .eq("seller_id", userId)
        .in("status", BLOCKING_ORDER_STATUSES)
        .limit(5),

      admin
        .from("orders")
        .select("id,status", { count: "exact", head: false })
        .eq("buyer_id", userId)
        .in("status", BLOCKING_ORDER_STATUSES)
        .limit(5),
    ]);

    if (sellerRes.error) throw sellerRes.error;
    if (buyerRes.error) throw buyerRes.error;

    const sellerCount = sellerRes.count ?? sellerRes.data?.length ?? 0;
    const buyerCount = buyerRes.count ?? buyerRes.data?.length ?? 0;

    return {
      blocked: sellerCount > 0 || buyerCount > 0,
      sellerCount,
      buyerCount,
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        blocked: false,
        sellerCount: 0,
        buyerCount: 0,
      };
    }

    throw error;
  }
}

async function safeDeleteByEq(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
) {
  try {
    const { error } = await admin.from(table).delete().eq(column, value);
    if (error) throw error;
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}

async function safeDeleteByIn(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  values: Array<string | number>,
) {
  if (!values.length) return;

  try {
    const { error } = await admin.from(table).delete().in(column, values);
    if (error) throw error;
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(
        { error: "Lipsesc variabilele de mediu pentru Supabase." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Lipsește token-ul de autentificare." }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: getUserError,
    } = await userClient.auth.getUser();

    if (getUserError || !user) {
      return json({ error: "Sesiune invalidă sau expirată." }, 401);
    }

    const blocking = await checkBlockingOrders(admin, user.id);

    if (blocking.blocked) {
      return json(
        {
          error:
            "Nu îți poți șterge contul cât timp ai comenzi active, dispute deschise sau rambursări în curs.",
          code: "ACCOUNT_DELETION_BLOCKED_BY_ACTIVE_ORDERS",
          sellerActiveCount: blocking.sellerCount,
          buyerActiveCount: blocking.buyerCount,
        },
        409,
      );
    }

    const { data: ownedItems, error: itemsError } = await admin
      .from("items")
      .select("id, images")
      .eq("user_id", user.id);

    if (itemsError && !isMissingRelationError(itemsError)) {
      throw itemsError;
    }

    const itemRows = Array.isArray(ownedItems) ? ownedItems : [];
    const ownedItemIds = itemRows.map((row: any) => row.id).filter(Boolean);

    const storagePaths = itemRows.flatMap((row: any) =>
      getStoragePathsFromImages(row?.images || [], STORAGE_BUCKET),
    );

    await removeStoragePathsBestEffort(admin, storagePaths, STORAGE_BUCKET);

    await safeDeleteByEq(admin, "favorites", "user_id", user.id);
    await safeDeleteByIn(admin, "favorites", "item_id", ownedItemIds);
    await safeDeleteByEq(admin, "items", "user_id", user.id);
    await safeDeleteByEq(admin, "profiles", "id", user.id);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteUserError) {
      throw deleteUserError;
    }

    return json({
      success: true,
      message: "Contul a fost șters definitiv.",
    });
  } catch (error) {
    console.log("❌ delete-my-account error:", error);

    return json(
      {
        error:
          (error as any)?.message || "A apărut o eroare la ștergerea contului.",
      },
      500,
    );
  }
});
