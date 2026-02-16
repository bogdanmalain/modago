// src/screens/HomeScreen.js (iOS/Android)
// ============================================
// MODIFICARE:
// - FIX: după delete din ItemDetails, Home elimină local anunțul imediat (fără refetch)
//   -> primește route.params.deletedItemId + șterge din items + curăță favCounts/myFavMap
//   -> păstrează scroll position (nu sare sus)
// - Rămâne valabil: NU refacem lista (fetchItems) la focus, doar refresh favorites
// NU se modifică:
// - UI: search, chips, grid, carduri, layout inimă
// - aplicația rămâne default Light (nu auto dark)
// ============================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  TextInput,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import WelcomeScreen from "./WelcomeScreen";
import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import {
  fetchItems,
  fetchFavoritesCounts,
  fetchMyFavoritesMap,
  toggleFavorite,
} from "../services/itemsService";

import ItemCardLightWarm from "../components/ItemCardLightWarm";
import ItemCardDarkProduct from "../components/ItemCardDarkProduct";

import { ThemeContext } from "../theme/ThemeProvider";

export default function HomeScreen({ navigation, route, query, setQuery }) {
  const insets = useSafeAreaInsets();

  // ✅ Theme (instant switch)
  const { scheme, tokens } = useContext(ThemeContext);
  const isDark = scheme === "dark";

  const [session, setSession] = useState(null);
  const isLoggedIn = !!session?.user;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // favorites state
  const [favCounts, setFavCounts] = useState({}); // itemId -> count
  const [myFavMap, setMyFavMap] = useState({}); // itemId -> true

  // ============================================
  // MODIFICARE: consumăm delete din ItemDetails
  // ============================================
  useEffect(() => {
    const deletedId = route?.params?.deletedItemId;
    const deletedAt = route?.params?.deletedAt; // doar ca trigger

    if (!deletedId) return;

    setItems((prev) =>
      Array.isArray(prev)
        ? prev.filter((it) => String(it?.id) !== String(deletedId))
        : [],
    );

    // curățăm și favorites cache ca să nu rămână “fantome”
    setFavCounts((prev) => {
      const next = { ...(prev || {}) };
      delete next[String(deletedId)];
      return next;
    });

    setMyFavMap((prev) => {
      const next = { ...(prev || {}) };
      delete next[String(deletedId)];
      return next;
    });

    // consumăm param-ul ca să nu se reaplice
    navigation.setParams({ deletedItemId: undefined, deletedAt: undefined });
  }, [route?.params?.deletedItemId, route?.params?.deletedAt, navigation]);

  // 🔎 Search local
  const [localQuery, setLocalQuery] = useState(String(query || ""));
  useEffect(() => setLocalQuery(String(query || "")), [query]);

  const onChangeQuery = useCallback(
    (t) => {
      setLocalQuery(t);
      if (typeof setQuery === "function") setQuery(t);
    },
    [setQuery],
  );

  const CATS = useMemo(
    () => ["Toate", "Femei", "Bărbați", "Designer", "Copii", "Casă"],
    [],
  );
  const [activeCat, setActiveCat] = useState("Toate");

  // ✅ spacing
  const GAP = isDark ? 16 : 12;
  const H_PADDING = 14;
  const numColumns = 2;

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

  const refreshFavsForList = useCallback(
    async (list) => {
      try {
        const arr = Array.isArray(list) ? list : [];
        const ids = arr.map((it) => String(it.id));
        if (ids.length === 0) {
          setFavCounts({});
          setMyFavMap({});
          return;
        }

        const userId = session?.user?.id;

        const [counts, mine] = await Promise.all([
          fetchFavoritesCounts(ids),
          userId ? fetchMyFavoritesMap(userId, ids) : Promise.resolve({}),
        ]);

        setFavCounts(counts || {});
        setMyFavMap(mine || {});
      } catch (err) {
        // nu blocăm UI-ul pentru favorite refresh
      }
    },
    [session?.user?.id],
  );

  const loadItems = useCallback(async () => {
    setErrorMsg("");
    setLoading(true);

    try {
      const data = await fetchItems();
      const list = Array.isArray(data) ? data : [];
      setItems(list);

      // initial fav refresh pe lista nouă
      await refreshFavsForList(list);
    } catch (err) {
      console.log("❌ loadItems error:", err);
      setErrorMsg(err?.message || "Eroare la încărcare produse.");
      setItems([]);
      setFavCounts({});
      setMyFavMap({});
    } finally {
      setLoading(false);
    }
  }, [refreshFavsForList]);

  // ✅ Load o singură dată la mount (nu la focus)
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ✅ La focus NU mai refacem lista -> doar refresh favorites, ca să nu sară scroll-ul sus
  useFocusEffect(
    useCallback(() => {
      if (items && items.length > 0) {
        refreshFavsForList(items);
      } else {
        loadItems();
      }
    }, [items, refreshFavsForList, loadItems]),
  );

  const filteredItems = useMemo(() => {
    const q = String(localQuery || "")
      .trim()
      .toLowerCase();
    let base = items;

    if (activeCat && activeCat !== "Toate") {
      const c = activeCat.toLowerCase();
      base = base.filter((it) =>
        String(it.category || "")
          .toLowerCase()
          .includes(c),
      );
    }

    if (!q) return base;

    return base.filter((it) => {
      const t = String(it.title || "").toLowerCase();
      const d = String(it.description || "").toLowerCase();
      const c = String(it.category || "").toLowerCase();
      return t.includes(q) || d.includes(q) || c.includes(q);
    });
  }, [items, localQuery, activeCat]);

  const getImages = useCallback((item) => {
    const arr = item?.images || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }, []);

  // Dots (același layout, culori în funcție de temă)
  const renderDots = useCallback(
    (images) => {
      if (!Array.isArray(images) || images.length <= 1) return null;

      const max = Math.min(images.length, 6);
      const rest = images.length - max;

      return (
        <View style={styles.dotsWrap} pointerEvents="none">
          {Array.from({ length: max }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                isDark ? styles.dotDark : styles.dotLight,
                i === 0
                  ? isDark
                    ? styles.dotActiveDark
                    : styles.dotActiveLight
                  : null,
              ]}
            />
          ))}
          {rest > 0 ? (
            <View
              style={[
                styles.dot,
                isDark ? styles.dotDark : styles.dotLight,
                styles.dotMore,
              ]}
            />
          ) : null}
        </View>
      );
    },
    [isDark],
  );

  const onToggleFav = useCallback(
    async (e, item) => {
      e?.stopPropagation?.();

      const userId = session?.user?.id;
      if (!userId) {
        navigation.navigate(ROUTES.Login);
        return;
      }

      const itemId = String(item?.id);
      const isFav = !!myFavMap[itemId];

      // optimistic UI
      setMyFavMap((prev) => ({ ...prev, [itemId]: !isFav }));
      setFavCounts((prev) => ({
        ...prev,
        [itemId]: Math.max(0, (prev[itemId] || 0) + (isFav ? -1 : 1)),
      }));

      try {
        await toggleFavorite({ userId, itemId, isFav });
      } catch (err) {
        // rollback
        setMyFavMap((prev) => ({ ...prev, [itemId]: isFav }));
        setFavCounts((prev) => ({
          ...prev,
          [itemId]: Math.max(0, (prev[itemId] || 0) + (isFav ? 1 : -1)),
        }));
        console.log("❌ toggleFavorite error:", err);
      }
    },
    [session?.user?.id, myFavMap, navigation],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const images = getImages(item);
      const mainImage = images[0] || null;

      const itemId = String(item?.id);
      const isFav = !!myFavMap[itemId];
      const count = favCounts[itemId] || 0;

      const dots = renderDots(images);
      const onPressCard = () =>
        navigation.navigate(ROUTES.ItemDetails, { item });
      const onFav = (e) => onToggleFav(e, item);

      if (isDark) {
        return (
          <ItemCardDarkProduct
            item={item}
            mainImage={mainImage}
            dots={dots}
            isFav={isFav}
            favCount={count}
            onPressCard={onPressCard}
            onToggleFav={onFav}
            GAP={GAP}
            tokens={tokens}
          />
        );
      }

      return (
        <ItemCardLightWarm
          item={item}
          mainImage={mainImage}
          imagesCount={images.length}
          dots={dots}
          isFav={isFav}
          favCount={count}
          onPressCard={onPressCard}
          onToggleFav={onFav}
          GAP={GAP}
        />
      );
    },
    [
      GAP,
      navigation,
      getImages,
      myFavMap,
      favCounts,
      onToggleFav,
      renderDots,
      isDark,
      tokens,
    ],
  );

  // ✅ gate AFTER hooks
  const shouldShowWelcome = Platform.OS !== "web" && !isLoggedIn;
  if (shouldShowWelcome) return <WelcomeScreen navigation={navigation} />;

  // ✅ Tokens for chips (TEAL everywhere)
  const chipActiveBorder = tokens.primary;
  const chipActiveBg =
    tokens.primarySoft ||
    (isDark ? "rgba(58,175,179,0.18)" : "rgba(58,175,179,0.14)");
  const chipInactiveBorder = tokens.border;
  const chipInactiveBg = "transparent";

  const chipTextActive = tokens.primary;
  const chipTextInactive = isDark ? "rgba(255,255,255,0.88)" : tokens.text;

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      {/* TOP: search + chips */}
      <View
        style={[
          styles.topArea,
          { paddingTop: Math.max(insets.top, 10), backgroundColor: tokens.bg },
        ]}
      >
        <View
          style={[
            styles.searchRow,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : tokens.card,
              borderColor: tokens.border,
            },
          ]}
        >
          <Text
            style={[
              styles.searchIcon,
              { color: isDark ? "rgba(255,255,255,0.85)" : tokens.muted },
            ]}
          >
            ⌕
          </Text>

          <TextInput
            value={localQuery}
            onChangeText={onChangeQuery}
            placeholder="Caută articole sau membri"
            placeholderTextColor={
              isDark ? "rgba(255,255,255,0.55)" : tokens.muted
            }
            style={[
              styles.searchInput,
              { color: isDark ? "rgba(255,255,255,0.92)" : tokens.text },
            ]}
            autoCapitalize="none"
            returnKeyType="search"
          />

          <Pressable
            style={({ pressed }) => [
              styles.cameraBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
                transform: [{ scale: pressed ? 0.96 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={() => {}}
          >
            <Text style={styles.cameraIcon}>📷</Text>
          </Pressable>
        </View>

        <View style={styles.chipsRow}>
          <FlatList
            data={CATS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(x) => x}
            contentContainerStyle={styles.chipsContent}
            renderItem={({ item: c }) => {
              const active = c === activeCat;

              const borderColor = active
                ? chipActiveBorder
                : chipInactiveBorder;
              const bg = active ? chipActiveBg : chipInactiveBg;
              const textColor = active ? chipTextActive : chipTextInactive;

              return (
                <Pressable
                  onPress={() => setActiveCat(c)}
                  style={({ pressed }) => [
                    styles.chipTop,
                    { borderColor, backgroundColor: bg },
                    pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                  ]}
                >
                  <Text style={[styles.chipTopText, { color: textColor }]}>
                    {c}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>

      {/* LIST */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: tokens.muted }]}>
            Se încarcă…
          </Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: tokens.primary }]}
            onPress={loadItems}
            activeOpacity={0.9}
          >
            <Text style={styles.retryText}>Reîncearcă</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(it) => String(it.id)}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={{ paddingHorizontal: H_PADDING, gap: GAP }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: tokens.muted }]}>
                Nu există produse.
              </Text>
            </View>
          }
        />
      )}

      <View style={{ height: Math.max(insets.bottom, 0) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  topArea: { paddingBottom: 8 },

  searchRow: {
    marginHorizontal: 14,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: { fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "700" },

  cameraBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: { fontSize: 16 },

  chipsRow: { marginTop: 10 },
  chipsContent: { paddingHorizontal: 14, gap: 10 },
  chipTop: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipTopText: { fontWeight: "900" },

  listContent: { paddingTop: 12, paddingBottom: 34 },

  // dots
  dotsWrap: {
    position: "absolute",
    bottom: 18,
    left: 18,
    flexDirection: "row",
    gap: 6,
    opacity: 0.95,
  },
  dot: { width: 7, height: 7, borderRadius: 99 },
  dotLight: { backgroundColor: "rgba(0,0,0,0.22)" },
  dotActiveLight: { backgroundColor: "rgba(0,0,0,0.62)" },
  dotDark: { backgroundColor: "rgba(255,255,255,0.35)" },
  dotActiveDark: { backgroundColor: "rgba(255,255,255,0.95)" },
  dotMore: { opacity: 0.85 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: { marginTop: 10, fontWeight: "800" },
  emptyText: { fontWeight: "800" },
  errorText: { color: "#ff6b6b", fontWeight: "900", textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "900" },
});
