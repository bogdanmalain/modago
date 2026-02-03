// src/screens/ItemDetailsScreen.js (iOS / Android)
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import {
  deleteItemById,
  fetchFavoritesCounts,
  fetchMyFavoritesMap,
  toggleFavorite,
} from "../services/itemsService";

const BG = "#141823";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function ItemDetailsScreen({ navigation, route }) {
  console.log(
    "✅ ItemDetailsScreen MOBILE LOADED (src/screens/ItemDetailsScreen.js)",
  );

  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = Dimensions.get("window");

  const passedItem = route?.params?.item || null;

  const [session, setSession] = useState(null);

  // item local (pentru UI)
  const [item, setItem] = useState(passedItem);
  useEffect(() => setItem(passedItem), [passedItem]);

  const itemId = useMemo(() => (item?.id ? String(item.id) : null), [item]);
  const userId = session?.user?.id || null;

  const isOwner = useMemo(() => {
    if (!userId || !item?.user_id) return false;
    return String(item.user_id) === String(userId);
  }, [userId, item?.user_id]);

  // favorites
  const [favCount, setFavCount] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // carousel
  const images = useMemo(() => {
    const arr = item?.images || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }, [item?.images]);

  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const loadFavInfo = useCallback(async () => {
    if (!itemId) return;

    try {
      const [counts, mine] = await Promise.all([
        fetchFavoritesCounts([itemId]),
        userId ? fetchMyFavoritesMap(userId, [itemId]) : Promise.resolve({}),
      ]);

      setFavCount((counts && counts[itemId]) || 0);
      setIsFav(!!(mine && mine[itemId]));
    } catch (e) {
      console.log("❌ loadFavInfo error:", e);
    }
  }, [itemId, userId]);

  useEffect(() => {
    loadFavInfo();
  }, [loadFavInfo]);

  const goBackSafe = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate(ROUTES.Home);
  }, [navigation]);

  const onToggleFav = useCallback(async () => {
    if (!userId) {
      navigation.navigate(ROUTES.Login);
      return;
    }
    if (!itemId) return;

    const prev = isFav;
    setFavLoading(true);

    // optimistic
    setIsFav(!prev);
    setFavCount((c) => Math.max(0, c + (prev ? -1 : 1)));

    try {
      await toggleFavorite({ userId, itemId, isFav: prev });
    } catch (e) {
      // rollback
      setIsFav(prev);
      setFavCount((c) => Math.max(0, c + (prev ? 1 : -1)));
      console.log("❌ toggleFavorite error:", e);
    } finally {
      setFavLoading(false);
    }
  }, [userId, itemId, isFav, navigation]);

  const onDelete = useCallback(async () => {
    if (!itemId) return;

    Alert.alert("Șterge anunțul?", "Sigur vrei să-l ștergi?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteItemById(itemId);
            Alert.alert("Șters", "Anunțul a fost șters.");
            goBackSafe();
          } catch (e) {
            Alert.alert("Eroare", e?.message || "Nu pot șterge anunțul.");
          }
        },
      },
    ]);
  }, [itemId, goBackSafe]);

  const onEdit = useCallback(() => {
    if (!item) return;
    navigation.navigate(ROUTES.EditItem, { item });
  }, [navigation, item]);

  const onScroll = useCallback(
    (e) => {
      const x = e?.nativeEvent?.contentOffset?.x || 0;
      const i = Math.round(x / SCREEN_W);
      setActiveIndex(clamp(i, 0, Math.max(0, images.length - 1)));
    },
    [SCREEN_W, images.length],
  );

  const jumpTo = useCallback(
    (idx) => {
      const i = clamp(idx, 0, Math.max(0, images.length - 1));
      setActiveIndex(i);
      scrollRef.current?.scrollTo?.({ x: i * SCREEN_W, y: 0, animated: true });
    },
    [SCREEN_W, images.length],
  );

  // ✅ AICI e “efectul”: deschide viewer fullscreen
  const openViewer = useCallback(
    (startIndex = 0) => {
      if (!images || images.length === 0) return;

      navigation.navigate(ROUTES.ImageViewer, {
        images,
        startIndex: clamp(startIndex, 0, Math.max(0, images.length - 1)),
      });
    },
    [navigation, images],
  );

  if (!item) {
    return (
      <View style={[styles.safe, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.topBar}>
          <Pressable onPress={goBackSafe} style={styles.topBtn} hitSlop={12}>
            <Text style={styles.topBtnText}>←</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <Text style={styles.errTitle}>Nu am primit datele produsului.</Text>
          <Text style={styles.errSub}>
            Întoarce-te înapoi și deschide anunțul din listă.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate(ROUTES.Home)}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryText}>Mergi la Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* zona imagini + butoane overlay */}
      <View style={[styles.mediaWrap, { marginTop: Math.max(insets.top, 10) }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={16}
          style={{ width: SCREEN_W }}
        >
          {images.length > 0 ? (
            images.map((uri, idx) => (
              <Pressable
                key={`${uri}-${idx}`}
                onPress={() => openViewer(idx)}
                style={{ width: SCREEN_W }}
              >
                <Image
                  source={{ uri }}
                  style={styles.heroImg}
                  resizeMode="cover"
                />
              </Pressable>
            ))
          ) : (
            <View style={[styles.heroImg, styles.noImg]}>
              <Text style={{ color: "#cbd5e1", fontWeight: "900" }}>
                Fără imagine
              </Text>
            </View>
          )}
        </ScrollView>

        {/* back */}
        <Pressable
          onPress={goBackSafe}
          style={[styles.fab, { left: 14 }]}
          hitSlop={12}
        >
          <Text style={styles.fabIcon}>←</Text>
        </Pressable>

        {/* fav */}
        <Pressable
          onPress={onToggleFav}
          style={[styles.fab, { right: 14 }]}
          hitSlop={12}
          disabled={favLoading}
        >
          <Text style={[styles.fabIcon, isFav && { color: "#ef4444" }]}>
            {isFav ? "♥" : "♡"}
          </Text>

          <View style={styles.favCountPill}>
            <Text style={styles.favCountText}>{favCount}</Text>
          </View>
        </Pressable>

        {/* dots */}
        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
      </View>

      {/* thumbnails */}
      {images.length > 1 ? (
        <View style={styles.thumbsRow}>
          {images.slice(0, 8).map((uri, idx) => (
            <Pressable
              key={`${uri}-t-${idx}`}
              onPress={() => jumpTo(idx)}
              onLongPress={() => openViewer(idx)}
              style={[
                styles.thumbWrap,
                idx === activeIndex && styles.thumbWrapActive,
              ]}
            >
              <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* butoane owner */}
      {isOwner ? (
        <View style={styles.ownerRow}>
          <TouchableOpacity
            style={[styles.ownerBtn, styles.ownerBtnEdit]}
            onPress={onEdit}
            activeOpacity={0.9}
          >
            <Text style={styles.ownerBtnText}>Editează</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ownerBtn, styles.ownerBtnDel]}
            onPress={onDelete}
            activeOpacity={0.9}
          >
            <Text style={styles.ownerBtnText}>Șterge</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 26 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{item.title || "Produs"}</Text>

        <Text style={styles.price}>
          {typeof item.price === "number" ? item.price : item.price || "-"} lei
        </Text>

        {!!item.category ? (
          <Text style={styles.cat}>Categorie: {item.category}</Text>
        ) : null}

        <Text style={styles.section}>Descriere</Text>
        <Text style={styles.desc}>{item.description || "—"}</Text>

        <View style={{ height: Math.max(insets.bottom, 10) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  mediaWrap: {
    backgroundColor: BG,
  },
  heroImg: {
    width: "100%",
    height: 340,
    backgroundColor: "#0b0f1a",
  },
  noImg: { alignItems: "center", justifyContent: "center" },

  fab: {
    position: "absolute",
    top: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  fabIcon: { fontSize: 22, fontWeight: "900", color: "#111" },

  favCountPill: {
    position: "absolute",
    right: -6,
    bottom: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
  },
  favCountText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  dots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { backgroundColor: "rgba(255,255,255,0.95)" },

  thumbsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.12)",
  },
  thumbWrapActive: { borderColor: "#0B69FF" },
  thumb: { width: "100%", height: "100%" },

  ownerRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  ownerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerBtnEdit: { backgroundColor: "#111827" },
  ownerBtnDel: { backgroundColor: "#b91c1c" },
  ownerBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  title: { fontSize: 40, fontWeight: "900", marginTop: 6, color: "#111" },
  price: { fontSize: 34, fontWeight: "900", color: "#0B69FF", marginTop: 6 },
  cat: { marginTop: 10, color: "#6b7280", fontWeight: "800" },

  section: { marginTop: 22, fontSize: 22, fontWeight: "900", color: "#111" },
  desc: { marginTop: 8, fontSize: 16, lineHeight: 22, color: "#111" },

  topBar: { paddingHorizontal: 14, paddingBottom: 8 },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBtnText: { fontSize: 22, fontWeight: "900", color: "#111" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  errTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
  },
  errSub: {
    marginTop: 8,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "700",
  },
  primaryBtn: {
    marginTop: 14,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#0B69FF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900" },
});
