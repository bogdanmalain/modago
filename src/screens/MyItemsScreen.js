// src/screens/MyItemsScreen.js
// ============================================
// COMPONENTĂ: MyItemsScreen
// MODIFICĂRI:
// - păstrează layout-ul pe listă verticală
// - FIX: cardul are înălțime fixă, ca să nu se mai rupă layout-ul
// - imaginea are aceeași înălțime ca cardul
// - favoritele sunt mutate peste imagine, în dreapta jos
// - s-a redus spațiul gol din card
// - titlu / preț / categorie păstrează stilul din Home
// - butonul „•••” și pill-ul „Activ” păstrează materia tip back button
// - bottom sheet owner păstrat:
//    • Editare = primary
//    • Anulează = primary
//    • Ștergere = danger
// ============================================

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchMyItems } from "../services/itemsService";
import {
  fetchFavoritesCountsForItems,
  fetchFavoritesMapForUser,
  toggleFavorite,
} from "../services/favoritesService";
import { ThemeContext } from "../theme/ThemeProvider";
import ScreenHeader from "../components/ScreenHeader";

const CARD_H = 164;
const IMAGE_W = 170;
const FAV_ICON = 44;
const BADGE_MIN = 22;

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function getImages(item) {
  const arr = item?.images || [];
  return Array.isArray(arr) ? arr.filter(Boolean) : [];
}

function getMainImage(item) {
  if (item?.image_url) return item.image_url;

  const images = getImages(item);
  if (images.length > 0) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
    if (first?.uri) return first.uri;
  }

  if (Array.isArray(item?.image_urls) && item.image_urls.length > 0) {
    return item.image_urls[0];
  }

  return null;
}

function formatPrice(price) {
  if (price === undefined || price === null || price === "") return "—";
  const numeric = Number(price);
  if (Number.isNaN(numeric)) return String(price);
  return `${numeric} lei`;
}

export default function MyItemsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const themeCtx = useContext(ThemeContext);

  const tokens = themeCtx?.tokens || {};
  const scheme = themeCtx?.scheme || themeCtx?.theme || "dark";
  const isDark = scheme === "dark";

  const [session, setSession] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState([]);
  const [favCounts, setFavCounts] = useState({});
  const [myFavMap, setMyFavMap] = useState({});

  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const colors = useMemo(() => {
    const bg = pickTok(tokens, "bg", isDark ? "#071224" : "#F7F8FA");
    const card = pickTok(tokens, "card", isDark ? "#0B1730" : "#FFFFFF");
    const text = pickTok(tokens, "text", isDark ? "#F3F5F7" : "#111827");
    const muted = pickTok(
      tokens,
      "textMuted",
      pickTok(tokens, "muted", isDark ? "#9AA4B2" : "#6B7280"),
    );
    const border = pickTok(tokens, "border", isDark ? "#223041" : "#E5E7EB");
    const primary = pickTok(tokens, "primary", "#43C6DB");
    const danger = pickTok(tokens, "danger", "#EF4444");
    const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");

    return {
      bg,
      card,
      text,
      muted,
      border,
      primary,
      danger,
      onPrimary,
      shadow: "#000000",
      overlay: "rgba(0,0,0,0.48)",

      imageBg: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6",

      glassBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.92)",
      glassBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
      glassText: isDark ? "rgba(255,255,255,0.90)" : "rgba(0,0,0,0.75)",

      categoryBg: `${primary}30`,
      categoryBorder: `${primary}50`,
      categoryText: text,

      sheetBg: card,
      sheetHandle: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",

      glossyBg: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.78)",
      glossyBorder: isDark
        ? "rgba(255,255,255,0.14)"
        : "rgba(255,255,255,0.92)",
    };
  }, [tokens, isDark]);

  const styles = useMemo(
    () => createStyles({ colors, insets, isDark }),
    [colors, insets, isDark],
  );

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
          fetchFavoritesCountsForItems(ids),
          userId ? fetchFavoritesMapForUser(userId, ids) : Promise.resolve({}),
        ]);

        setFavCounts(counts || {});
        setMyFavMap(mine || {});
      } catch {
        setFavCounts({});
        setMyFavMap({});
      }
    },
    [session?.user?.id],
  );

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      const currentUserId = user?.id ?? null;
      if (!currentUserId) {
        setItems([]);
        setFavCounts({});
        setMyFavMap({});
        return;
      }

      const data = await fetchMyItems(currentUserId);
      const list = Array.isArray(data) ? data : [];

      setItems(list);
      await refreshFavsForList(list);
    } catch (err) {
      console.error("MyItemsScreen loadItems error:", err);
      Alert.alert("Eroare", "Nu am putut încărca anunțurile tale.");
      setItems([]);
      setFavCounts({});
      setMyFavMap({});
    } finally {
      setLoading(false);
    }
  }, [refreshFavsForList]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      if (items?.length > 0) refreshFavsForList(items);
      else loadItems();
    }, [items, refreshFavsForList, loadItems]),
  );

  useEffect(() => {
    const deletedItemId = route?.params?.deletedItemId;
    if (!deletedItemId) return;

    setItems((prev) =>
      Array.isArray(prev)
        ? prev.filter((it) => String(it?.id) !== String(deletedItemId))
        : [],
    );

    setFavCounts((prev) => {
      const next = { ...(prev || {}) };
      delete next[String(deletedItemId)];
      return next;
    });

    setMyFavMap((prev) => {
      const next = { ...(prev || {}) };
      delete next[String(deletedItemId)];
      return next;
    });

    navigation.setParams?.({ deletedItemId: undefined });
  }, [navigation, route?.params?.deletedItemId]);

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

      navigation.setParams?.({
        updatedItem: undefined,
        updatedItemId: undefined,
        updatedAt: undefined,
      });
      return;
    }

    if (updatedItemId) {
      loadItems().finally(() => {
        navigation.setParams?.({
          updatedItem: undefined,
          updatedItemId: undefined,
          updatedAt: undefined,
        });
      });
    }
  }, [
    route?.params?.updatedItem,
    route?.params?.updatedItemId,
    route?.params?.updatedAt,
    navigation,
    loadItems,
  ]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadItems();
    } finally {
      setRefreshing(false);
    }
  }, [loadItems]);

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
    [isDark, styles],
  );

  const onToggleFav = useCallback(
    async (e, item) => {
      e?.stopPropagation?.();

      const userId = session?.user?.id;
      if (!userId) {
        navigation.navigate(ROUTES.Login || "Login");
        return;
      }

      const itemId = String(item?.id);
      const isFav = !!myFavMap[itemId];

      setMyFavMap((prev) => ({ ...prev, [itemId]: !isFav }));
      setFavCounts((prev) => ({
        ...prev,
        [itemId]: Math.max(0, (prev[itemId] || 0) + (isFav ? -1 : 1)),
      }));

      try {
        await toggleFavorite({ userId, itemId, isFav });
      } catch (err) {
        setMyFavMap((prev) => ({ ...prev, [itemId]: isFav }));
        setFavCounts((prev) => ({
          ...prev,
          [itemId]: Math.max(0, (prev[itemId] || 0) + (isFav ? 1 : -1)),
        }));
        console.log("❌ MyItems toggleFavorite error:", err);
      }
    },
    [session?.user?.id, myFavMap, navigation],
  );

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
    setSelectedItem(null);
  }, []);

  const openMenuForItem = useCallback((item) => {
    setSelectedItem(item);
    setMenuVisible(true);
  }, []);

  const goToDetails = useCallback(
    (item) => {
      if (!item) return;

      navigation.navigate(ROUTES.ItemDetails || "ItemDetails", {
        itemId: item.id,
        item,
        fromMyItems: true,
      });
    },
    [navigation],
  );

  const onEditItem = useCallback(() => {
    if (!selectedItem) return;

    closeMenu();

    navigation.navigate(ROUTES.EditItem || "EditItem", {
      item: selectedItem,
    });
  }, [closeMenu, navigation, selectedItem]);

  const deleteItemNow = useCallback(
    async (item) => {
      if (!item?.id) return;

      try {
        setDeletingId(item.id);

        const { error } = await supabase
          .from("items")
          .delete()
          .eq("id", item.id);
        if (error) throw error;

        setItems((prev) =>
          Array.isArray(prev)
            ? prev.filter((it) => String(it?.id) !== String(item.id))
            : [],
        );

        setFavCounts((prev) => {
          const next = { ...(prev || {}) };
          delete next[String(item.id)];
          return next;
        });

        setMyFavMap((prev) => {
          const next = { ...(prev || {}) };
          delete next[String(item.id)];
          return next;
        });

        closeMenu();
      } catch (err) {
        console.error("MyItemsScreen delete item error:", err);
        Alert.alert("Eroare", "Nu am putut șterge anunțul.");
      } finally {
        setDeletingId(null);
      }
    },
    [closeMenu],
  );

  const onDeleteItem = useCallback(() => {
    if (!selectedItem) return;

    Alert.alert(
      "Ștergere anunț",
      "Sigur vrei să ștergi acest anunț?",
      [
        { text: "Renunță", style: "cancel" },
        {
          text: "Șterge",
          style: "destructive",
          onPress: () => deleteItemNow(selectedItem),
        },
      ],
      { cancelable: true },
    );
  }, [deleteItemNow, selectedItem]);

  const renderItem = useCallback(
    ({ item }) => {
      const images = getImages(item);
      const mainImage = getMainImage(item);
      const itemId = String(item?.id);
      const favCount = favCounts[itemId] || 0;
      const isFav = !!myFavMap[itemId];
      const dots = renderDots(images);

      const countText = favCount > 99 ? "99+" : String(favCount || 0);
      const dynamicBadgeWidth =
        countText.length === 1
          ? BADGE_MIN
          : countText.length === 2
            ? BADGE_MIN + 6
            : BADGE_MIN + 12;

      return (
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.card}
          onPress={() => goToDetails(item)}
        >
          <View style={styles.imageWrap}>
            {mainImage ? (
              <Image
                source={{ uri: mainImage }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Fără poză</Text>
              </View>
            )}

            {dots}

            <View style={styles.favOverlay}>
              <View style={{ position: "relative" }}>
                <Pressable
                  onPress={(e) => onToggleFav(e, item)}
                  hitSlop={8}
                  style={({ pressed }) =>
                    pressed && { transform: [{ scale: 0.95 }] }
                  }
                >
                  <View style={styles.favCircle}>
                    <Text
                      style={[
                        styles.favHeart,
                        { color: isFav ? colors.danger : colors.muted },
                      ]}
                    >
                      {isFav ? "❤" : "♡"}
                    </Text>
                  </View>
                </Pressable>

                {favCount > 0 ? (
                  <View
                    style={[styles.countPill, { minWidth: dynamicBadgeWidth }]}
                  >
                    <Text style={styles.countText}>{countText}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.topRow}>
              <View style={styles.titleCol}>
                <Text numberOfLines={2} style={styles.title}>
                  {item?.title || "Fără titlu"}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => openMenuForItem(item)}
                style={styles.ownerCircleBtn}
              >
                <Text style={styles.ownerCircleText}>•••</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.price}>{formatPrice(item?.price)}</Text>

            <View style={styles.bottomRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{item?.category || "—"}</Text>
              </View>

              <View style={styles.rightBottomCol}>
                <View style={styles.ownerStatusPill}>
                  <Text style={styles.ownerStatusText}>
                    {item?.is_sold ? "Vândut" : item?.status || "Activ"}
                  </Text>
                </View>
              </View>
            </View>

            {String(deletingId) === String(item?.id) ? (
              <View style={styles.deletingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.deletingText}>Se șterge...</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [
      colors.danger,
      colors.muted,
      colors.primary,
      deletingId,
      favCounts,
      goToDetails,
      myFavMap,
      onToggleFav,
      openMenuForItem,
      renderDots,
      styles,
    ],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="Anunțurile mele"
          onBack={() => navigation.navigate(ROUTES.Profile || "Profile")}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Anunțurile mele"
        onBack={() => navigation.navigate(ROUTES.Profile || "Profile")}
      />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Nu ai anunțuri încă</Text>
            <Text style={styles.emptyText}>
              Când adaugi produse în ModaGo, vor apărea aici.
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.emptyBtn}
              onPress={() => navigation.navigate(ROUTES.AddItem || "AddItem")}
            >
              <Text style={styles.emptyBtnText}>Adaugă un anunț</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <Pressable style={styles.menuSheet} onPress={() => {}}>
            <View style={styles.menuHandle} />

            <Text numberOfLines={2} style={styles.menuTitle}>
              {selectedItem?.title || "Acțiuni anunț"}
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.menuActionPrimary}
              onPress={onEditItem}
            >
              <Text style={styles.menuActionPrimaryText}>Editare</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.menuActionDanger}
              onPress={onDeleteItem}
            >
              <Text style={styles.menuActionDangerText}>Ștergere</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.menuActionSecondary}
              onPress={closeMenu}
            >
              <Text style={styles.menuActionSecondaryText}>Anulează</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles({ colors, insets, isDark }) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Math.max(insets.bottom + 20, 28),
    },

    listContentEmpty: {
      flexGrow: 1,
      justifyContent: "center",
    },

    card: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      shadowColor: colors.shadow,
      shadowOpacity: Platform.OS === "ios" ? (isDark ? 0.16 : 0.08) : 0,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: Platform.OS === "android" ? 2 : 0,
      marginBottom: 12,
      height: CARD_H,
    },

    imageWrap: {
      width: IMAGE_W,
      height: CARD_H,
      backgroundColor: colors.imageBg,
      position: "relative",
    },

    image: {
      width: "100%",
      height: "100%",
    },

    imagePlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },

    imagePlaceholderText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
    },

    favOverlay: {
      position: "absolute",
      right: 10,
      bottom: 10,
      zIndex: 20,
    },

    cardContent: {
      flex: 1,
      height: CARD_H,
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: "space-between",
      backgroundColor: colors.card,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },

    titleCol: {
      flex: 1,
      paddingTop: 4,
      paddingRight: 4,
    },

    title: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "900",
    },

    price: {
      marginTop: 2,
      color: colors.primary,
      fontSize: 18,
      fontWeight: "900",
    },

    bottomRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 10,
    },

    categoryPill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: colors.categoryBg,
      borderColor: colors.categoryBorder,
      alignSelf: "flex-start",
    },

    categoryText: {
      color: colors.categoryText,
      fontWeight: "800",
      fontSize: 13,
    },

    rightBottomCol: {
      alignItems: "flex-end",
      justifyContent: "flex-end",
    },

    ownerCircleBtn: {
      width: 56,
      height: 56,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: colors.shadow,
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: isDark ? 3 : 1,
    },

    ownerCircleText: {
      color: colors.glassText,
      fontSize: 20,
      lineHeight: 22,
      fontWeight: "600",
      textAlign: "center",
      includeFontPadding: false,
      letterSpacing: 2,
      marginTop: -2,
    },

    ownerStatusPill: {
      minHeight: 40,
      paddingHorizontal: 16,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },

    ownerStatusText: {
      color: colors.glassText,
      fontSize: 13,
      fontWeight: "800",
    },

    favCircle: {
      width: FAV_ICON,
      height: FAV_ICON,
      borderRadius: FAV_ICON / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      backgroundColor: colors.glassBg,
      borderColor: colors.glassBorder,
    },

    favHeart: {
      fontSize: 20,
      fontWeight: "900",
    },

    countPill: {
      position: "absolute",
      right: -6,
      bottom: -6,
      height: BADGE_MIN,
      paddingHorizontal: 6,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.95)",
    },

    countText: {
      color: colors.onPrimary,
      fontSize: 12,
      fontWeight: "900",
    },

    deletingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },

    deletingText: {
      color: colors.muted,
      fontSize: 12.5,
      fontWeight: "600",
    },

    dotsWrap: {
      position: "absolute",
      bottom: 10,
      left: 10,
      flexDirection: "row",
      gap: 6,
      opacity: 0.95,
    },

    dot: {
      width: 7,
      height: 7,
      borderRadius: 99,
    },

    dotLight: {
      backgroundColor: "rgba(0,0,0,0.22)",
    },

    dotActiveLight: {
      backgroundColor: "rgba(0,0,0,0.62)",
    },

    dotDark: {
      backgroundColor: "rgba(255,255,255,0.35)",
    },

    dotActiveDark: {
      backgroundColor: "rgba(255,255,255,0.95)",
    },

    dotMore: {
      opacity: 0.85,
    },

    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingTop: 60,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
    },

    emptyBtn: {
      marginTop: 18,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
    },

    emptyBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },

    menuSheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: Math.max(insets.bottom + 12, 22),
      borderTopWidth: 1,
      borderColor: colors.border,
    },

    menuHandle: {
      alignSelf: "center",
      width: 46,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.sheetHandle,
      marginBottom: 14,
    },

    menuTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 16,
      paddingHorizontal: 12,
    },

    menuActionPrimary: {
      minHeight: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glossyBg,
      borderWidth: 1,
      borderColor: colors.glossyBorder,
      marginBottom: 12,
      paddingHorizontal: 12,
    },

    menuActionPrimaryText: {
      color: colors.primary,
      fontSize: 17,
      fontWeight: "800",
    },

    menuActionDanger: {
      minHeight: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glossyBg,
      borderWidth: 1,
      borderColor: colors.glossyBorder,
      marginBottom: 12,
      paddingHorizontal: 12,
    },

    menuActionDangerText: {
      color: colors.danger,
      fontSize: 17,
      fontWeight: "900",
    },

    menuActionSecondary: {
      minHeight: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glossyBg,
      borderWidth: 1,
      borderColor: colors.glossyBorder,
      marginBottom: 4,
      paddingHorizontal: 12,
    },

    menuActionSecondaryText: {
      color: colors.primary,
      fontSize: 17,
      fontWeight: "800",
    },
  });
}
