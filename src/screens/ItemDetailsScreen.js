// src/screens/ItemDetailsScreen.js
// COMPONENTĂ: ItemDetailsScreen
// MODIFICARE:
// - textul explicativ de jos din primul sheet a fost rescris într-un stil apropiat de referința din imagine
// - restul layout-ului și logicii rămân neschimbate

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
  Easing,
  Share,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

const BADGE_MIN = 22;
const GLASS_H = 52;
const RELATED_CARD_W = 156;
const RELATED_IMG_H = 176;
const HEADER_FADE_DISTANCE = 90;
const STORAGE_BUCKET = "items";

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

function normalizeImageEntries(item) {
  const raw = item?.images || item?.image_urls || [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean);
}

function extractStoragePathFromUrl(url, bucket = STORAGE_BUCKET) {
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

function getStoragePathsFromItem(item, bucket = STORAGE_BUCKET) {
  const entries = normalizeImageEntries(item);

  const paths = entries
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

async function deleteItemWithImages(item, bucket = STORAGE_BUCKET) {
  if (!item?.id) throw new Error("Lipsește id-ul anunțului.");

  const paths = getStoragePathsFromItem(item, bucket);

  if (paths.length > 0) {
    const { error: storageErr } = await supabase.storage
      .from(bucket)
      .remove(paths);
    if (storageErr) {
      console.log("⚠️ storage remove warning:", storageErr);
    }
  }

  const { error: dbErr } = await supabase
    .from("items")
    .delete()
    .eq("id", item.id);

  if (dbErr) throw dbErr;
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

function getDotMetrics(index, activeIndex) {
  const distance = Math.abs(index - activeIndex);

  if (distance === 0) return { size: 8 };
  if (distance === 1) return { size: 6.8 };
  if (distance === 2) return { size: 5.4 };

  return { size: 4.2 };
}

function toPriceNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const cleaned = String(value ?? "")
    .replace(/\s/g, "")
    .replace("RON", "")
    .replace("Lei", "")
    .replace("lei", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatRon(value) {
  const n = Number(value || 0);
  return `${n.toFixed(2).replace(".", ",")} RON`;
}

function calculateBuyerProtectionFee(price) {
  const p = Number(price || 0);
  return Number((p * 0.0675).toFixed(2));
}

function calculateShippingFrom(price) {
  const p = Number(price || 0);
  if (p >= 300) return 11.99;
  if (p >= 150) return 8.89;
  return 6.99;
}

export default function ItemDetailsScreen({ navigation, route }) {
  const { tokens } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
  const HERO_H = useMemo(() => Math.round(SCREEN_H * 0.6), [SCREEN_H]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const buyerSheetY = useRef(new Animated.Value(SCREEN_H)).current;

  const S = useMemo(
    () => makeStyles(tokens, HERO_H, insets, SCREEN_H),
    [tokens, HERO_H, insets, SCREEN_H],
  );

  const passedItem = route?.params?.item || null;
  const item = passedItem;

  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [buyerSheetMounted, setBuyerSheetMounted] = useState(false);

  const heroScrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const heroPressRef = useRef(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  const [moreFromSeller, setMoreFromSeller] = useState([]);
  const [similarItems, setSimilarItems] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    scrollY.setValue(0);
    dotsAnim.setValue(0);
    setInfoSheetVisible(false);
    setBuyerSheetMounted(false);
    buyerSheetY.setValue(SCREEN_H);

    try {
      heroScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
    } catch {}
  }, [route?.params?.item?.id, scrollY, dotsAnim, buyerSheetY, SCREEN_H]);

  useEffect(() => {
    Animated.timing(dotsAnim, {
      toValue: activeIndex,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, dotsAnim]);

  const itemId = useMemo(() => (item?.id ? String(item.id) : null), [item]);
  const userId = session?.user?.id || null;

  const numericPrice = useMemo(() => toPriceNumber(item?.price), [item?.price]);
  const buyerProtectionFee = useMemo(
    () => calculateBuyerProtectionFee(numericPrice || 0),
    [numericPrice],
  );
  const shippingFrom = useMemo(
    () => calculateShippingFrom(numericPrice || 0),
    [numericPrice],
  );
  const totalIncl = useMemo(
    () =>
      Number(
        (Number(numericPrice || 0) + Number(buyerProtectionFee || 0)).toFixed(
          2,
        ),
      ),
    [numericPrice, buyerProtectionFee],
  );

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
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    if (passedItem) {
      navigation.navigate(ROUTES.ItemDetails, { item: passedItem });
      return;
    }

    navigation.navigate("TabsRoot", { screen: ROUTES.Home });
  }, [navigation, passedItem]);

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

  const openPriceSheet = useCallback(() => {
    setInfoSheetVisible(true);
    setBuyerSheetMounted(false);
    buyerSheetY.setValue(SCREEN_H);
  }, [buyerSheetY, SCREEN_H]);

  const closeBuyerSheetOnly = useCallback(() => {
    Animated.timing(buyerSheetY, {
      toValue: SCREEN_H,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setBuyerSheetMounted(false);
    });
  }, [buyerSheetY, SCREEN_H]);

  const closeInfoSheet = useCallback(() => {
    if (buyerSheetMounted) {
      Animated.timing(buyerSheetY, {
        toValue: SCREEN_H,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setBuyerSheetMounted(false);
        setInfoSheetVisible(false);
        buyerSheetY.setValue(SCREEN_H);
      });
      return;
    }

    setInfoSheetVisible(false);
    buyerSheetY.setValue(SCREEN_H);
  }, [buyerSheetMounted, buyerSheetY, SCREEN_H]);

  const openBuyerProtectionInsideSheet = useCallback(() => {
    setBuyerSheetMounted(true);
    buyerSheetY.setValue(SCREEN_H);

    Animated.timing(buyerSheetY, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [buyerSheetY, SCREEN_H]);

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
    if (!item?.id) return;

    Alert.alert("Șterge anunțul?", "Sigur vrei să-l ștergi?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteItemWithImages(item, STORAGE_BUCKET);

            Alert.alert("Șters", "Anunțul a fost șters.", [
              {
                text: "OK",
                onPress: () => {
                  navigation.navigate("TabsRoot", {
                    screen: ROUTES.Home,
                    params: {
                      deletedItemId: String(item.id),
                      deletedAt: Date.now(),
                    },
                  });
                },
              },
            ]);
          } catch (e) {
            Alert.alert("Eroare", e?.message || "Nu pot șterge anunțul.");
          }
        },
      },
    ]);
  }, [item, navigation]);

  const onEdit = useCallback(() => {
    if (!item) return;
    navigation.navigate(ROUTES.EditItem, { item });
  }, [navigation, item]);

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

  const openItem = useCallback(
    (nextItem) => {
      if (!nextItem) return;
      navigation.navigate(ROUTES.ItemDetails, { item: nextItem });
    },
    [navigation],
  );

  const onShareItem = useCallback(async () => {
    if (!item) return;

    try {
      const payload = buildSharePayload(item);
      await Share.share({
        title: payload.title,
        message: payload.message,
        url: payload.url,
      });
    } catch (e) {
      console.log("❌ share error:", e);
    }
  }, [item]);

  const onChatPress = useCallback(() => {
    if (!session?.user?.id) {
      navigation.navigate(ROUTES.Login);
      return;
    }

    if (isOwner) {
      Alert.alert(
        "Anunțul tău",
        "Nu poți deschide chat pentru propriul tău anunț.",
      );
      return;
    }

    Alert.alert(
      "Chat",
      "Zona de chat pentru acest anunț o legăm în pasul următor.",
    );
  }, [session?.user?.id, navigation, isOwner]);

  const onOwnerLongPress = useCallback(() => {
    if (!isOwner) return;

    Alert.alert("Acțiuni anunț", "Alege ce vrei să faci.", [
      { text: "Anulează", style: "cancel" },
      { text: "Editare", onPress: onEdit },
      { text: "Ștergere", style: "destructive", onPress: onDelete },
    ]);
  }, [isOwner, onEdit, onDelete]);

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
            onPress={() =>
              navigation.navigate("TabsRoot", { screen: ROUTES.Home })
            }
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
        style={[S.stickyHeaderBg, { opacity: stickyBgOpacity }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[S.stickyHeaderBorder, { opacity: stickyBorderOpacity }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[S.stickyHeaderShadow, { opacity: stickyShadowOpacity }]}
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
            <View style={S.imageDotsWrap} pointerEvents="none">
              {images.map((_, i) => {
                const { size } = getDotMetrics(i, activeIndex);

                const animatedScale = dotsAnim.interpolate({
                  inputRange: [i - 2, i - 1, i, i + 1, i + 2],
                  outputRange: [0.88, 0.95, 1.08, 0.95, 0.88],
                  extrapolate: "clamp",
                });

                const animatedOpacity = dotsAnim.interpolate({
                  inputRange: [i - 2, i - 1, i, i + 1, i + 2],
                  outputRange: [0.42, 0.7, 1, 0.7, 0.42],
                  extrapolate: "clamp",
                });

                return (
                  <Animated.View
                    key={i}
                    style={[
                      S.imageDotBase,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        transform: [{ scale: animatedScale }],
                        opacity: animatedOpacity,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={S.socialRowWrap}>
          <View style={S.socialRow}>
            <View style={S.socialLeft}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={S.socialIconButton}
                onPress={onToggleFav}
                onLongPress={onOwnerLongPress}
                disabled={favLoading}
              >
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                  <Ionicons
                    name={isFav ? "heart" : "heart-outline"}
                    size={31}
                    color={isFav ? S.__dangerColor : S.__iconColor}
                  />
                </Animated.View>

                {favCount > 0 ? (
                  <View style={[S.countPill, { minWidth: dynamicBadgeWidth }]}>
                    <Text style={S.countText}>{countText}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={S.socialIconButton}
                onPress={onChatPress}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={29}
                  color={S.__iconColor}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={S.socialIconButton}
                onPress={onShareItem}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={29}
                  color={S.__iconColor}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={S.contentWrap}>
          <Text style={S.title}>{item.title || "Produs"}</Text>

          <Text style={S.priceMain}>
            {numericPrice !== null
              ? formatRon(numericPrice)
              : `${item.price || "-"} lei`}
          </Text>

          {numericPrice !== null ? (
            <View style={S.inclRowWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={S.inclRow}
                onPress={openPriceSheet}
              >
                <Text style={S.priceInclText}>
                  {formatRon(totalIncl)} incl.
                </Text>

                <View style={S.inclIcons}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={S.__primaryColor}
                  />
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={S.__primaryColor}
                  />
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

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
        visible={infoSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeInfoSheet}
      >
        <View style={S.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeInfoSheet} />

          <View style={S.sheetWrap}>
            <View style={S.sheetHandle} />

            <View style={S.sheetCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={S.priceSheetScrollContent}
              >
                <View style={S.sheetHeader}>
                  <View>
                    <Text style={S.sheetEyebrow}>ModaGo</Text>
                    <Text style={S.sheetTitle}>Cum se formează prețul</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={closeInfoSheet}
                    style={S.sheetCloseBtn}
                  >
                    <Ionicons name="close" size={26} color={S.__iconColor} />
                  </TouchableOpacity>
                </View>

                <Text style={S.sheetIntro}>
                  Vezi rapid din ce este compus costul estimat pentru acest
                  articol.
                </Text>

                <View style={S.breakdownList}>
                  <View style={S.breakdownCard}>
                    <View style={S.breakdownIconWrap}>
                      <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color={S.__primaryColor}
                      />
                    </View>
                    <View style={S.breakdownContent}>
                      <Text style={S.breakdownLabel}>Preț articol</Text>
                      <Text style={S.breakdownHint}>
                        Prețul setat de vânzător.
                      </Text>
                    </View>
                    <Text style={S.breakdownValue}>
                      {numericPrice !== null
                        ? formatRon(numericPrice)
                        : `${item.price || "-"} lei`}
                    </Text>
                  </View>

                  <View style={S.breakdownCard}>
                    <View style={S.breakdownIconWrap}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={S.__primaryColor}
                      />
                    </View>

                    <View style={S.breakdownContent}>
                      <View style={S.breakdownLabelRow}>
                        <Text style={S.breakdownLabel}>
                          Protecție cumpărător
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={openBuyerProtectionInsideSheet}
                          style={S.inlineInfoBtn}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={18}
                            color={S.__primaryColor}
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={S.breakdownHint}>
                        Acoperă suportul pentru comandă și siguranța
                        tranzacției.
                      </Text>
                    </View>

                    <Text style={S.breakdownValue}>
                      {formatRon(buyerProtectionFee)}
                    </Text>
                  </View>

                  <View style={S.breakdownCard}>
                    <View style={S.breakdownIconWrap}>
                      <Ionicons
                        name="cube-outline"
                        size={18}
                        color={S.__primaryColor}
                      />
                    </View>
                    <View style={S.breakdownContent}>
                      <Text style={S.breakdownLabel}>Livrare estimată</Text>
                      <Text style={S.breakdownHint}>
                        Costul final depinde de metoda de expediere aleasă.
                      </Text>
                    </View>
                    <Text style={S.breakdownValue}>
                      de la {formatRon(shippingFrom)}
                    </Text>
                  </View>
                </View>

                <View style={S.totalCard}>
                  <View style={S.totalTopRow}>
                    <Text style={S.totalLabel}>Total estimat</Text>
                    <Text style={S.totalValue}>{formatRon(totalIncl)}</Text>
                  </View>

                  <Text style={S.totalSubtext}>
                    {formatRon(totalIncl)} + livrarea selectată la checkout.
                  </Text>
                </View>

                <Text style={S.sheetNote}>
                  Taxa de protecție pentru cumpărător este obligatorie atunci
                  când achiziționezi un articol. Aceasta se adaugă la fiecare
                  comandă finalizată prin cumpărare. Prețul articolului este
                  stabilit de vânzător și poate face obiectul negocierii.
                </Text>
              </ScrollView>
            </View>
          </View>

          {buyerSheetMounted ? (
            <Animated.View
              style={[
                S.buyerOverlaySheet,
                {
                  transform: [{ translateY: buyerSheetY }],
                },
              ]}
            >
              <View style={S.buyerHandleWrap}>
                <View style={S.sheetHandle} />
              </View>

              <View style={S.protectionSheetHeader}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={closeBuyerSheetOnly}
                  style={S.protectionBackBtn}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={S.__iconColor}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={closeInfoSheet}
                  style={S.sheetCloseBtn}
                >
                  <Ionicons name="close" size={26} color={S.__iconColor} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={S.protectionSheetScrollContent}
              >
                <View style={S.protectionHero}>
                  <View style={S.protectionHeroIcon}>
                    <Ionicons
                      name="shield-checkmark"
                      size={34}
                      color={S.__primaryColor}
                    />
                  </View>

                  <Text style={S.protectionTitle}>
                    Protecția cumpărătorului
                  </Text>

                  <Text style={S.protectionLink}>
                    Află cum calculăm taxa de protecție a cumpărătorului
                  </Text>
                </View>

                <View style={S.protectionSection}>
                  <View style={S.protectionSectionHeader}>
                    <Ionicons
                      name="cash-outline"
                      size={24}
                      color={S.__primaryColor}
                    />
                    <Text style={S.protectionSectionTitle}>
                      Politica de rambursare
                    </Text>
                  </View>

                  <Text style={S.protectionText}>
                    Poți primi o rambursare în cazul în care comanda:
                  </Text>
                  <Text style={S.protectionBullet}>
                    • nu a fost expediată sau s-a pierdut
                  </Text>
                  <Text style={S.protectionBullet}>• sosește deteriorată</Text>
                  <Text style={S.protectionBullet}>
                    • este neconformă cu descrierea
                  </Text>

                  <Text style={S.protectionParagraph}>
                    Ai la dispoziție 2 zile pentru a trimite o reclamație de la
                    data când primești notificarea că un articol a fost livrat,
                    chiar dacă acesta nu a sosit.
                  </Text>

                  <Text style={S.protectionParagraph}>
                    Cumpărătorii suportă costul returnării unui articol, dacă nu
                    există alt acord.
                  </Text>
                </View>

                <View style={S.protectionSection}>
                  <View style={S.protectionSectionHeader}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={24}
                      color={S.__primaryColor}
                    />
                    <Text style={S.protectionSectionTitle}>
                      Tranzacții securizate
                    </Text>
                  </View>

                  <Text style={S.protectionParagraph}>
                    Banii tăi sunt păstrați în siguranță pe toată durata
                    tranzacției. Nu îi vom elibera vânzătorului până când nu
                    primești comanda și confirmi că totul este în regulă.
                  </Text>

                  <Text style={S.protectionParagraph}>
                    Plățile sunt criptate de partenerul nostru de plată, astfel
                    încât banii tăi sunt întotdeauna trimiși și primiți în
                    siguranță. Vânzătorul nu va vedea niciodată detaliile tale
                    de plată.
                  </Text>
                </View>

                <View style={S.protectionSection}>
                  <View style={S.protectionSectionHeader}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={24}
                      color={S.__primaryColor}
                    />
                    <Text style={S.protectionSectionTitle}>
                      Asistența noastră
                    </Text>
                  </View>

                  <Text style={S.protectionParagraph}>
                    Contactează oricând echipa noastră de asistență, îți stă la
                    dispoziție pentru a-ți oferi ajutor.
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={S.protectionPrimaryBtn}
                  onPress={closeInfoSheet}
                >
                  <Text style={S.protectionPrimaryBtnText}>Am înțeles</Text>
                </TouchableOpacity>

                <View style={{ height: Math.max(insets.bottom, 24) }} />
              </ScrollView>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(tokens, HERO_H, insets, SCREEN_H) {
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
  const iconColor = pickTok(tokens, "text", text);

  const sheetBg = pickTok(tokens, "card", isDark ? "#0F172A" : "#FFFFFF");
  const sheetOverlay = isDark ? "rgba(0,0,0,0.46)" : "rgba(15,23,42,0.30)";
  const surfaceSoft = pickTok(
    tokens,
    "surfaceSoft",
    isDark ? "rgba(255,255,255,0.05)" : "#F5F6F7",
  );
  const handleColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.18)";
  const accentSoft = isDark ? "rgba(44,166,164,0.12)" : "rgba(44,166,164,0.10)";
  const accentBorder = isDark
    ? "rgba(44,166,164,0.22)"
    : "rgba(44,166,164,0.18)";

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

    imageDotsWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      zIndex: 20,
    },
    imageDotBase: {
      backgroundColor: "rgba(255,255,255,0.96)",
    },

    headerBackBtn: {
      width: GLASS_H,
      height: GLASS_H,
      borderRadius: 999,
    },

    socialRowWrap: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 2,
    },
    socialRow: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    socialLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    socialIconButton: {
      minWidth: 30,
      minHeight: 30,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },

    countPill: {
      position: "absolute",
      right: -9,
      bottom: -8,
      height: BADGE_MIN,
      paddingHorizontal: 6,
      borderRadius: 999,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: bg,
      zIndex: 10,
    },
    countText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "900",
    },

    contentWrap: {
      padding: 16,
      paddingTop: 6,
      paddingBottom: 26,
    },

    title: {
      fontSize: 28,
      fontWeight: "700",
      marginTop: 6,
      color: text,
      lineHeight: 33,
      letterSpacing: -0.2,
    },
    priceMain: {
      fontSize: 18,
      fontWeight: "500",
      color: text,
      marginTop: 10,
      lineHeight: 22,
    },
    inclRowWrap: {
      marginTop: 2,
      alignItems: "flex-start",
    },
    inclRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 2,
    },
    priceInclText: {
      fontSize: 17,
      fontWeight: "500",
      color: primary,
      lineHeight: 22,
    },
    inclIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 1,
    },

    cat: {
      marginTop: 10,
      color: muted,
      fontWeight: "800",
      fontSize: 13,
    },
    section: {
      marginTop: 22,
      fontSize: 22,
      fontWeight: "900",
      color: text,
    },
    desc: {
      marginTop: 8,
      fontSize: 16,
      lineHeight: 22,
      color: text,
    },

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

    topBar: {
      paddingHorizontal: 14,
      paddingBottom: 8,
    },

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
    primaryText: {
      color: onPrimary,
      fontWeight: "900",
    },

    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: sheetOverlay,
    },
    sheetWrap: {
      paddingHorizontal: 0,
      paddingBottom: 0,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: handleColor,
      marginBottom: 10,
    },
    sheetCard: {
      backgroundColor: sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: border,
      maxHeight: SCREEN_H * 0.76,
      minHeight: SCREEN_H * 0.6,
    },
    priceSheetScrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: Math.max(insets.bottom, 18),
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    sheetEyebrow: {
      fontSize: 12,
      fontWeight: "800",
      color: primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    sheetTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: text,
      lineHeight: 28,
    },
    sheetCloseBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: surfaceSoft,
      marginTop: 2,
    },
    sheetIntro: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      color: muted,
      fontWeight: "500",
    },

    breakdownList: {
      marginTop: 18,
      gap: 12,
    },
    breakdownCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: surfaceSoft,
      borderWidth: 1,
      borderColor: border,
    },
    breakdownIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
      marginTop: 1,
    },
    breakdownContent: {
      flex: 1,
      paddingRight: 8,
    },
    breakdownLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    breakdownLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: text,
      lineHeight: 20,
      flex: 1,
    },
    inlineInfoBtn: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
    },
    breakdownHint: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      color: muted,
      fontWeight: "500",
    },
    breakdownValue: {
      fontSize: 15,
      fontWeight: "800",
      color: text,
      lineHeight: 20,
      marginTop: 1,
    },

    totalCard: {
      marginTop: 16,
      borderRadius: 20,
      padding: 16,
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
    },
    totalTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "800",
      color: text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: "900",
      color: primary,
    },
    totalSubtext: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      color: muted,
      fontWeight: "500",
    },

    sheetNote: {
      marginTop: 18,
      fontSize: 13,
      lineHeight: 20,
      color: muted,
      fontWeight: "500",
    },

    buyerOverlaySheet: {
      position: "absolute",
      top: Math.max(insets.top, 8),
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: "hidden",
    },

    buyerHandleWrap: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 4,
    },

    protectionSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
    protectionBackBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: surfaceSoft,
    },
    protectionSheetScrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom, 24) + 16,
      flexGrow: 1,
    },
    protectionHero: {
      alignItems: "center",
      marginTop: 8,
      marginBottom: 24,
    },
    protectionHeroIcon: {
      width: 96,
      height: 96,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
      marginBottom: 18,
    },
    protectionTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: text,
      textAlign: "center",
      lineHeight: 30,
    },
    protectionLink: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: primary,
      textAlign: "center",
      textDecorationLine: "underline",
    },

    protectionSection: {
      marginBottom: 28,
    },
    protectionSectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 8,
    },
    protectionSectionTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "800",
      color: text,
      lineHeight: 24,
      marginTop: -1,
    },
    protectionText: {
      fontSize: 16,
      lineHeight: 25,
      color: muted,
      fontWeight: "500",
      marginLeft: 36,
      marginBottom: 2,
    },
    protectionBullet: {
      fontSize: 16,
      lineHeight: 25,
      color: muted,
      fontWeight: "500",
      marginLeft: 54,
    },
    protectionParagraph: {
      marginTop: 16,
      fontSize: 16,
      lineHeight: 27,
      color: muted,
      fontWeight: "500",
      marginLeft: 36,
    },

    protectionPrimaryBtn: {
      marginTop: 8,
      height: 52,
      borderRadius: 14,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },
    protectionPrimaryBtnText: {
      color: onPrimary,
      fontSize: 18,
      fontWeight: "800",
    },

    __iconColor: iconColor,
    __dangerColor: danger,
    __primaryColor: primary,
  });
}
