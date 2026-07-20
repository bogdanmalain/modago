// src/screens/SearchScreen.js
// CE ESTE:
// - ecran dedicat de căutare și navigare pe categorii cu 3 nivele
// - folosește structura din categoryTree.js
// - Nivel 0: carduri principale (Femei, Bărbați, Copii) cu ilustrații personaj
// - Nivel 1: subcategorii (Îmbrăcăminte, Încălțăminte, Genți, Accesorii) cu ilustrații outline
// - Nivel 2: categorii finale (Rochii, Topuri etc.) — tap → rezultate filtrate inline
// - stil Vinted: search bar cu placeholder contextual ("Căutare în «Rochii»")
// - săgeată back pentru navigare înapoi nivel cu nivel
// - theme-aware

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchItems } from "../services/itemsService";
import {
  fetchFavoritesCountsForItems,
  fetchFavoritesMapForUser,
  toggleFavorite,
} from "../services/favoritesService";

import ItemCardDarkProduct from "../components/ItemCardDarkProduct";
import ItemCardLightWarm from "../components/ItemCardLightWarm";

import { ThemeContext } from "../theme/ThemeProvider";

import {
  CATEGORY_TREE,
  getNodesByPath,
  getPathLabels,
} from "../constants/categoryTree";

// ─── Ilustrații categorii ───────────────────────────────────────
const MAIN_IMAGES = {
  women: require("../../assets/categories/category-women.png"),
  men: require("../../assets/categories/category-men.png"),
  kids: require("../../assets/categories/category-kids.png"),
};

const SUB_IMAGES = {
  "women-clothing": require("../../assets/categories/category-women-clothing.png"),
  "women-shoes": require("../../assets/categories/category-women-shoes.png"),
  "women-bags": require("../../assets/categories/category-women-bags.png"),
  "women-accessories": require("../../assets/categories/category-women-accessories.png"),
  "men-clothing": require("../../assets/categories/category-men-clothing.png"),
  "men-shoes": require("../../assets/categories/category-men-shoes.png"),
  "men-accessories": require("../../assets/categories/category-men-accessories.png"),
  "kids-girls-clothing": require("../../assets/categories/category-kids-girls-clothing.png"),
  "kids-boys-clothing": require("../../assets/categories/category-kids-boys-clothing.png"),
  "kids-shoes": require("../../assets/categories/category-kids-shoes.png"),
  "kids-accessories": require("../../assets/categories/category-kids-accessories.png"),
};

// ─── Helpers ────────────────────────────────────────────────────
function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
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

function normalizeCountsMap(rawMap, ids = []) {
  const next = {};
  ids.forEach((id) => {
    next[String(id)] = Number(pickById(rawMap, id) ?? 0);
  });
  return next;
}

function normalizeBoolMap(rawMap, ids = []) {
  const next = {};
  ids.forEach((id) => {
    next[String(id)] = Boolean(pickById(rawMap, id));
  });
  return next;
}

function getPrimaryCategoryLabel(category) {
  const value = String(category || "").trim();
  if (!value) return "";
  const parts = value
    .split(">")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts[0] || value;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Componenta principală ──────────────────────────────────────
export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { scheme, tokens } = useContext(ThemeContext);
  const isDark = scheme === "dark";

  // ── Navigare categorii ──
  const [navPath, setNavPath] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Items & Favs ──
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favCounts, setFavCounts] = useState({});
  const [myFavMap, setMyFavMap] = useState({});

  const listRef = useRef(null);
  const currentUserId = session?.user?.id ? String(session.user.id) : null;
  const vacationModeEnabled = Boolean(
    session?.user?.user_metadata?.vacation_mode_enabled,
  );

  // ── Auth ──
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

  // ── Fetch items ──
  const refreshFavsForList = useCallback(
    async (list) => {
      try {
        const arr = Array.isArray(list) ? list : [];
        const ids = arr.map((it) => String(it.id));
        if (!ids.length) {
          setFavCounts({});
          setMyFavMap({});
          return;
        }
        const userId = session?.user?.id;
        const [countsRaw, mineRaw] = await Promise.all([
          fetchFavoritesCountsForItems(ids),
          userId ? fetchFavoritesMapForUser(userId, ids) : Promise.resolve({}),
        ]);
        setFavCounts(normalizeCountsMap(countsRaw, ids));
        setMyFavMap(normalizeBoolMap(mineRaw, ids));
      } catch (err) {
        console.log("⚠️ refreshFavsForList warning:", err);
      }
    },
    [session?.user?.id],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchItems();
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      await refreshFavsForList(list);
    } catch (err) {
      console.log("❌ loadItems error:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [refreshFavsForList]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
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
        setFavCounts((prev) => ({
          ...prev,
          [sid]: Number(pickById(countsRaw, sid) ?? 0),
        }));
        setMyFavMap((prev) => ({
          ...prev,
          [sid]: Boolean(pickById(mineRaw, sid)),
        }));
      } catch (err) {
        console.log("⚠️ refreshSingleFav warning:", err);
      }
    },
    [session?.user?.id],
  );

  // ── Categorii curente din tree ──
  const currentNodes = useMemo(
    () => getNodesByPath(CATEGORY_TREE, navPath),
    [navPath],
  );
  const currentLabels = useMemo(
    () => getPathLabels(CATEGORY_TREE, navPath),
    [navPath],
  );
  const currentDepth = navPath.length;

  // ── Placeholder contextual pentru search bar ──
  const searchPlaceholder = useMemo(() => {
    if (activeFilter) {
      return `Căutare în „${activeFilter.leafLabel}"`;
    }
    if (currentLabels.length > 0) {
      const lastLabel = currentLabels[currentLabels.length - 1];
      return `Căutare în „${lastLabel}"`;
    }
    return "Caută articole sau membri";
  }, [activeFilter, currentLabels]);

  // ── Filtered items ──
  const filteredItems = useMemo(() => {
    let base = Array.isArray(items) ? items : [];

    if (vacationModeEnabled && currentUserId) {
      base = base.filter((it) => String(it?.user_id || "") !== currentUserId);
    }

    if (activeFilter) {
      const filterLabel = activeFilter.pathLabel.toLowerCase();
      base = base.filter((it) => {
        const cat = String(it.category || "").toLowerCase();
        return cat === filterLabel;
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base.filter((it) => {
        const t = String(it.title || "").toLowerCase();
        const d = String(it.description || "").toLowerCase();
        const c = String(it.category || "").toLowerCase();
        return t.includes(q) || d.includes(q) || c.includes(q);
      });
    }

    return base;
  }, [items, activeFilter, searchQuery, vacationModeEnabled, currentUserId]);

  // ── Handlers ──
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

      setMyFavMap((prev) => ({ ...prev, [itemId]: !wasFav }));
      setFavCounts((prev) => ({
        ...prev,
        [itemId]: Math.max(0, Number(prev?.[itemId] || 0) + (wasFav ? -1 : 1)),
      }));

      try {
        await toggleFavorite({ userId, itemId, isFav: wasFav });
        await refreshSingleFav(itemId);
      } catch (err) {
        console.log("❌ toggleFavorite error:", err);
        setMyFavMap((prev) => ({ ...prev, [itemId]: wasFav }));
        setFavCounts((prev) => ({
          ...prev,
          [itemId]: Math.max(
            0,
            Number(prev?.[itemId] || 0) + (wasFav ? 1 : -1),
          ),
        }));
      }
    },
    [session?.user?.id, myFavMap, navigation, refreshSingleFav],
  );

  const onNavigateInto = useCallback((nodeKey) => {
    setNavPath((prev) => [...prev, nodeKey]);
  }, []);

  const onGoBack = useCallback(() => {
    if (activeFilter) {
      // Înapoi de la rezultate la nivelul leaf-urilor
      setActiveFilter(null);
      setSearchQuery("");
    } else if (navPath.length > 0) {
      // Un nivel sus în categorii
      setNavPath((prev) => prev.slice(0, -1));
    }
  }, [activeFilter, navPath]);

  const onSelectLeaf = useCallback(
    (node) => {
      const pathKeys = [...navPath, node.key];
      const labels = getPathLabels(CATEGORY_TREE, pathKeys);
      setActiveFilter({
        pathKeys,
        pathLabel: labels.join(" > "),
        leafLabel: node.label,
      });
    },
    [navPath],
  );

  const onBackToCategories = useCallback(() => {
    setActiveFilter(null);
    setSearchQuery("");
    setNavPath([]);
  }, []);

  const onClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // ── Render helpers ──
  const getImages = useCallback((item) => {
    const arr = item?.images || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }, []);

  const renderDots = useCallback((images) => {
    if (!Array.isArray(images) || images.length <= 1) return null;
    const max = Math.min(images.length, 6);
    const centerIndex = (max - 1) / 2;
    return (
      <View style={localStyles.dotsWrap} pointerEvents="none">
        {Array.from({ length: max }).map((_, i) => {
          const distance = Math.abs(i - centerIndex);
          let size = 4;
          if (distance < 0.5) size = 8;
          else if (distance < 1.5) size = 6.5;
          else if (distance < 2.5) size = 5.2;
          return (
            <View
              key={i}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor:
                  i === 0 ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.46)",
              }}
            />
          );
        })}
      </View>
    );
  }, []);

  const GAP = isDark ? 16 : 12;
  const H_PADDING = 14;

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
      const itemForCard = {
        ...item,
        category: getPrimaryCategoryLabel(item?.category),
      };

      if (isDark) {
        return (
          <ItemCardDarkProduct
            item={itemForCard}
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
          item={itemForCard}
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

  // ── Styles tokens ──
  const S = useMemo(() => {
    const bg = pickTok(tokens, "bg", "#0B1220");
    const text = pickTok(tokens, "text", "#E5E7EB");
    const muted = pickTok(tokens, "muted", "#9CA3AF");
    const border = pickTok(tokens, "border", "rgba(255,255,255,0.10)");
    const card = pickTok(tokens, "card", "rgba(255,255,255,0.10)");
    const primary = pickTok(tokens, "primary", "#2EC4B6");
    return { bg, text, muted, border, card, primary };
  }, [tokens]);

  const isSearching = searchQuery.trim().length > 0;
  const showResults = activeFilter !== null || isSearching;
  const showBackArrow = currentDepth > 0 || activeFilter !== null;

  return (
    <View style={[localStyles.screen, { backgroundColor: S.bg }]}>
      {/* ── Search bar cu back arrow ── */}
      <View
        style={[
          localStyles.topArea,
          { paddingTop: Math.max(insets.top, 10), backgroundColor: S.bg },
        ]}
      >
        <View style={localStyles.searchWrapper}>
          {showBackArrow && (
            <TouchableOpacity
              onPress={onGoBack}
              style={localStyles.backArrow}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={S.text} />
            </TouchableOpacity>
          )}

          <View
            style={[
              localStyles.searchRow,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : S.card,
                borderColor: S.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={isDark ? "rgba(255,255,255,0.85)" : tokens.muted}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={isDark ? "rgba(255,255,255,0.55)" : S.muted}
              style={[
                localStyles.searchInput,
                { color: isDark ? "rgba(255,255,255,0.92)" : S.text },
              ]}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={onClearSearch}
                style={localStyles.clearBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={isDark ? "rgba(255,255,255,0.5)" : S.muted}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── Conținut principal ── */}
      {showResults ? (
        loading ? (
          <View style={localStyles.center}>
            <ActivityIndicator size="large" color={S.primary} />
            <Text style={[localStyles.loadingText, { color: S.muted }]}>
              Se încarcă…
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(it) => String(it.id)}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.listContent}
            columnWrapperStyle={{
              paddingHorizontal: H_PADDING,
              gap: GAP,
            }}
            ListEmptyComponent={
              <View style={localStyles.center}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={S.muted}
                  style={{ marginBottom: 12, opacity: 0.5 }}
                />
                <Text style={[localStyles.emptyText, { color: S.muted }]}>
                  {activeFilter
                    ? `Niciun produs în ${activeFilter.leafLabel}`
                    : "Niciun rezultat găsit."}
                </Text>
                <TouchableOpacity
                  onPress={onBackToCategories}
                  style={[localStyles.backToCatBtn, { borderColor: S.border }]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[localStyles.backToCatText, { color: S.primary }]}
                  >
                    ← Înapoi la categorii
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            localStyles.categoriesContent,
            { paddingBottom: Math.max(insets.bottom, 18) + 16 },
          ]}
        >
          {currentDepth === 0 &&
            currentNodes.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  localStyles.mainCard,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : S.card,
                    borderColor: S.border,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => onNavigateInto(cat.key)}
              >
                <View style={localStyles.mainCardInner}>
                  <Text style={[localStyles.mainCardLabel, { color: S.text }]}>
                    {cat.label}
                  </Text>
                  {MAIN_IMAGES[cat.key] && (
                    <Image
                      source={MAIN_IMAGES[cat.key]}
                      style={localStyles.mainCardImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <View style={localStyles.mainCardChevron}>
                  <Ionicons name="chevron-forward" size={20} color={S.muted} />
                </View>
              </TouchableOpacity>
            ))}

          {currentDepth === 1 && (
            <View style={localStyles.subGrid}>
              {currentNodes.map((sub) => (
                <TouchableOpacity
                  key={sub.key}
                  style={[
                    localStyles.subCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : S.card,
                      borderColor: S.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => onNavigateInto(sub.key)}
                >
                  {SUB_IMAGES[sub.key] && (
                    <Image
                      source={SUB_IMAGES[sub.key]}
                      style={localStyles.subCardImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text
                    style={[localStyles.subCardLabel, { color: S.text }]}
                    numberOfLines={2}
                  >
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {currentDepth >= 2 &&
            currentNodes.map((leaf, idx) => (
              <TouchableOpacity
                key={leaf.key}
                style={[
                  localStyles.leafRow,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : S.card,
                    borderColor: S.border,
                    marginBottom: idx === currentNodes.length - 1 ? 0 : 10,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (
                    Array.isArray(leaf.children) &&
                    leaf.children.length > 0
                  ) {
                    onNavigateInto(leaf.key);
                  } else {
                    onSelectLeaf(leaf);
                  }
                }}
              >
                <Text style={[localStyles.leafLabel, { color: S.text }]}>
                  {leaf.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={S.muted} />
              </TouchableOpacity>
            ))}
        </ScrollView>
      )}

      <View style={{ height: Math.max(insets.bottom, 0) }} />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  screen: { flex: 1 },
  topArea: { paddingBottom: 8 },

  // Search bar wrapper cu back arrow
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  backArrow: {
    width: 36,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  searchRow: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: { fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "700" },
  clearBtn: { padding: 4, marginLeft: 4 },

  // Categorii container
  categoriesContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  // ── Nivel 0: Carduri principale ──
  mainCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  mainCardInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 110,
    paddingLeft: 20,
  },
  mainCardLabel: {
    fontSize: 22,
    fontWeight: "900",
  },
  mainCardImage: {
    width: 100,
    height: 100,
  },
  mainCardChevron: {
    paddingRight: 14,
  },

  // ── Nivel 1: Subcategorii grid ──
  subGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  subCard: {
    width: (SCREEN_WIDTH - 28 - 10) / 2,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  subCardImage: {
    width: 72,
    height: 72,
    marginBottom: 8,
  },
  subCardLabel: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  // ── Nivel 2: Categorii finale (listă) ──
  leafRow: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  leafLabel: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },

  // Rezultate
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: { marginTop: 10, fontWeight: "800" },
  emptyText: {
    fontWeight: "800",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },

  backToCatBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  backToCatText: {
    fontWeight: "800",
    fontSize: 14,
  },
});
