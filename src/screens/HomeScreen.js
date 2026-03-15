// src/screens/HomeScreen.js
// COMPONENTĂ: HomeScreen
// MODIFICARE:
// - dots-urile de pe carduri sunt acum centrate, albe și în stil apropiat de ItemDetails
// - FIX: favoritele sunt normalizate pe chei string, ca să se încarce corect indiferent cum vine map-ul
// - FIX: după toggle favorite facem refresh punctual pentru itemul respectiv, ca să nu rămână count/map greșit
// - păstrat restul logicii existente (refresh silențios, keepScroll, create/update/delete local)

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
  useRef,
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
import { fetchItems } from "../services/itemsService";
import {
  fetchFavoritesCountsForItems,
  fetchFavoritesMapForUser,
  toggleFavorite,
} from "../services/favoritesService";

import ItemCardLightWarm from "../components/ItemCardLightWarm";
import ItemCardDarkProduct from "../components/ItemCardDarkProduct";

import { ThemeContext } from "../theme/ThemeProvider";

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

function normalizeCountsMap(rawMap, ids = []) {
  const next = {};
  (ids || []).forEach((id) => {
    const key = String(id);
    next[key] = Number(pickById(rawMap, id) ?? 0);
  });
  return next;
}

function normalizeBoolMap(rawMap, ids = []) {
  const next = {};
  (ids || []).forEach((id) => {
    const key = String(id);
    next[key] = Boolean(pickById(rawMap, id));
  });
  return next;
}

export default function HomeScreen({ navigation, route, query, setQuery }) {
  const insets = useSafeAreaInsets();

  const { scheme, tokens } = useContext(ThemeContext);
  const isDark = scheme === "dark";

  const [session, setSession] = useState(null);
  const isLoggedIn = !!session?.user;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [favCounts, setFavCounts] = useState({});
  const [myFavMap, setMyFavMap] = useState({});

  const listRef = useRef(null);
  const scrollOffsetRef = useRef(0);

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

        const [countsRaw, mineRaw] = await Promise.all([
          fetchFavoritesCountsForItems(ids),
          userId ? fetchFavoritesMapForUser(userId, ids) : Promise.resolve({}),
        ]);

        const nextCounts = normalizeCountsMap(countsRaw, ids);
        const nextMine = normalizeBoolMap(mineRaw, ids);

        setFavCounts(nextCounts);
        setMyFavMap(nextMine);
      } catch (err) {
        console.log("⚠️ refreshFavsForList warning:", err);
      }
    },
    [session?.user?.id],
  );

  const refreshSingleFav = useCallback(
    async (itemId) => {
      const sid = String(itemId || "");
      if (!sid) return;

      try {
        const userId = session?.user?.id;

        const [countsRaw, mineRaw] = await Promise.all([
          fetchFavoritesCountsForItems([sid]),
          userId
            ? fetchFavoritesMapForUser(userId, [sid])
            : Promise.resolve({}),
        ]);

        const count = Number(pickById(countsRaw, sid) ?? 0);
        const mine = Boolean(pickById(mineRaw, sid));

        setFavCounts((prev) => ({
          ...(prev || {}),
          [sid]: count,
        }));

        setMyFavMap((prev) => ({
          ...(prev || {}),
          [sid]: mine,
        }));
      } catch (err) {
        console.log("⚠️ refreshSingleFav warning:", err);
      }
    },
    [session?.user?.id],
  );

  const loadItems = useCallback(
    async ({ keepScroll = false, silent = false } = {}) => {
      if (!silent) {
        setErrorMsg("");
        setLoading(true);
      }

      const prevOffset = scrollOffsetRef.current || 0;

      try {
        const data = await fetchItems();
        const list = Array.isArray(data) ? data : [];
        setItems(list);
        await refreshFavsForList(list);

        if (keepScroll) {
          requestAnimationFrame(() => {
            try {
              listRef.current?.scrollToOffset?.({
                offset: prevOffset,
                animated: false,
              });
            } catch {}
          });
        }
      } catch (err) {
        console.log("❌ loadItems error:", err);
        setErrorMsg(err?.message || "Eroare la încărcare produse.");
        setItems([]);
        setFavCounts({});
        setMyFavMap({});
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [refreshFavsForList],
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      loadItems({ keepScroll: true, silent: true });
    }, [loadItems]),
  );

  useEffect(() => {
    if (!items?.length) return;
    refreshFavsForList(items);
  }, [session?.user?.id, items, refreshFavsForList]);

  useEffect(() => {
    const deletedId = route?.params?.deletedItemId;
    const deletedAt = route?.params?.deletedAt;
    if (!deletedId || !deletedAt) return;

    setItems((prev) =>
      Array.isArray(prev)
        ? prev.filter((it) => String(it?.id) !== String(deletedId))
        : [],
    );

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

    navigation.setParams({ deletedItemId: undefined, deletedAt: undefined });
  }, [route?.params?.deletedItemId, route?.params?.deletedAt, navigation]);

  useEffect(() => {
    const createdItem = route?.params?.createdItem;
    const createdItemId = route?.params?.createdItemId;
    const createdAt = route?.params?.createdAt;
    if (!createdAt) return;

    if (
      createdItem &&
      typeof createdItem === "object" &&
      createdItem.id != null
    ) {
      const newId = String(createdItem.id);

      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (arr.some((it) => String(it?.id) === newId)) return arr;
        return [createdItem, ...arr];
      });

      setFavCounts((prev) => ({
        ...(prev || {}),
        [newId]: prev?.[newId] ?? 0,
      }));

      setMyFavMap((prev) => {
        const next = { ...(prev || {}) };
        if (next[newId] == null) next[newId] = false;
        return next;
      });

      navigation.setParams({
        createdItem: undefined,
        createdItemId: undefined,
        createdAt: undefined,
      });
      return;
    }

    if (createdItemId) {
      loadItems({ keepScroll: true, silent: true }).finally(() => {
        navigation.setParams({
          createdItem: undefined,
          createdItemId: undefined,
          createdAt: undefined,
        });
      });
      return;
    }

    navigation.setParams({
      createdItem: undefined,
      createdItemId: undefined,
      createdAt: undefined,
    });
  }, [
    route?.params?.createdItem,
    route?.params?.createdItemId,
    route?.params?.createdAt,
    navigation,
    loadItems,
  ]);

  useEffect(() => {
    const updatedItem = route?.params?.updatedItem;
    const updatedItemId = route?.params?.updatedItemId;
    const updatedAt = route?.params?.updatedAt;
    if (!updatedAt) return;

    if (
      updatedItem &&
      typeof updatedItem === "object" &&
      updatedItem.id != null
    ) {
      const uid = String(updatedItem.id);

      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        let changed = false;

        const next = arr.map((it) => {
          if (String(it?.id) !== uid) return it;
          changed = true;
          return updatedItem;
        });

        if (!changed) return [updatedItem, ...next];
        return next;
      });

      navigation.setParams({
        updatedItem: undefined,
        updatedItemId: undefined,
        updatedAt: undefined,
      });
      return;
    }

    if (updatedItemId) {
      loadItems({ keepScroll: true, silent: true }).finally(() => {
        navigation.setParams({
          updatedItem: undefined,
          updatedItemId: undefined,
          updatedAt: undefined,
        });
      });
      return;
    }

    navigation.setParams({
      updatedItem: undefined,
      updatedItemId: undefined,
      updatedAt: undefined,
    });
  }, [
    route?.params?.updatedItem,
    route?.params?.updatedItemId,
    route?.params?.updatedAt,
    navigation,
    loadItems,
  ]);

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

  const renderDots = useCallback((images) => {
    if (!Array.isArray(images) || images.length <= 1) return null;

    const max = Math.min(images.length, 6);
    const centerIndex = (max - 1) / 2;

    return (
      <View style={styles.dotsWrap} pointerEvents="none">
        {Array.from({ length: max }).map((_, i) => {
          const distance = Math.abs(i - centerIndex);

          let size = 4;
          if (distance < 0.5) size = 8;
          else if (distance < 1.5) size = 6.5;
          else if (distance < 2.5) size = 5.2;

          const isFirst = i === 0;

          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: isFirst
                    ? "rgba(255,255,255,0.96)"
                    : "rgba(255,255,255,0.46)",
                },
              ]}
            />
          );
        })}
      </View>
    );
  }, []);

  const onToggleFav = useCallback(
    async (e, item) => {
      e?.stopPropagation?.();

      const userId = session?.user?.id;
      if (!userId) {
        navigation.navigate(ROUTES.Login);
        return;
      }

      const itemId = String(item?.id);
      const wasFav = Boolean(myFavMap[itemId]);

      setMyFavMap((prev) => ({
        ...(prev || {}),
        [itemId]: !wasFav,
      }));

      setFavCounts((prev) => ({
        ...(prev || {}),
        [itemId]: Math.max(0, Number(prev?.[itemId] || 0) + (wasFav ? -1 : 1)),
      }));

      try {
        await toggleFavorite({ userId, itemId, isFav: wasFav });
        await refreshSingleFav(itemId);
      } catch (err) {
        console.log("❌ toggleFavorite error:", err);

        setMyFavMap((prev) => ({
          ...(prev || {}),
          [itemId]: wasFav,
        }));

        setFavCounts((prev) => ({
          ...(prev || {}),
          [itemId]: Math.max(
            0,
            Number(prev?.[itemId] || 0) + (wasFav ? 1 : -1),
          ),
        }));
      }
    },
    [session?.user?.id, myFavMap, navigation, refreshSingleFav],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const images = getImages(item);
      const mainImage = images[0] || null;

      const itemId = String(item?.id);
      const isFav = Boolean(myFavMap[itemId]);
      const count = Number(favCounts[itemId] || 0);

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

  const shouldShowWelcome = Platform.OS !== "web" && !isLoggedIn;
  if (shouldShowWelcome) return <WelcomeScreen navigation={navigation} />;

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
            onPress={() => loadItems({ keepScroll: false, silent: false })}
            activeOpacity={0.9}
          >
            <Text style={styles.retryText}>Reîncearcă</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(it) => String(it.id)}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={{ paddingHorizontal: H_PADDING, gap: GAP }}
          onScroll={(e) => {
            scrollOffsetRef.current = e?.nativeEvent?.contentOffset?.y || 0;
          }}
          scrollEventThrottle={16}
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

  dotsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: 0.98,
  },
  dot: {},

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
