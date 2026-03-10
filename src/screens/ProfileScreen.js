/**
 * ================================
 * PROFILESCREEN
 * ================================
 * MODIFICĂRI:
 * -> FIX: count-urile se încarcă și imediat după ce sesiunea devine disponibilă
 * -> păstrat refresh și la focus
 * -> prima logare afișează corect Anunțurile mele / Favorite fără să mai intri pe alt ecran
 * -> FIX: navigarea folosește noua structură de stack
 *    • MyItems / Favorites / ThemeSettings nu mai sunt în TabsRoot
 *    • butoanele funcționează din nou
 * -> restul logicii rămâne neschimbată
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchMyItems } from "../services/itemsService";
import { fetchFavoriteItems } from "../services/favoritesService";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const user = session?.user || null;
  const userId = user?.id || null;

  const [loadingCounts, setLoadingCounts] = useState(true);
  const [myItemsCount, setMyItemsCount] = useState(null);
  const [favCount, setFavCount] = useState(null);

  /* ── sesiune ── */
  useEffect(() => {
    let sub;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      setSessionReady(true);

      const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
        setSession(sess ?? null);
      });

      sub = listener?.subscription;
    })();

    return () => sub?.unsubscribe?.();
  }, []);

  /* ── display ── */
  const displayName = useMemo(() => {
    const e = user?.email || "";
    if (!e) return "Vizitator";
    return e.split("@")[0];
  }, [user?.email]);

  const email = user?.email || "";

  /* ── counts ── */
  const loadCounts = useCallback(async () => {
    if (!sessionReady) {
      setLoadingCounts(true);
      return;
    }

    if (!userId) {
      setMyItemsCount(null);
      setFavCount(null);
      setLoadingCounts(false);
      return;
    }

    setLoadingCounts(true);
    try {
      const [myItems, favItems] = await Promise.all([
        fetchMyItems(userId),
        fetchFavoriteItems(userId),
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
  }, [userId, sessionReady]);

  /* FIX: când sesiunea devine disponibilă după login, încărcăm count-urile */
  useEffect(() => {
    if (!sessionReady) return;
    loadCounts();
  }, [sessionReady, userId, loadCounts]);

  /* Refresh la focus */
  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts]),
  );

  /* ── navigare ── */
  const goMyItems = useCallback(() => {
    if (!sessionReady || !user) return;
    navigation.navigate(ROUTES.MyItems);
  }, [sessionReady, user, navigation]);

  const goFavorites = useCallback(() => {
    if (!sessionReady || !user) return;
    navigation.navigate(ROUTES.Favorites);
  }, [sessionReady, user, navigation]);

  const goThemeSettings = useCallback(() => {
    navigation.navigate(ROUTES.ThemeSettings);
  }, [navigation]);

  const goSell = useCallback(() => {
    navigation.navigate(ROUTES.AddItem);
  }, [navigation]);

  const onLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log("❌ logout error:", e);
    }
  }, []);

  /* ── render helpers ── */
  const formatCount = (val) => (loadingCounts ? "—" : String(val ?? "—"));

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={[
        S.content,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 18) + 10,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={S.title}>Profil</Text>

      <View style={S.profileCard}>
        <View style={S.avatar}>
          <Text style={S.avatarText}>
            {displayName?.slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={S.name}>{displayName}</Text>
          <Text style={S.email}>{email || "Nu ești logat"}</Text>
        </View>

        <TouchableOpacity
          style={S.sellBtn}
          activeOpacity={0.9}
          onPress={goSell}
        >
          <Text style={S.sellBtnText}>Vinde</Text>
        </TouchableOpacity>
      </View>

      <View style={S.statsRow}>
        <TouchableOpacity
          style={S.statCard}
          activeOpacity={0.9}
          onPress={goMyItems}
        >
          <Text style={S.statNum}>{formatCount(myItemsCount)}</Text>
          <Text style={S.statLabel}>Anunțurile mele</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={S.statCard}
          activeOpacity={0.9}
          onPress={goFavorites}
        >
          <Text style={S.statNum}>{formatCount(favCount)}</Text>
          <Text style={S.statLabel}>Favorite</Text>
        </TouchableOpacity>

        <View style={S.statCard}>
          <Text style={S.statNum}>0</Text>
          <Text style={S.statLabel}>Vânzări</Text>
        </View>
      </View>

      <View style={S.menuCard}>
        <TouchableOpacity
          style={S.menuRow}
          onPress={goMyItems}
          activeOpacity={0.9}
        >
          <Text style={S.menuText}>🧾 Anunțurile mele</Text>
          <Text style={S.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={S.menuDivider} />

        <TouchableOpacity
          style={S.menuRow}
          onPress={goFavorites}
          activeOpacity={0.9}
        >
          <Text style={S.menuText}>♡ Favorite</Text>
          <Text style={S.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={S.menuDivider} />

        <TouchableOpacity
          style={S.menuRow}
          onPress={goThemeSettings}
          activeOpacity={0.9}
        >
          <Text style={S.menuText}>⚙️ Setări</Text>
          <Text style={S.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={S.logoutBtn}
        activeOpacity={0.9}
        onPress={onLogout}
      >
        <Text style={S.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#0B1220");
  const card = pickTok(tokens, "card", "#111A2E");
  const text = pickTok(tokens, "text", "#E5E7EB");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#9CA3AF"));
  const border = pickTok(tokens, "border", "rgba(255,255,255,0.10)");
  const divider = pickTok(tokens, "divider", "rgba(255,255,255,0.08)");
  const primary = pickTok(
    tokens,
    "primary",
    pickTok(tokens, "accent", "#60A5FA"),
  );
  const primarySoft = pickTok(tokens, "primarySoft", "rgba(96,165,250,0.18)");
  const danger = pickTok(tokens, "danger", "#F87171");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },
    content: { flexGrow: 1, paddingHorizontal: 16, backgroundColor: bg },

    title: {
      fontSize: 22,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 12,
      color: text,
    },

    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: card,
      borderRadius: 16,
      padding: 14,
      gap: 12,
      borderWidth: 1,
      borderColor: border,
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: onPrimary, fontWeight: "900" },

    name: { fontSize: 18, fontWeight: "900", color: text },
    email: { marginTop: 2, color: muted, fontWeight: "700" },

    sellBtn: {
      paddingHorizontal: 14,
      height: 34,
      borderRadius: 12,
      backgroundColor: primarySoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
    },
    sellBtnText: { color: primary, fontWeight: "900" },

    statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    statCard: {
      flex: 1,
      backgroundColor: card,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: border,
    },
    statNum: { fontSize: 22, fontWeight: "900", color: text },
    statLabel: { marginTop: 6, color: muted, fontWeight: "800" },

    menuCard: {
      marginTop: 12,
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      overflow: "hidden",
    },
    menuRow: {
      height: 54,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    menuText: { fontSize: 16, fontWeight: "900", color: text },
    menuArrow: { fontSize: 22, fontWeight: "900", color: muted },
    menuDivider: { height: 1, backgroundColor: divider },

    logoutBtn: {
      marginTop: 14,
      height: 56,
      borderRadius: 16,
      backgroundColor: danger,
      alignItems: "center",
      justifyContent: "center",
    },
    logoutText: { color: onPrimary, fontWeight: "900", fontSize: 18 },
  });
}
