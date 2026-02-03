// src/screens/ProfileScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchMyItems, fetchMyFavoriteItems } from "../services/itemsService";

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const user = session?.user || null;

  const [loadingCounts, setLoadingCounts] = useState(true);
  const [myItemsCount, setMyItemsCount] = useState(null);
  const [favCount, setFavCount] = useState(null);

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

  const displayName = useMemo(() => {
    const email = user?.email || "";
    if (!email) return "Vizitator";
    return email.split("@")[0];
  }, [user?.email]);

  const email = user?.email || "";

  const loadCounts = useCallback(async () => {
    const uid = user?.id;

    if (!authReady) {
      setLoadingCounts(true);
      return;
    }

    if (!uid) {
      setMyItemsCount(null);
      setFavCount(null);
      setLoadingCounts(false);
      return;
    }

    setLoadingCounts(true);
    try {
      const [myItems, favItems] = await Promise.all([
        fetchMyItems(uid),
        fetchMyFavoriteItems(uid),
      ]);

      setMyItemsCount(Array.isArray(myItems) ? myItems.length : 0);
      setFavCount(Array.isArray(favItems) ? favItems.length : 0);
    } catch (e) {
      console.log("❌ loadCounts error:", e);
      setMyItemsCount(null);
      setFavCount(null);
    } finally {
      setLoadingCounts(false);
    }
  }, [user?.id, authReady]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadCounts);
    loadCounts();
    return unsub;
  }, [navigation, loadCounts]);

  const ensureLogged = useCallback(() => {
    // dacă auth nu e gata, nu facem nimic
    if (!authReady) return false;

    // dacă nu există user, NU navigăm manual la Login (AppNavigator gestionează)
    if (!user) return false;

    return true;
  }, [authReady, user]);

  // navigare sigură către Stack-ul părinte (MyItems/Favorites sunt în Stack, nu în Tabs)
  const navigateToRootStack = useCallback(
    (routeName) => {
      const parent = navigation.getParent?.();
      if (parent?.navigate) parent.navigate(routeName);
      else navigation.navigate(routeName);
    },
    [navigation],
  );

  const goMyItems = useCallback(() => {
    if (!ensureLogged()) return;
    navigateToRootStack(ROUTES.MyItems);
  }, [ensureLogged, navigateToRootStack]);

  const goFavorites = useCallback(() => {
    if (!ensureLogged()) return;
    navigateToRootStack(ROUTES.Favorites);
  }, [ensureLogged, navigateToRootStack]);

  const onLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // IMPORTANT: nu navigăm manual la Login
      // AppNavigator va comuta automat pe AuthStack când session devine null
    } catch (e) {
      console.log("❌ logout error:", e);
    }
  }, []);

  const goSell = useCallback(() => {
    // AddItem e în Tabs
    navigation.navigate(ROUTES.AddItem);
  }, [navigation]);

  const countsTextMyItems = loadingCounts ? "—" : String(myItemsCount ?? "—");
  const countsTextFavs = loadingCounts ? "—" : String(favCount ?? "—");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 12),
        paddingBottom: Math.max(insets.bottom, 18),
      }}
    >
      <Text style={styles.title}>Profil</Text>

      {/* Header card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName?.slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email || "Nu ești logat"}</Text>
        </View>

        <TouchableOpacity
          style={styles.sellBtn}
          activeOpacity={0.9}
          onPress={goSell}
        >
          <Text style={styles.sellBtnText}>Vinde</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.9}
          onPress={goMyItems}
        >
          <Text style={styles.statNum}>{countsTextMyItems}</Text>
          <Text style={styles.statLabel}>Anunțurile mele</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.9}
          onPress={goFavorites}
        >
          <Text style={styles.statNum}>{countsTextFavs}</Text>
          <Text style={styles.statLabel}>Favorite</Text>
        </TouchableOpacity>

        <View style={styles.statCard}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Vânzări</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuRow} onPress={goMyItems}>
          <Text style={styles.menuText}>🧾 Anunțurile mele</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuRow} onPress={goFavorites}>
          <Text style={styles.menuText}>♡ Favorite</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuRow} onPress={() => {}}>
          <Text style={styles.menuText}>⚙️ Setări</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        activeOpacity={0.9}
        onPress={onLogout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Profil – acum „Anunțurile mele” și „Favorite” sunt reale.
      </Text>

      {loadingCounts && authReady && user ? (
        <View style={{ marginTop: 10, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6", paddingHorizontal: 16 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
    color: "#111827",
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900" },
  name: { fontSize: 18, fontWeight: "900", color: "#111827" },
  email: { marginTop: 2, color: "#6B7280", fontWeight: "700" },

  sellBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E5EEFf",
    alignItems: "center",
    justifyContent: "center",
  },
  sellBtnText: { color: "#2563EB", fontWeight: "900" },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statNum: { fontSize: 22, fontWeight: "900", color: "#111827" },
  statLabel: { marginTop: 6, color: "#6B7280", fontWeight: "800" },

  menuCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  menuRow: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuText: { fontSize: 16, fontWeight: "900", color: "#111827" },
  menuArrow: { fontSize: 22, fontWeight: "900", color: "#9CA3AF" },
  menuDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },

  logoutBtn: {
    marginTop: 14,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: "#fff", fontWeight: "900", fontSize: 18 },

  note: {
    marginTop: 10,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "700",
  },
});
