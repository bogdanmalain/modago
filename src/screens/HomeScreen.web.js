// src/screens/HomeScreen.web.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  ImageBackground,
  Alert,
} from "react-native";

import WelcomeScreen from "./WelcomeScreen";
import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import {
  fetchItems,
  fetchFavoritesCounts,
  fetchMyFavoritesMap,
  toggleFavorite,
} from "../services/itemsService";

const HERO_IMG = require("../../assets/welcome/1.jpg");

export default function HomeScreen({ navigation, query }) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const [session, setSession] = useState(null);
  const isLoggedIn = !!session?.user;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // hover (web)
  const [hoveredId, setHoveredId] = useState(null);

  // favorites state
  const [favCounts, setFavCounts] = useState({}); // { [itemId]: number }
  const [myFavMap, setMyFavMap] = useState({}); // { [itemId]: true/false }

  // -----------------------------
  // Container 80% (aliniat cu header)
  // -----------------------------
  const WEB_MAX_W = 1360;
  const WEB_CONTAINER_RATIO = 0.8;

  const contentWidth = useMemo(() => {
    if (!isWeb) return width;
    const target = Math.floor(width * WEB_CONTAINER_RATIO);
    return Math.min(target, WEB_MAX_W);
  }, [isWeb, width]);

  // -----------------------------
  // Grid responsive
  // -----------------------------
  const numColumns = useMemo(() => {
    if (!isWeb) return width >= 420 ? 3 : 2;
    if (width >= 1200) return 5;
    if (width >= 1100) return 4;
    if (width >= 900) return 3;
    return 2;
  }, [isWeb, width]);

  const GAP = 18;

  const CARD_W = useMemo(() => {
    const usable = contentWidth - GAP * (numColumns - 1);
    return Math.max(180, Math.floor(usable / numColumns));
  }, [contentWidth, numColumns]);

  const IMG_H = useMemo(() => Math.floor(CARD_W * 1.05), [CARD_W]);
  const CARD_MIN_H = useMemo(() => IMG_H + 110, [IMG_H]);

  // -----------------------------
  // Session
  // -----------------------------
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

  // -----------------------------
  // Helpers images (robust)
  // -----------------------------
  const normalizeImages = useCallback((item) => {
    // Accept:
    // - item.images array
    // - item.images string JSON
    // - item.image_url (fallback)
    if (!item) return [];

    let imgs = [];

    if (Array.isArray(item.images)) {
      imgs = item.images;
    } else if (typeof item.images === "string") {
      try {
        const parsed = JSON.parse(item.images);
        if (Array.isArray(parsed)) imgs = parsed;
      } catch {
        // dacă e string simplu url
        if (item.images.startsWith("http")) imgs = [item.images];
      }
    } else if (item.image_url && typeof item.image_url === "string") {
      imgs = [item.image_url];
    }

    // curățare + fix "blob:http://localhost..." (cazul tău din EditScreen)
    imgs = imgs
      .filter(Boolean)
      .map((u) => String(u).trim())
      .filter((u) => u && u !== "null" && u !== "undefined")
      .filter((u) => !u.startsWith("blob:http")); // blob url NU e public

    return imgs;
  }, []);

  const getMainImage = useCallback(
    (item) => {
      const imgs = normalizeImages(item);
      return imgs[0] || null;
    },
    [normalizeImages],
  );

  // -----------------------------
  // Load items + favorites
  // -----------------------------
  const loadItems = useCallback(async () => {
    setErrorMsg("");
    setLoading(true);

    try {
      const data = await fetchItems();
      const list = Array.isArray(data) ? data : [];
      setItems(list);

      // favorites (count + my favorites)
      const ids = list.map((x) => x.id).filter(Boolean);

      const counts = await fetchFavoritesCounts(ids);
      setFavCounts(counts);

      if (session?.user?.id) {
        const myMap = await fetchMyFavoritesMap(session.user.id, ids);
        setMyFavMap(myMap);
      } else {
        setMyFavMap({});
      }
    } catch (err) {
      setErrorMsg(err?.message || "Eroare la încărcare produse.");
      setItems([]);
      setFavCounts({});
      setMyFavMap({});
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadItems);
    loadItems();
    return unsub;
  }, [navigation, loadItems]);

  // -----------------------------
  // Filtrare
  // -----------------------------
  const filteredItems = useMemo(() => {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const t = (it.title || "").toLowerCase();
      const d = (it.description || "").toLowerCase();
      const c = (it.category || "").toLowerCase();
      return t.includes(q) || d.includes(q) || c.includes(q);
    });
  }, [items, query]);

  // -----------------------------
  // HERO
  // -----------------------------
  const onSellNow = useCallback(() => {
    if (isLoggedIn) navigation.navigate(ROUTES.AddItem);
    else navigation.navigate(ROUTES.Login);
  }, [isLoggedIn, navigation]);

  const onHowItWorks = useCallback(() => {
    Alert.alert("În curând", "Pagina „Cum funcționează”.");
  }, []);

  // Gate mobil (păstrat)
  if (!isWeb && !isLoggedIn) {
    return <WelcomeScreen navigation={navigation} />;
  }

  const HeroWeb = (
    <View style={styles.heroOuter}>
      <ImageBackground
        source={HERO_IMG}
        style={styles.heroBg}
        imageStyle={styles.heroBgImg}
      >
        <View style={styles.heroOverlay} pointerEvents="none" />

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            Ești gata să-ți eliberezi{"\n"}garderoba?
          </Text>

          <TouchableOpacity
            style={styles.heroPrimaryBtn}
            onPress={onSellNow}
            activeOpacity={0.9}
          >
            <Text style={styles.heroPrimaryText}>Vinde acum</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroLinkBtn}
            onPress={onHowItWorks}
            activeOpacity={0.9}
          >
            <Text style={styles.heroLinkText}>Află cum funcționează</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );

  // Dots
  const Dots = ({ count }) => {
    const dotsCount = Math.min(count, 6);
    return (
      <View style={styles.dotsWrap} pointerEvents="none">
        {Array.from({ length: dotsCount }).map((_, idx) => (
          <View key={idx} style={styles.dot} />
        ))}
      </View>
    );
  };

  // Favorite click
  const onPressFav = useCallback(
    async (itemId) => {
      if (!session?.user?.id) {
        Alert.alert(
          "Login necesar",
          "Trebuie să te autentifici ca să salvezi la favorite.",
        );
        navigation.navigate(ROUTES.Login);
        return;
      }

      const userId = session.user.id;
      const isFav = !!myFavMap[itemId];

      // optimistic UI
      setMyFavMap((prev) => ({ ...prev, [itemId]: !isFav }));
      setFavCounts((prev) => ({
        ...prev,
        [itemId]: Math.max(0, (prev[itemId] || 0) + (isFav ? -1 : 1)),
      }));

      try {
        await toggleFavorite({ userId, itemId, isFav });
      } catch (e) {
        // rollback
        setMyFavMap((prev) => ({ ...prev, [itemId]: isFav }));
        setFavCounts((prev) => ({
          ...prev,
          [itemId]: Math.max(0, (prev[itemId] || 0) + (isFav ? 1 : -1)),
        }));
        Alert.alert("Eroare", e?.message || "Nu s-a putut salva la favorite.");
      }
    },
    [session?.user?.id, myFavMap, navigation],
  );

  // Render produs
  const renderItem = ({ item }) => {
    const img = getMainImage(item);
    const imgs = normalizeImages(item);
    const hasManyImages = imgs.length > 1;
    const isHovered = hoveredId === item.id;

    const count = favCounts[item.id] || 0;
    const isFav = !!myFavMap[item.id];

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            width: CARD_W,
            minHeight: CARD_MIN_H,
            marginBottom: GAP,
            transform: isHovered ? [{ translateY: -3 }] : [{ translateY: 0 }],
            transitionProperty: "transform, box-shadow",
            transitionDuration: "180ms",
            transitionTimingFunction: "ease",
            boxShadow: isHovered
              ? "0px 18px 35px rgba(0,0,0,0.14)"
              : "0px 10px 18px rgba(0,0,0,0.08)",
          },
        ]}
        activeOpacity={0.95}
        onPress={() => navigation.navigate(ROUTES.ItemDetails, { item })}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <View style={[styles.imageBox, { height: IMG_H }]}>
          {img ? (
            <Image
              source={{ uri: img }}
              style={[
                styles.mainImage,
                {
                  transform: isHovered ? [{ scale: 1.03 }] : [{ scale: 1 }],
                  transitionProperty: "transform",
                  transitionDuration: "220ms",
                  transitionTimingFunction: "ease",
                },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>Fără imagine</Text>
            </View>
          )}

          {hasManyImages ? <Dots count={imgs.length} /> : null}

          {/* ✅ FAVORITE: dreapta-jos */}
          <TouchableOpacity
            style={styles.favBadge}
            activeOpacity={0.9}
            onPress={() => onPressFav(item.id)}
          >
            <Text style={styles.favIcon}>{isFav ? "♥" : "♡"}</Text>
            <Text style={styles.favCount}>{count}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>

          <Text style={styles.price}>{item.price} lei</Text>

          {!!item.category && (
            <Text numberOfLines={1} style={styles.meta}>
              {item.category}
            </Text>
          )}

          <Text numberOfLines={1} style={styles.desc}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const columnWrapperStyle = useMemo(() => {
    if (numColumns <= 1) return null;
    return {
      width: contentWidth,
      alignSelf: "center",
      justifyContent: "flex-start",
      gap: GAP,
    };
  }, [numColumns, contentWidth]);

  return (
    <View style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(i) => String(i.id)}
          numColumns={numColumns}
          ListHeaderComponent={HeroWeb}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columnWrapperStyle}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },

  // HERO
  heroOuter: { width: "100%", paddingBottom: 26 },
  heroBg: { width: "100%", height: 420, justifyContent: "center" },
  heroBgImg: {},
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  heroCard: {
    width: 420,
    maxWidth: "92%",
    marginLeft: 170,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 26,
    paddingHorizontal: 30,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
    marginBottom: 22,
  },

  heroPrimaryBtn: {
    height: 52,
    backgroundColor: "#BEF574",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPrimaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  heroLinkBtn: { marginTop: 18, alignItems: "center" },
  heroLinkText: { color: "#0B69FF", fontWeight: "900", fontSize: 16 },

  // LIST
  listContent: { paddingTop: 0, paddingBottom: 44 },

  // CARD
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
  },

  imageBox: {
    backgroundColor: "#eee",
    position: "relative",
    overflow: "hidden",
  },
  mainImage: { width: "100%", height: "100%" },
  noImage: { height: "100%", alignItems: "center", justifyContent: "center" },
  noImageText: { color: "#777", fontWeight: "700" },

  // dots
  dotsWrap: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  // ✅ favorite badge
  favBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    boxShadow: "0px 8px 18px rgba(0,0,0,0.15)",
  },
  favIcon: { fontSize: 18, fontWeight: "900" },
  favCount: { fontWeight: "900", color: "#111" },

  // text
  cardBody: { padding: 10 },
  title: { fontWeight: "900", fontSize: 14 },
  price: { color: "#0B69FF", fontWeight: "900", marginTop: 4, fontSize: 13 },
  meta: { marginTop: 4, fontSize: 12, color: "#777", fontWeight: "700" },
  desc: { marginTop: 6, fontSize: 12, color: "#666" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  errorBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 50, 50, 0.12)",
    borderRadius: 12,
  },
  errorText: { color: "#b00020", fontWeight: "800" },
});
