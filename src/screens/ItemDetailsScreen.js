// src/screens/ItemDetailsScreen.js
// COMPONENTĂ: ItemDetailsScreen
// MODIFICARE:
// - scos complet caruselul de thumbnails de sub imagine
// - păstrat swipe pe hero
// - păstrate dots pe imagine
// - favorite mutat direct peste hero, în dreapta jos
// - scos complet favBar de sub imagine
// - dots mutate puțin mai la stânga/jos ca să nu se bată cu inima
// - scos ownerRow (Editare / Ștergere) din ItemDetailsScreen
// - FIX: dacă anunțul a fost deschis din MyItems, back revine explicit în MyItems
// - restul logicii rămâne neschimbată

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
  Dimensions,
  Animated,
  Share,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import {
  fetchMoreFromSeller,
  fetchSimilarItems,
} from "../services/itemsService";
import {
  fetchFavoritesCountsForItems,
  fetchFavoritesMapForUser,
  toggleFavorite,
} from "../services/favoritesService";
import { ThemeContext } from "../theme/ThemeProvider";
import HeaderBackButton from "../components/HeaderBackButton";

const FAV_ICON = 44;
const BADGE_MIN = 22;
const GLASS_H = 52;
const RELATED_CARD_W = 156;
const RELATED_IMG_H = 176;
const HEADER_FADE_DISTANCE = 90;

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
  if (!Number.isNaN(nid) && Object.prototype.hasOwnProperty.call(map, nid)) {
    return map[nid];
  }
  return map[id];
}

function buildSharePayload(item) {
  const title = item?.title || "Produs";
  const category = item?.category ? `Categorie: ${item.category}` : "";
  const price =
    typeof item?.price === "number"
      ? `${item.price} lei`
      : item?.price
        ? `${item.price} lei`
        : "";
  const description = String(item?.description || "").trim();

  const dbShareUrl =
    typeof item?.share_url === "string" ? item.share_url.trim() : "";

  const computedShareUrl = "";
  const shareUrl = dbShareUrl || computedShareUrl;

  const lines = [title, category, price, description, shareUrl].filter(Boolean);

  return {
    title,
    message: lines.join("\n"),
    url: shareUrl || undefined,
  };
}

export default function ItemDetailsScreen({ navigation, route }) {
  const { tokens } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
  const HERO_H = useMemo(() => Math.round(SCREEN_H * 0.6), [SCREEN_H]);

  const scrollY = useRef(new Animated.Value(0)).current;

  const S = useMemo(
    () => makeStyles(tokens, HERO_H, insets),
    [tokens, HERO_H, insets],
  );

  const passedItem = route?.params?.item || null;
  const fromMyItems = route?.params?.fromMyItems === true;

  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [item, setItem] = useState(passedItem);
  const [menuVisible, setMenuVisible] = useState(false);

  const pendingSharePayloadRef = useRef(null);

  const heroScrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const heroPressRef = useRef(null);

  const pulse = useRef(new Animated.Value(1)).current;

  const [moreFromSeller, setMoreFromSeller] = useState([]);
  const [similarItems, setSimilarItems] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fresh = route?.params?.item || null;
      setItem(fresh);
      setActiveIndex(0);
      setMenuVisible(false);
      pendingSharePayloadRef.current = null;
      scrollY.setValue(0);
      try {
        heroScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
      } catch {}
    }, [route?.params?.item, scrollY]),
  );

  useEffect(() => {
    setItem(passedItem);
  }, [passedItem]);

  const itemId = useMemo(() => (item?.id ? String(item.id) : null), [item]);
  const userId = session?.user?.id || null;

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
      setSessionReady(true);

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
        fetchFavoritesCountsForItems([itemId]),
        userId
          ? fetchFavoritesMapForUser(userId, [itemId])
          : Promise.resolve({}),
      ]);

      const cntRaw = pickById(counts, itemId);
      const mineHit = pickById(mine, itemId);

      setFavCount(Number(cntRaw ?? 0));
      setIsFav(Boolean(mineHit));
    } catch (e) {
      console.log("❌ loadFavInfo error:", e);
    }
  }, [itemId, userId]);

  const loadRelated = useCallback(async () => {
    if (!item?.id) {
      setMoreFromSeller([]);
      setSimilarItems([]);
      return;
    }

    setRelatedLoading(true);
    try {
      const [sellerItems, similar] = await Promise.all([
        fetchMoreFromSeller({
          userId: item?.user_id,
          excludeItemId: item?.id,
          limit: 6,
        }),
        fetchSimilarItems({
          category: item?.category,
          excludeItemId: item?.id,
          limit: 6,
        }),
      ]);

      setMoreFromSeller(Array.isArray(sellerItems) ? sellerItems : []);
      setSimilarItems(Array.isArray(similar) ? similar : []);
    } catch (e) {
      console.log("❌ loadRelated error:", e);
      setMoreFromSeller([]);
      setSimilarItems([]);
    } finally {
      setRelatedLoading(false);
    }
  }, [item]);

  useEffect(() => {
    if (!sessionReady) return;
    loadFavInfo();
  }, [loadFavInfo, sessionReady]);

  useEffect(() => {
    loadRelated();
  }, [loadRelated]);

  useFocusEffect(
    useCallback(() => {
      if (!sessionReady) return;
      loadFavInfo();
      loadRelated();
    }, [loadFavInfo, loadRelated, sessionReady]),
  );

  const goBackSafe = useCallback(() => {
    if (fromMyItems) {
      navigation.navigate(ROUTES.MyItems || "MyItems");
      return;
    }

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(ROUTES.Home || "Home");
  }, [fromMyItems, navigation]);

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

  const onHeroScroll = useCallback(
    (e) => {
      const x = e?.nativeEvent?.contentOffset?.x || 0;
      const i = Math.round(x / SCREEN_W);
      setActiveIndex(clamp(i, 0, Math.max(0, images.length - 1)));
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
          fromMyItems,
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
          fromMyItems,
        });
      });
    },
    [navigation, images, fromMyItems],
  );

  const openItem = useCallback(
    (nextItem) => {
      if (!nextItem) return;
      navigation.navigate(ROUTES.ItemDetails, {
        item: nextItem,
        fromMyItems,
      });
    },
    [navigation, fromMyItems],
  );

  const runPendingShare = useCallback(async () => {
    const payload = pendingSharePayloadRef.current;
    if (!payload) return;

    pendingSharePayloadRef.current = null;

    try {
      await Share.share({
        title: payload.title,
        message: payload.message,
        url: payload.url,
      });
    } catch (e) {
      console.log("❌ share error:", e);
    }
  }, []);

  const onShareItem = useCallback(() => {
    if (!item) return;

    pendingSharePayloadRef.current = buildSharePayload(item);
    setMenuVisible(false);
  }, [item]);

  const onOpenMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const renderRelatedCard = useCallback(
    (relatedItem) => {
      const img = Array.isArray(relatedItem?.images)
        ? relatedItem.images[0]
        : null;

      return (
        <TouchableOpacity
          key={String(relatedItem?.id)}
          activeOpacity={0.9}
          style={S.relatedCard}
          onPress={() => openItem(relatedItem)}
        >
          <View style={S.relatedImgBox}>
            {img ? (
              <Image
                source={{ uri: img }}
                style={S.relatedImg}
                resizeMode="cover"
              />
            ) : (
              <View style={S.relatedNoImg}>
                <Text style={S.relatedNoImgText}>Fără imagine</Text>
              </View>
            )}
          </View>

          <View style={S.relatedBody}>
            <Text numberOfLines={1} style={S.relatedTitle}>
              {relatedItem?.title || "-"}
            </Text>
            <Text style={S.relatedPrice}>
              {typeof relatedItem?.price === "number"
                ? relatedItem.price
                : relatedItem?.price || "-"}{" "}
              lei
            </Text>
            {!!relatedItem?.category ? (
              <Text numberOfLines={1} style={S.relatedMeta}>
                {relatedItem.category}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [S, openItem],
  );

  const stickyBgOpacity = scrollY.interpolate({
    inputRange: [0, 24, HEADER_FADE_DISTANCE],
    outputRange: [0, 0.2, 1],
    extrapolate: "clamp",
  });

  const stickyBorderOpacity = scrollY.interpolate({
    inputRange: [0, 35, HEADER_FADE_DISTANCE],
    outputRange: [0, 0.15, 1],
    extrapolate: "clamp",
  });

  const stickyShadowOpacity = scrollY.interpolate({
    inputRange: [0, 30, HEADER_FADE_DISTANCE],
    outputRange: [0, 0.08, 0.18],
    extrapolate: "clamp",
  });

  if (!item) {
    return (
      <View style={[S.safe, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={S.topBar}>
          <HeaderBackButton
            onPress={goBackSafe}
            absolute={false}
            size={44}
            style={S.inlineBackBtn}
          />
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

  const headerTop = Math.max(insets.top, 10) + 6;

  return (
    <View style={S.safe}>
      <Animated.View
        style={[
          S.stickyHeaderBg,
          {
            opacity: stickyBgOpacity,
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          S.stickyHeaderBorder,
          {
            opacity: stickyBorderOpacity,
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          S.stickyHeaderShadow,
          {
            opacity: stickyShadowOpacity,
          },
        ]}
        pointerEvents="none"
      />

      <View
        style={[S.stickyHeaderRow, { top: headerTop }]}
        pointerEvents="box-none"
      >
        <HeaderBackButton
          onPress={goBackSafe}
          absolute={false}
          size={GLASS_H}
          style={S.headerBackBtn}
        />

        <View style={{ flex: 1 }} />

        <HeaderBackButton
          onPress={onOpenMenu}
          absolute={false}
          size={GLASS_H}
          style={S.headerDotsBtn}
          iconStyle={S.dotsIconFix}
        >
          <Text style={S.glassDots}>•••</Text>
        </HeaderBackButton>
      </View>

      <Animated.ScrollView
        style={S.verticalScroll}
        contentContainerStyle={S.verticalContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        <View style={S.mediaWrap}>
          <ScrollView
            ref={heroScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHeroScroll}
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
                  <Image
                    source={{ uri }}
                    style={S.heroImg}
                    resizeMode="cover"
                  />
                </Pressable>
              ))
            ) : (
              <View style={[S.heroImg, S.noImg]}>
                <Text style={S.noImgText}>Fără imagine</Text>
              </View>
            )}
          </ScrollView>

          {images.length > 1 ? (
            <View style={S.dots}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[S.dot, i === activeIndex && S.dotActive]}
                />
              ))}
            </View>
          ) : null}

          <View style={S.favOverlayWrap}>
            <View style={{ position: "relative" }}>
              <Pressable
                onPress={onToggleFav}
                disabled={favLoading}
                hitSlop={8}
              >
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
        </View>

        <View style={S.contentWrap}>
          <Text style={S.title}>{item.title || "Produs"}</Text>

          <Text style={S.price}>
            {typeof item.price === "number" ? item.price : item.price || "-"}{" "}
            lei
          </Text>

          {!!item.category ? (
            <Text style={S.cat}>Categorie: {item.category}</Text>
          ) : null}

          <Text style={S.section}>Descriere</Text>
          <Text style={S.desc}>{item.description || "—"}</Text>

          {!relatedLoading && moreFromSeller.length > 0 ? (
            <View style={S.relatedSection}>
              <Text style={S.relatedSectionTitle}>
                Mai multe de la acest utilizator
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.relatedRow}
              >
                {moreFromSeller.map(renderRelatedCard)}
              </ScrollView>
            </View>
          ) : null}

          {!relatedLoading && similarItems.length > 0 ? (
            <View style={S.relatedSection}>
              <Text style={S.relatedSectionTitle}>Articole similare</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.relatedRow}
              >
                {similarItems.map(renderRelatedCard)}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ height: Math.max(insets.bottom, 10) }} />
        </View>
      </Animated.ScrollView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        onDismiss={runPendingShare}
      >
        <View style={S.menuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuVisible(false)}
          />

          <View style={S.menuSheetWrap}>
            <View style={S.menuSheet}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={S.menuAction}
                onPress={onShareItem}
              >
                <Text style={S.menuActionText}>Partajare</Text>
              </TouchableOpacity>

              <View style={S.menuDivider} />

              <TouchableOpacity
                activeOpacity={0.88}
                style={S.menuAction}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={S.menuCancelText}>Închidere</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(tokens, HERO_H, insets) {
  const isDark = tokens?.scheme === "dark";

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
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");
  const mediaBg = pickTok(tokens, "mediaBg", "rgba(0,0,0,0.35)");
  const shadowColor = pickTok(tokens, "shadowColor", "#000");

  const stickyBg = isDark ? "rgba(11,18,32,0.88)" : "rgba(255,255,255,0.88)";
  const stickyBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const glassText = isDark ? "rgba(255,255,255,0.90)" : "rgba(0,0,0,0.75)";

  const glassMenuBg = isDark ? "rgba(10,14,22,0.42)" : "rgba(255,255,255,0.62)";
  const glassMenuDivider = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(0,0,0,0.08)";
  const overlayBg = isDark ? "rgba(0,0,0,0.28)" : "rgba(15,23,42,0.14)";

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

  const menuActionColor = pickTok(
    tokens,
    "primary",
    isDark ? "#60A5FA" : "#2CA6A4",
  );

  const menuCancelColor = pickTok(
    tokens,
    "primary",
    isDark ? "#60A5FA" : "#2CA6A4",
  );

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },

    stickyHeaderBg: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: insets.top + GLASS_H + 18,
      backgroundColor: stickyBg,
      zIndex: 140,
    },
    stickyHeaderBorder: {
      position: "absolute",
      top: insets.top + GLASS_H + 17,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: stickyBorder,
      zIndex: 141,
    },
    stickyHeaderShadow: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: insets.top + GLASS_H + 18,
      shadowColor,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      zIndex: 139,
    },

    stickyHeaderRow: {
      position: "absolute",
      left: 14,
      right: 14,
      height: GLASS_H,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 200,
    },

    verticalScroll: { flex: 1 },
    verticalContent: { paddingBottom: 0 },

    mediaWrap: {
      backgroundColor: mediaBg,
      position: "relative",
    },
    heroImg: {
      width: "100%",
      height: HERO_H,
      backgroundColor: mediaBg,
    },
    noImg: { alignItems: "center", justifyContent: "center" },
    noImgText: { color: onPrimary, fontWeight: "900" },

    headerBackBtn: {
      width: GLASS_H,
      height: GLASS_H,
      borderRadius: 999,
    },
    headerDotsBtn: {
      width: GLASS_H,
      height: GLASS_H,
      borderRadius: 999,
    },
    glassDots: {
      fontSize: 20,
      lineHeight: 22,
      fontWeight: "600",
      color: glassText,
      textAlign: "center",
      textAlignVertical: "center",
      includeFontPadding: false,
      letterSpacing: 2,
      marginTop: -1,
    },
    dotsIconFix: {
      marginLeft: 0,
      marginTop: 0,
    },

    dots: {
      position: "absolute",
      bottom: 18,
      left: 0,
      right: 50,
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

    favOverlayWrap: {
      position: "absolute",
      right: 16,
      bottom: 16,
      zIndex: 12,
    },

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

    contentWrap: {
      padding: 16,
      paddingBottom: 26,
    },

    title: { fontSize: 40, fontWeight: "900", marginTop: 6, color: text },
    price: { fontSize: 34, fontWeight: "900", color: primary, marginTop: 6 },
    cat: { marginTop: 10, color: muted, fontWeight: "800" },
    section: { marginTop: 22, fontSize: 22, fontWeight: "900", color: text },
    desc: { marginTop: 8, fontSize: 16, lineHeight: 22, color: text },

    relatedSection: {
      marginTop: 24,
    },
    relatedSectionTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: text,
      marginBottom: 12,
    },
    relatedRow: {
      paddingRight: 16,
      gap: 12,
    },
    relatedCard: {
      width: RELATED_CARD_W,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
    },
    relatedImgBox: {
      width: "100%",
      height: RELATED_IMG_H,
      backgroundColor: mediaBg,
    },
    relatedImg: {
      width: "100%",
      height: "100%",
    },
    relatedNoImg: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    relatedNoImgText: {
      color: onPrimary,
      fontWeight: "900",
      fontSize: 12,
    },
    relatedBody: {
      padding: 10,
    },
    relatedTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: text,
    },
    relatedPrice: {
      marginTop: 6,
      fontSize: 15,
      fontWeight: "900",
      color: primary,
    },
    relatedMeta: {
      marginTop: 6,
      color: muted,
      fontWeight: "700",
      fontSize: 13,
    },

    topBar: { paddingHorizontal: 14, paddingBottom: 8 },

    inlineBackBtn: {
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },

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

    menuOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: overlayBg,
    },

    menuSheetWrap: {
      paddingHorizontal: 14,
      paddingBottom: Math.max(insets.bottom, 10) + 10,
    },

    menuSheet: {
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: glassMenuBg,
      borderWidth: 1,
      borderColor: glassMenuDivider,
      shadowColor,
      shadowOpacity: isDark ? 0.16 : 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },

    menuAction: {
      minHeight: 72,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },

    menuActionText: {
      fontSize: 18,
      fontWeight: "500",
      color: menuActionColor,
    },

    menuCancelText: {
      fontSize: 18,
      fontWeight: "600",
      color: menuCancelColor,
    },

    menuDivider: {
      height: 1,
      backgroundColor: glassMenuDivider,
    },
  });
}
