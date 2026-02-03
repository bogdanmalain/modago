// src/screens/MyItemsScreen.js
import React, { useCallback, useEffect, useState } from "react";
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
import { fetchMyItems } from "../services/itemsService";

export default function MyItemsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

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
    // IMPORTANT: așteaptă auth
    if (!authReady) return;

    // dacă nu e user, nu navigăm la Login (AppNavigator se ocupă când session chiar devine null)
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
    if (navigation?.canGoBack?.()) navigation.goBack();
    else {
      // fallback: du-te înapoi în tabul Profile prin părinte
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
          style={styles.card}
        >
          <View style={styles.imgBox}>
            {img ? (
              <Image
                source={{ uri: img }}
                style={styles.img}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImg}>
                <Text style={styles.noImgText}>Fără imagine</Text>
              </View>
            )}
          </View>

          <View style={styles.body}>
            <Text numberOfLines={1} style={styles.title}>
              {item?.title || "-"}
            </Text>
            <Text style={styles.price}>{item?.price ?? "-"} lei</Text>
            <Text numberOfLines={2} style={styles.desc}>
              {item?.description || ""}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  const showAuthMessage = authReady && !userId;

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBackSafe} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backTxt}>←</Text>
        </Pressable>
        <Text style={styles.h1}>Anunțurile mele</Text>
      </View>

      {!authReady ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Se încarcă sesiunea…</Text>
        </View>
      ) : showAuthMessage ? (
        <View style={styles.center}>
          <Text style={styles.muted}>
            Trebuie să fii logat ca să vezi anunțurile.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Se încarcă…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 14) }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>Nu ai anunțuri încă.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f6f8", paddingHorizontal: 14 },
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
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  backTxt: { fontSize: 22, fontWeight: "900" },
  h1: { fontSize: 22, fontWeight: "900" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  muted: {
    marginTop: 8,
    color: "#6b7280",
    fontWeight: "700",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  imgBox: { height: 180, backgroundColor: "#111827" },
  img: { width: "100%", height: "100%" },
  noImg: { flex: 1, alignItems: "center", justifyContent: "center" },
  noImgText: { color: "#cbd5e1", fontWeight: "900" },

  body: { padding: 12 },
  title: { fontSize: 18, fontWeight: "900" },
  price: { marginTop: 6, fontSize: 16, fontWeight: "900", color: "#2563eb" },
  desc: { marginTop: 6, color: "#6b7280", fontWeight: "700" },
});
