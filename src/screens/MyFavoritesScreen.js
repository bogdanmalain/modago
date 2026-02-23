// src/screens/MyFavoritesScreen.js
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
} from "react-native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchFavoriteItems } from "../services/favoritesService";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function MyFavoritesScreen({ navigation }) {
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

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

  const load = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      navigation.navigate(ROUTES.Login);
      return;
    }

    setErr("");
    setLoading(true);
    try {
      const data = await fetchFavoriteItems(userId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Eroare la încărcare.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, navigation]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation, load]);

  const renderItem = useCallback(
    ({ item }) => {
      const img = Array.isArray(item?.images) ? item.images[0] : null;
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={S.card}
          onPress={() => navigation.navigate(ROUTES.ItemDetails, { item })}
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
            <Text style={S.price}>
              {typeof item?.price === "number"
                ? item.price
                : item?.price || "-"}{" "}
              lei
            </Text>
            <Text numberOfLines={1} style={S.desc}>
              {item?.description || ""}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, S],
  );

  if (loading) {
    return (
      <View style={S.center}>
        <ActivityIndicator size="large" />
        <Text style={S.muted}>Se încarcă…</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={S.center}>
        <Text style={S.err}>{err}</Text>
        <TouchableOpacity style={S.retry} onPress={load} activeOpacity={0.9}>
          <Text style={S.retryText}>Reîncearcă</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={S.screen}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={S.center}>
            <Text style={S.muted}>Nu ai favorite încă.</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", "#6B7280");
  const primary = pickTok(tokens, "primary", "#0B69FF");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.06)");
  const mediaBg = pickTok(tokens, "mediaBg", "#111827");
  const danger = pickTok(tokens, "danger", "#EF4444");

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    muted: {
      marginTop: 10,
      color: muted,
      fontWeight: "800",
      textAlign: "center",
    },
    err: { color: danger, fontWeight: "900", textAlign: "center" },
    retry: {
      marginTop: 12,
      backgroundColor: text,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    retryText: { color: onPrimary, fontWeight: "900" },

    card: {
      backgroundColor: card,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: border,
    },
    imgBox: { height: 220, backgroundColor: mediaBg },
    img: { width: "100%", height: "100%" },
    noImg: { flex: 1, alignItems: "center", justifyContent: "center" },
    noImgText: { color: onPrimary, fontWeight: "900" },

    body: { padding: 12 },
    title: { fontWeight: "900", fontSize: 16, color: text },
    price: { marginTop: 6, fontWeight: "900", fontSize: 16, color: primary },
    desc: { marginTop: 8, color: muted, fontWeight: "700" },
  });
}
