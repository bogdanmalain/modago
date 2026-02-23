// src/screens/FavoritesScreen.js
// MODIFICARE: fetchMyFavoriteItems mutat din itemsService în favoritesService
// -> fetchFavoriteItems (numele nou din favoritesService)
// + adăugat suport theme-aware (tokens) ca restul screen-urilor

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
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchFavoriteItems } from "../services/favoritesService";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function FavoritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const userId = session?.user?.id || null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      setAuthReady(true);

      const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
        setSession(sess ?? null);
      });

      sub = listener?.subscription;
    })();

    return () => sub?.unsubscribe?.();
  }, []);

  const load = useCallback(async () => {
    if (!authReady) return;

    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchFavoriteItems(userId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("❌ Favorites load:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, authReady]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation, load]);

  const goBackSafe = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      const parent = navigation.getParent?.();
      if (parent?.navigate) parent.navigate(ROUTES.Profile);
    }
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }) => {
      const img = Array.isArray(item?.images) ? item.images[0] : null;

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate(ROUTES.ItemDetails, { item })}
          style={S.card}
        >
          <View style={S.imgBox}>
            {img ? (
              <Image source={{ uri: img }} style={S.img} resizeMode="cover" />
            ) : (
              <View style={S.noImg}>
                <Text style={S.noImgText}>Fără imagine</Text>
              </View>
            )}
          </View>

          <View style={S.body}>
            <Text numberOfLines={1} style={S.title}>
              {item?.title || "-"}
            </Text>
            <Text style={S.price}>{item?.price ?? "-"} lei</Text>
            <Text numberOfLines={2} style={S.desc}>
              {item?.description || ""}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, S],
  );

  if (!authReady) {
    return (
      <View style={S.center}>
        <ActivityIndicator />
        <Text style={S.muted}>Se încarcă sesiunea…</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={S.center}>
        <Text style={S.muted}>Trebuie să fii logat ca să vezi favoritele.</Text>
      </View>
    );
  }

  return (
    <View style={[S.screen, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={S.topBar}>
        <Pressable onPress={goBackSafe} style={S.backBtn} hitSlop={12}>
          <Text style={S.backTxt}>←</Text>
        </Pressable>
        <Text style={S.h1}>Favorite</Text>
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator />
          <Text style={S.muted}>Se încarcă…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 14) }}
          ListEmptyComponent={
            <View style={S.center}>
              <Text style={S.muted}>Nu ai favorite încă.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#F4F6F8");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", "#6B7280");
  const primary = pickTok(tokens, "primary", "#2563EB");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const mediaBg = pickTok(tokens, "mediaBg", "#111827");

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg, paddingHorizontal: 14 },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
    },
    backTxt: { fontSize: 22, fontWeight: "900", color: text },
    h1: { fontSize: 22, fontWeight: "900", color: text },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
    },
    muted: {
      marginTop: 8,
      color: muted,
      fontWeight: "700",
      textAlign: "center",
    },

    card: {
      backgroundColor: card,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: border,
    },
    imgBox: { height: 180, backgroundColor: mediaBg },
    img: { width: "100%", height: "100%" },
    noImg: { flex: 1, alignItems: "center", justifyContent: "center" },
    noImgText: { color: onPrimary, fontWeight: "900" },

    body: { padding: 12 },
    title: { fontSize: 18, fontWeight: "900", color: text },
    price: { marginTop: 6, fontSize: 16, fontWeight: "900", color: primary },
    desc: { marginTop: 6, color: muted, fontWeight: "700" },
  });
}
