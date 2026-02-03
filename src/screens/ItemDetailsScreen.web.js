// src/screens/ItemDetailsScreen.web.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { deleteItemById, toggleFavorite } from "../services/itemsService";

console.log("✅ ItemDetailsScreen.web.js LOADED");

function normalizeImagesFromItem(item) {
  const raw =
    item?.images ?? item?.image_urls ?? item?.photos ?? item?.pictures ?? [];

  let arr = [];

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
      else if (typeof parsed === "string") arr = [parsed];
    } catch {
      arr = [raw];
    }
  } else {
    arr = [];
  }

  return (arr || [])
    .filter(Boolean)
    .map((u) => String(u).trim())
    .filter((u) => u && !u.startsWith("blob:") && !u.startsWith("blob:http"));
}

export default function ItemDetailsScreenWeb() {
  const route = useRoute();
  const navigation = useNavigation();

  const paramItem = route?.params?.item ?? null;
  const paramItemId =
    route?.params?.itemId ??
    route?.params?.id ??
    route?.params?.item?.id ??
    null;

  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);

  const [loadingItem, setLoadingItem] = useState(false);
  const [item, setItem] = useState(paramItem);

  // Favorites state
  const [favCount, setFavCount] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  // Lightbox
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (paramItem) setItem(paramItem);
  }, [paramItem]);

  // session
  useEffect(() => {
    let sub;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);

      const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
        setSession(sess ?? null);
      });
      sub = listener?.subscription;
    })();

    return () => sub?.unsubscribe?.();
  }, []);

  const userId = session?.user?.id || null;

  // fetch item
  useEffect(() => {
    let mounted = true;

    async function fetchItemById(id) {
      if (!id) return;
      if (item?.id && String(item.id) === String(id)) return;

      setLoadingItem(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (!mounted) return;

      if (error) {
        console.log("❌ ItemDetails fetch error:", error);
        setItem(null);
      } else {
        setItem(data || null);
      }

      setLoadingItem(false);
    }

    if (!paramItem && paramItemId) fetchItemById(paramItemId);

    return () => {
      mounted = false;
    };
  }, [paramItemId, paramItem]); // nu depinde de item

  const images = useMemo(() => normalizeImagesFromItem(item), [item]);

  const ownerId = useMemo(
    () => item?.user_id ?? item?.owner_id ?? item?.userId ?? null,
    [item],
  );

  const isOwner = useMemo(() => {
    return !!userId && !!ownerId && String(ownerId) === String(userId);
  }, [userId, ownerId]);

  const goHome = useCallback(() => {
    navigation.navigate(ROUTES.Home);
  }, [navigation]);

  const confirmWeb = (msg) => window.confirm(msg);
  const alertWeb = (msg) => window.alert(msg);

  // favorites load
  useEffect(() => {
    let mounted = true;

    async function loadFav() {
      if (!item?.id) return;

      try {
        const { count, error: countErr } = await supabase
          .from("favorites")
          .select("id", { count: "exact", head: true })
          .eq("item_id", item.id);

        if (countErr) throw countErr;

        let mine = false;
        if (userId) {
          const { data: mineRows, error: mineErr } = await supabase
            .from("favorites")
            .select("id")
            .eq("item_id", item.id)
            .eq("user_id", userId)
            .limit(1);

          if (mineErr) throw mineErr;
          mine = (mineRows || []).length > 0;
        }

        if (!mounted) return;
        setFavCount(typeof count === "number" ? count : 0);
        setIsFav(Boolean(mine));
      } catch (e) {
        console.log("❌ favorites load error:", e);
        if (!mounted) return;
        setFavCount(0);
        setIsFav(false);
      }
    }

    loadFav();
    return () => {
      mounted = false;
    };
  }, [item?.id, userId]);

  const onToggleFav = useCallback(async () => {
    if (!item?.id) return;

    if (!userId) {
      Platform.OS === "web"
        ? alertWeb("Trebuie să fii logat ca să dai favorite.")
        : Alert.alert("Info", "Trebuie să fii logat ca să dai favorite.");
      return;
    }

    if (favBusy) return;

    setFavBusy(true);

    // optimistic
    const nextIsFav = !isFav;
    setIsFav(nextIsFav);
    setFavCount((c) => {
      const base = Number.isFinite(c) ? c : 0;
      return nextIsFav ? base + 1 : Math.max(0, base - 1);
    });

    try {
      await toggleFavorite({ userId, itemId: item.id, isFav });
    } catch (e) {
      console.log("❌ toggle fav error:", e);

      // rollback
      setIsFav(isFav);
      setFavCount((c) => {
        const base = Number.isFinite(c) ? c : 0;
        return nextIsFav ? Math.max(0, base - 1) : base + 1;
      });

      Platform.OS === "web"
        ? alertWeb(e?.message || "Nu am putut salva favorite.")
        : Alert.alert("Eroare", e?.message || "Nu am putut salva favorite.");
    } finally {
      setFavBusy(false);
    }
  }, [item?.id, userId, isFav, favBusy]);

  // delete
  const onDelete = useCallback(async () => {
    if (!item?.id) {
      const m = "Lipsește id-ul anunțului.";
      Platform.OS === "web" ? alertWeb(m) : Alert.alert("Eroare", m);
      return;
    }

    if (!isOwner) {
      const m = "Doar owner-ul poate șterge anunțul.";
      Platform.OS === "web" ? alertWeb(m) : Alert.alert("Nu ai acces", m);
      return;
    }

    if (Platform.OS === "web") {
      const ok = confirmWeb("Sigur vrei să ștergi anunțul?");
      if (!ok) return;

      try {
        setBusy(true);
        await deleteItemById(item.id);
        alertWeb("Anunțul a fost șters.");
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.Home }],
        });
      } catch (e) {
        console.log("❌ delete error:", e);
        alertWeb(e?.message || "Nu s-a putut șterge anunțul.");
      } finally {
        setBusy(false);
      }
      return;
    }

    Alert.alert("Confirmare", "Sigur vrei să ștergi anunțul?", [
      { text: "Renunță", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await deleteItemById(item.id);
            Alert.alert("Gata", "Anunțul a fost șters.");
            navigation.reset({
              index: 0,
              routes: [{ name: ROUTES.Home }],
            });
          } catch (e) {
            console.log("❌ delete error:", e);
            Alert.alert("Eroare", e?.message || "Nu s-a putut șterge anunțul.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [item?.id, isOwner, navigation]);

  // Lightbox
  const openViewer = useCallback(
    (idx) => {
      if (!images?.length) return;
      const safe = Math.max(0, Math.min(idx, images.length - 1));
      setViewerIndex(safe);
      setViewerOpen(true);
    },
    [images],
  );

  const closeViewer = useCallback(() => setViewerOpen(false), []);
  const prevImg = useCallback(
    () => setViewerIndex((i) => (i <= 0 ? 0 : i - 1)),
    [],
  );
  const nextImg = useCallback(() => {
    setViewerIndex((i) => {
      const max = Math.max(0, images.length - 1);
      return i >= max ? max : i + 1;
    });
  }, [images.length]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e) => {
      if (!viewerOpen) return;
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") prevImg();
      if (e.key === "ArrowRight") nextImg();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, closeViewer, prevImg, nextImg]);

  if (loadingItem) {
    return (
      <View style={styles.center}>
        <Text style={{ fontWeight: "800" }}>Se încarcă anunțul…</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={{ fontWeight: "800" }}>Nu există anunțul.</Text>
        <TouchableOpacity onPress={goHome} style={styles.btn}>
          <Text style={styles.btnText}>Înapoi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mainImage = images[0] || null;
  const sideImages = images.slice(1, 4);

  return (
    <View style={styles.page}>
      {/* Lightbox overlay */}
      {Platform.OS === "web" && viewerOpen ? (
        <Pressable style={styles.viewerOverlay} onPress={closeViewer}>
          <Pressable
            style={styles.viewerCard}
            onPress={(e) => e?.stopPropagation?.()}
          >
            <Pressable onPress={closeViewer} style={styles.viewerClose}>
              <Text style={styles.viewerCloseText}>✕</Text>
            </Pressable>

            <Pressable
              onPress={prevImg}
              style={[styles.viewerNav, styles.viewerNavLeft]}
              disabled={viewerIndex === 0}
            >
              <Text style={styles.viewerNavText}>‹</Text>
            </Pressable>

            <Pressable
              onPress={nextImg}
              style={[styles.viewerNav, styles.viewerNavRight]}
              disabled={viewerIndex === images.length - 1}
            >
              <Text style={styles.viewerNavText}>›</Text>
            </Pressable>

            <Image
              source={{ uri: images[viewerIndex] }}
              style={styles.viewerImg}
              resizeMode="contain"
            />
          </Pressable>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={styles.container80}>
        <View style={styles.mainRow}>
          {/* LEFT: gallery (fără card alb în jur) */}
          <View style={styles.galleryWrap}>
            <View style={styles.galleryGrid}>
              <View style={styles.big}>
                {mainImage ? (
                  <Pressable
                    onPress={() => openViewer(0)}
                    style={styles.bigTap}
                  >
                    <Image source={{ uri: mainImage }} style={styles.bigImg} />
                  </Pressable>
                ) : (
                  <View style={styles.noImg}>
                    <Text style={{ fontWeight: "800", color: "#777" }}>
                      Fără imagine
                    </Text>
                  </View>
                )}

                {/* ❤️ Favorite jos dreapta */}
                <Pressable
                  onPress={onToggleFav}
                  style={({ hovered }) => [
                    styles.favPill,
                    hovered && styles.favPillHover,
                    favBusy && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.favIcon}>{isFav ? "♥" : "♡"}</Text>
                  <Text style={styles.favCount}>{favCount}</Text>
                </Pressable>
              </View>

              <View style={styles.side}>
                {sideImages.map((u, idx) => (
                  <Pressable
                    key={u + idx}
                    style={styles.small}
                    onPress={() => openViewer(idx + 1)}
                  >
                    <Image source={{ uri: u }} style={styles.smallImg} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* RIGHT: info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoTop}>
              <Text style={styles.title}>{item.title || "-"}</Text>
              <Text style={styles.price}>
                {item.price != null ? `${item.price} lei` : "—"}
              </Text>
            </View>

            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Categorie</Text>
                <Text style={styles.metaValue}>{item.category || "-"}</Text>
              </View>

              <View style={styles.metaDivider} />

              <Text style={styles.metaLabel}>Descriere</Text>
              <Text style={styles.metaDesc}>{item.description || "-"}</Text>
            </View>

            {isOwner ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDark]}
                  onPress={() =>
                    navigation.navigate(ROUTES.EditItem, {
                      itemId: item.id,
                      item,
                    })
                  }
                  disabled={busy}
                >
                  <Text style={styles.actionBtnText}>Editează</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={onDelete}
                  disabled={busy}
                >
                  <Text style={styles.actionBtnText}>Șterge</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fb" },

  container80: {
    width: "80%",
    maxWidth: 1240,
    alignSelf: "center",
    paddingTop: 18,
    paddingBottom: 40,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  // Main layout
  mainRow: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
  },

  // LEFT gallery (no white card)
  galleryWrap: {
    flex: 1.7, // ✅ mai mare decât înainte
  },

  galleryGrid: {
    flexDirection: "row",
    gap: 14,
  },

  big: {
    flex: 2,
    height: 460, // ✅ mai mare
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#eee",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },

  bigTap: { flex: 1 },
  bigImg: { width: "100%", height: "100%" },

  side: {
    flex: 1,
    gap: 14,
  },

  small: {
    height: 144, // ✅ mai mare
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  smallImg: { width: "100%", height: "100%" },

  noImg: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Favorite pill
  favPill: {
    position: "absolute",
    right: 12,
    bottom: 12,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  favPillHover: {
    backgroundColor: "#fff",
    borderColor: "rgba(17,17,17,0.22)",
    transform: [{ translateY: -1 }],
  },
  favIcon: { fontSize: 16, fontWeight: "900", color: "#111" },
  favCount: { fontSize: 14, fontWeight: "900", color: "#111" },

  // RIGHT info card
  infoCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },

  infoTop: { marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "900", color: "#111" },
  price: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#0B69FF",
  },

  metaBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    backgroundColor: "#fff",
    padding: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    color: "rgba(17,17,17,0.55)",
    fontSize: 12,
    fontWeight: "900",
  },
  metaValue: { color: "#111", fontSize: 13, fontWeight: "900" },
  metaDivider: {
    height: 1,
    backgroundColor: "rgba(17,17,17,0.08)",
    marginVertical: 10,
  },
  metaDesc: { marginTop: 6, color: "#111", fontSize: 13, fontWeight: "700" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },

  actionBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDark: { backgroundColor: "#111" },
  actionBtnDanger: { backgroundColor: "#7a1f1f" },
  actionBtnText: { color: "#fff", fontWeight: "900" },

  // Lightbox
  viewerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.25)", // ← asta
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  viewerCard: {
    width: "100%",
    maxWidth: 980,
    maxHeight: "80vh",
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  viewerImg: {
    width: "100%",
    height: "80vh",
    maxHeight: "80vh",
  },

  viewerClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  viewerCloseText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  viewerNav: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  viewerNavLeft: { left: 12 },
  viewerNavRight: { right: 12 },
  viewerNavText: { color: "#fff", fontSize: 28, fontWeight: "900" },

  btn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#0B69FF",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },
});
