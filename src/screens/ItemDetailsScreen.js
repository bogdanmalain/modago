// src/screens/ItemDetailsScreen.js
// ============================================
// MODIFICARE:
// - FIX: după delete, Home se actualizează imediat (fără logout/login)
//   -> trimitem { deletedItemId, deletedAt } către Home și apoi revenim înapoi
// NU se modifică:
// - Favorite rămâne sus lângă thumbnails (stil ca Home)
// - Sync favorites la focus + după toggle
// - Reset galerie la focus (pornește de la prima poză)
// ============================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
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
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import {
  deleteItemById,
  fetchFavoritesCounts,
  fetchMyFavoritesMap,
  toggleFavorite,
} from "../services/itemsService";
import { ThemeContext } from "../theme/ThemeProvider";

const FAV_ICON = 44;
const BADGE_MIN = 22;

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pickById(map, id) {
  if (!map) return undefined;
  const sid = String(id ?? "");
  const nid = Number(id);
  if (sid && Object.prototype.hasOwnProperty.call(map, sid)) return map[sid];
  if (!Number.isNaN(nid) && Object.prototype.hasOwnProperty.call(map, nid))
    return map[nid];
  return map[id];
}

export default function ItemDetailsScreen({ navigation, route }) {
  const { tokens } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
  const HERO_H = useMemo(() => Math.round(SCREEN_H * 0.6), [SCREEN_H]);

  const S = useMemo(() => makeStyles(tokens, HERO_H), [tokens, HERO_H]);

  const passedItem = route?.params?.item || null;

  const [session, setSession] = useState(null);
  const [item, setItem] = useState(passedItem);

  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const heroPressRef = useRef(null);

  // pulse subtle
  const pulse = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      const fresh = route?.params?.item || null;
      setItem(fresh);

      // reset galerie la focus
      setActiveIndex(0);
      try {
        scrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
      } catch {}
    }, [route?.params?.item]),
  );

  useEffect(() => setItem(passedItem), [passedItem]);

  const itemId = useMemo(() => (item?.id ? String(item.id) : null), [item]);
  const userId = session?.user?.id || null;

  const isOwner = useMemo(() => {
    if (!userId || !item?.user_id) return false;
    return String(item.user_id) === String(userId);
  }, [userId, item?.user_id]);

  const [favCount, setFavCount] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const countText = useMemo(() => {
    const n = Number(favCount || 0);
    return n > 99 ? "99+" : String(n);
  }, [favCount]);

  const dynamicBadgeWidth = useMemo(() => {
    if (countText.length === 1) return BADGE_MIN;
    if (countText.length === 2) return BADGE_MIN + 6;
    return BADGE_MIN + 12;
  }, [countText]);

  const images = useMemo(() => {
    const arr = item?.images || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }, [item?.images]);

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

      const cntRaw = pickById(counts, itemId);
      const mineHit = pickById(mine, itemId);

      setFavCount(Number(cntRaw ?? 0));
      setIsFav(Boolean(mineHit));
    } catch (e) {
      console.log("❌ loadFavInfo error:", e);
    }
  }, [itemId, userId]);

  useEffect(() => {
    loadFavInfo();
  }, [loadFavInfo]);

  useFocusEffect(
    useCallback(() => {
      loadFavInfo();
    }, [loadFavInfo]),
  );

  const goBackSafe = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate(ROUTES.Home);
  }, [navigation]);

  const runPulse = useCallback(() => {
    pulse.setValue(1);
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.08,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulse]);

  const onToggleFav = useCallback(async () => {
    if (!userId) {
      navigation.navigate(ROUTES.Login);
      return;
    }
    if (!itemId) return;

    const prev = isFav;
    setFavLoading(true);

    const next = !prev;
    setIsFav(next);
    setFavCount((c) => Math.max(0, c + (prev ? -1 : 1)));

    if (next) runPulse();

    try {
      await toggleFavorite({ userId, itemId, isFav: prev });
      await loadFavInfo();
    } catch (e) {
      setIsFav(prev);
      setFavCount((c) => Math.max(0, c + (prev ? 1 : -1)));
      console.log("❌ toggleFavorite error:", e);
    } finally {
      setFavLoading(false);
    }
  }, [userId, itemId, isFav, navigation, loadFavInfo, runPulse]);

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

            // ✅ trimite către Home (update local) + apoi back
            Alert.alert("Șters", "Anunțul a fost șters.", [
              {
                text: "OK",
                onPress: () => {
                  navigation.navigate(ROUTES.Home, {
                    deletedItemId: String(itemId),
                    deletedAt: Date.now(),
                  });

                  if (navigation?.canGoBack?.()) navigation.goBack();
                  else navigation.navigate(ROUTES.Home);
                },
              },
            ]);
          } catch (e) {
            Alert.alert("Eroare", e?.message || "Nu pot șterge anunțul.");
          }
        },
      },
    ]);
  }, [itemId, navigation]);

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

  const openViewer = useCallback(
    (start = 0) => {
      if (!images || images.length === 0) return;

      const startIndex = clamp(start, 0, Math.max(0, images.length - 1));
      const originUri = images[startIndex];

      const node = heroPressRef.current;
      if (!node?.measureInWindow) {
        navigation.navigate(ROUTES.ImageViewer, {
          images,
          startIndex,
          originUri,
        });
        return;
      }

      node.measureInWindow((x, y, w, h) => {
        const origin =
          Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0
            ? { x, y, width: w, height: h }
            : null;

        navigation.navigate(ROUTES.ImageViewer, {
          images,
          startIndex,
          origin,
          originUri,
        });
      });
    },
    [navigation, images],
  );

  if (!item) {
    return (
      <View style={[S.safe, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={S.topBar}>
          <Pressable onPress={goBackSafe} style={S.topBtn} hitSlop={12}>
            <Text style={S.topBtnText}>←</Text>
          </Pressable>
        </View>

        <View style={S.center}>
          <Text style={S.errTitle}>Nu am primit datele produsului.</Text>
          <Text style={S.errSub}>
            Întoarce-te înapoi și deschide anunțul din listă.
          </Text>

          <TouchableOpacity
            style={S.primaryBtn}
            onPress={() => navigation.navigate(ROUTES.Home)}
            activeOpacity={0.9}
          >
            <Text style={S.primaryText}>Mergi la Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fabTop = Math.max(insets.top, 10);

  return (
    <View style={S.safe}>
      {/* HERO */}
      <View style={S.mediaWrap}>
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
                ref={idx === activeIndex ? heroPressRef : null}
                key={`${uri}-${idx}`}
                onPress={() => openViewer(idx)}
                style={{ width: SCREEN_W }}
              >
                <Image source={{ uri }} style={S.heroImg} resizeMode="cover" />
              </Pressable>
            ))
          ) : (
            <View style={[S.heroImg, S.noImg]}>
              <Text style={S.noImgText}>Fără imagine</Text>
            </View>
          )}
        </ScrollView>

        {/* Back pe imagine */}
        <Pressable
          onPress={goBackSafe}
          style={[S.fab, { left: 14, top: fabTop }]}
          hitSlop={12}
        >
          <Text style={S.fabIcon}>←</Text>
        </Pressable>

        {images.length > 1 ? (
          <View style={S.dots}>
            {images.map((_, i) => (
              <View key={i} style={[S.dot, i === activeIndex && S.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>

      {/* BAR: thumbnails + favorite */}
      <View style={S.thumbsBar}>
        <View style={[S.thumbsRow, images.length <= 1 && { opacity: 0 }]}>
          {images.length > 1
            ? images.slice(0, 8).map((uri, idx) => (
                <Pressable
                  key={`${uri}-t-${idx}`}
                  onPress={() => jumpTo(idx)}
                  onLongPress={() => openViewer(idx)}
                  style={[
                    S.thumbWrap,
                    idx === activeIndex && S.thumbWrapActive,
                  ]}
                >
                  <Image source={{ uri }} style={S.thumb} resizeMode="cover" />
                </Pressable>
              ))
            : null}
        </View>

        <View style={{ position: "relative" }}>
          <Pressable onPress={onToggleFav} disabled={favLoading} hitSlop={8}>
            <Animated.View
              style={[
                S.favCircle,
                isFav ? S.favCircleActive : S.favCircleIdle,
                { transform: [{ scale: pulse }] },
              ]}
            >
              {!isFav ? (
                <Text style={S.heartGhost}>♡</Text>
              ) : (
                <Text style={S.heartSolid}>❤</Text>
              )}
            </Animated.View>
          </Pressable>

          {favCount > 0 ? (
            <View style={[S.countPill, { minWidth: dynamicBadgeWidth }]}>
              <Text style={S.countText}>{countText}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {isOwner ? (
        <View style={S.ownerRow}>
          <TouchableOpacity
            style={[S.ownerBtn, S.ownerBtnEdit]}
            onPress={onEdit}
            activeOpacity={0.9}
          >
            <Text style={S.ownerBtnText}>Editează</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.ownerBtn, S.ownerBtnDel]}
            onPress={onDelete}
            activeOpacity={0.9}
          >
            <Text style={S.ownerBtnText}>Șterge</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 26 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={S.title}>{item.title || "Produs"}</Text>

        <Text style={S.price}>
          {typeof item.price === "number" ? item.price : item.price || "-"} lei
        </Text>

        {!!item.category ? (
          <Text style={S.cat}>Categorie: {item.category}</Text>
        ) : null}

        <Text style={S.section}>Descriere</Text>
        <Text style={S.desc}>{item.description || "—"}</Text>

        <View style={{ height: Math.max(insets.bottom, 10) }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(tokens, HERO_H) {
  const bg = pickTok(tokens, "bg", "#0B1220");
  const card = pickTok(tokens, "card", "#0B1620");
  const text = pickTok(tokens, "text", "#EAF2F7");
  const muted = pickTok(
    tokens,
    "muted",
    pickTok(tokens, "subtext", "rgba(255,255,255,0.60)"),
  );
  const border = pickTok(tokens, "border", "rgba(255,255,255,0.08)");
  const primary = pickTok(tokens, "primary", "#2CA6A4");
  const danger = pickTok(tokens, "danger", "#EF4444");
  const shadowColor = pickTok(tokens, "shadowColor", "#000");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");

  const mediaBg = pickTok(tokens, "mediaBg", "rgba(0,0,0,0.35)");
  const fabBg = pickTok(tokens, "fabBg", "rgba(255,255,255,0.92)");

  const favIdleBg = pickTok(tokens, "favIdleBg", "rgba(255,255,255,0.06)");
  const favIdleBorder = pickTok(
    tokens,
    "favIdleBorder",
    "rgba(255,255,255,0.14)",
  );
  const favGhost = pickTok(tokens, "favGhost", "rgba(255,255,255,0.75)");

  const favActiveBg = pickTok(tokens, "favActiveBg", "rgba(255,255,255,0.95)");
  const favActiveBorder = pickTok(
    tokens,
    "favActiveBorder",
    "rgba(255,255,255,0.35)",
  );

  const badgeBorder = pickTok(tokens, "badgeBorder", "rgba(255,255,255,0.95)");

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },

    mediaWrap: { backgroundColor: mediaBg },
    heroImg: { width: "100%", height: HERO_H, backgroundColor: mediaBg },
    noImg: { alignItems: "center", justifyContent: "center" },
    noImgText: { color: onPrimary, fontWeight: "900" },

    fab: {
      position: "absolute",
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: fabBg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
      shadowColor,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    fabIcon: { fontSize: 22, fontWeight: "900", color: "#111" },

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

    thumbsBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: bg,
    },
    thumbsRow: { flex: 1, flexDirection: "row", gap: 10 },

    thumbWrap: {
      width: 56,
      height: 56,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: border,
      backgroundColor: card,
    },
    thumbWrapActive: { borderColor: primary },
    thumb: { width: "100%", height: "100%" },

    favCircle: {
      width: FAV_ICON,
      height: FAV_ICON,
      borderRadius: FAV_ICON / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    favCircleIdle: {
      backgroundColor: favIdleBg,
      borderWidth: 1,
      borderColor: favIdleBorder,
    },
    favCircleActive: {
      backgroundColor: favActiveBg,
      borderWidth: 2,
      borderColor: favActiveBorder,
    },
    heartGhost: { fontSize: 18, color: favGhost, fontWeight: "900" },
    heartSolid: { fontSize: 18, color: danger, fontWeight: "900" },

    countPill: {
      position: "absolute",
      right: -6,
      bottom: -6,
      height: BADGE_MIN,
      paddingHorizontal: 6,
      borderRadius: 999,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: badgeBorder,
      zIndex: 10,
    },
    countText: { color: "#fff", fontSize: 12, fontWeight: "900" },

    ownerRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 8,
      backgroundColor: bg,
    },
    ownerBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    ownerBtnEdit: { backgroundColor: primary },
    ownerBtnDel: { backgroundColor: danger },
    ownerBtnText: { color: onPrimary, fontWeight: "900", fontSize: 16 },

    title: { fontSize: 40, fontWeight: "900", marginTop: 6, color: text },
    price: { fontSize: 34, fontWeight: "900", color: primary, marginTop: 6 },
    cat: { marginTop: 10, color: muted, fontWeight: "800" },

    section: { marginTop: 22, fontSize: 22, fontWeight: "900", color: text },
    desc: { marginTop: 8, fontSize: 16, lineHeight: 22, color: text },

    topBar: { paddingHorizontal: 14, paddingBottom: 8 },
    topBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: fabBg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
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
      color: text,
      textAlign: "center",
    },
    errSub: {
      marginTop: 8,
      color: muted,
      textAlign: "center",
      fontWeight: "700",
    },
    primaryBtn: {
      marginTop: 14,
      height: 44,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: onPrimary, fontWeight: "900" },
  });
}
