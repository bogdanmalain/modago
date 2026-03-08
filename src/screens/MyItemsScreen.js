// src/screens/MyItemsScreen.js
// MODIFICARE:
// - folosește ScreenHeader
// - back button unificat cu restul aplicației
// - FIX: back merge explicit în Profile, nu pe istoricul stack-ului
// - logică neschimbată

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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchMyItems } from "../services/itemsService";
import { ThemeContext } from "../theme/ThemeProvider";
import ScreenHeader from "../components/ScreenHeader";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function MyItemsScreen({ navigation }) {
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
      const data = await fetchMyItems(userId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("❌ MyItems load:", e);
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
    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
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

  const showAuthMessage = authReady && !userId;

  return (
    <View style={S.screen}>
      <ScreenHeader title="Anunțurile mele" onBack={goBackSafe} />

      {!authReady ? (
        <View style={S.center}>
          <ActivityIndicator />
          <Text style={S.muted}>Se încarcă sesiunea…</Text>
        </View>
      ) : showAuthMessage ? (
        <View style={S.center}>
          <Text style={S.muted}>
            Trebuie să fii logat ca să vezi anunțurile.
          </Text>
        </View>
      ) : loading ? (
        <View style={S.center}>
          <ActivityIndicator />
          <Text style={S.muted}>Se încarcă…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: Math.max(insets.bottom, 14),
          }}
          ListEmptyComponent={
            <View style={S.center}>
              <Text style={S.muted}>Nu ai anunțuri încă.</Text>
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
    screen: { flex: 1, backgroundColor: bg },

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
