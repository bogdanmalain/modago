// src/screens/MyFavoritesScreen.js
import React, { useCallback, useEffect, useState } from "react";
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
import { fetchMyFavoriteItems } from "../services/itemsService";

export default function MyFavoritesScreen({ navigation }) {
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
      const data = await fetchMyFavoriteItems(userId);
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

  const renderItem = ({ item }) => {
    const img = Array.isArray(item?.images) ? item.images[0] : null;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => navigation.navigate(ROUTES.ItemDetails, { item })}
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
          <Text style={styles.price}>
            {(typeof item?.price === "number" ? item.price : item?.price) ||
              "-"}{" "}
            lei
          </Text>
          <Text numberOfLines={1} style={styles.desc}>
            {item?.description || ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Se încarcă…</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{err}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Reîncearcă</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>Nu ai favorite încă.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  muted: { marginTop: 10, color: "#6b7280", fontWeight: "800" },
  err: { color: "#ef4444", fontWeight: "900", textAlign: "center" },
  retry: {
    marginTop: 12,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "900" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  imgBox: { height: 220, backgroundColor: "#111827" },
  img: { width: "100%", height: "100%" },
  noImg: { flex: 1, alignItems: "center", justifyContent: "center" },
  noImgText: { color: "#cbd5e1", fontWeight: "900" },

  body: { padding: 12 },
  title: { fontWeight: "900", fontSize: 16, color: "#111" },
  price: { marginTop: 6, fontWeight: "900", fontSize: 16, color: "#0B69FF" },
  desc: { marginTop: 8, color: "#6b7280", fontWeight: "700" },
});
