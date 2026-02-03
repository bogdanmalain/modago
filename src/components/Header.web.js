import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

function getActiveRouteName(state) {
  if (!state) return "";
  const route = state.routes?.[state.index ?? 0];
  if (!route) return "";
  // dacă ai navigatoare nested, intră recursiv
  if (route.state) return getActiveRouteName(route.state);
  return route.name || "";
}

export default function HeaderWeb() {
  const navigation = useNavigation();
  const menuRef = useRef(null);

  const [session, setSession] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const user = session?.user ?? null;
  const initial = user?.email?.charAt(0)?.toUpperCase() || "U";

  // ✅ Ruta curentă fără useRoute()
  const activeRouteName = useNavigationState((state) =>
    getActiveRouteName(state),
  );

  // ✅ arătăm săgeata doar pe ecranele cerute
  const showBack = useMemo(() => {
    return (
      activeRouteName === ROUTES.ItemDetails ||
      activeRouteName === ROUTES.AddItem ||
      activeRouteName === ROUTES.EditItem
    );
  }, [activeRouteName]);

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

  // click în afara meniului → close (doar web)
  useEffect(() => {
    if (!menuOpen) return;

    const onClick = (e) => {
      const el = menuRef.current;
      if (!el || !el.contains || !el.contains(e.target)) setMenuOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const goBack = useCallback(() => {
    setMenuOpen(false);
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate(ROUTES.Home);
  }, [navigation]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigation.navigate(ROUTES.Home);
  }, [navigation]);

  return (
    <View style={styles.wrap}>
      <View style={styles.container}>
        {/* LEFT: Back (doar pe anumite ecrane) + LOGO */}
        <View style={styles.left}>
          {showBack ? (
            <Pressable onPress={goBack} style={styles.backBtn} hitSlop={10}>
              <Text style={styles.backTxt}>←</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate(ROUTES.Home);
            }}
          >
            <Text style={styles.logo}>● ModaGo</Text>
          </Pressable>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Caută produse..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {/* RIGHT */}
        <View style={styles.right}>
          <Pressable
            style={styles.sellBtn}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate(ROUTES.AddItem);
            }}
          >
            <Text style={styles.sellText}>Vinde</Text>
          </Pressable>

          {/* USER MENU */}
          <View ref={menuRef} style={{ position: "relative", zIndex: 999999 }}>
            <Pressable
              style={styles.avatar}
              onPress={() => setMenuOpen((v) => !v)}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </Pressable>

            {menuOpen && (
              <View style={styles.menu}>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    navigation.navigate(ROUTES.Profile);
                  }}
                >
                  <Text style={styles.menuText}>Profil</Text>
                </Pressable>

                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    navigation.navigate(ROUTES.MyItems);
                  }}
                >
                  <Text style={styles.menuText}>Anunțurile mele</Text>
                </Pressable>

                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    navigation.navigate(ROUTES.Favorites);
                  }}
                >
                  <Text style={styles.menuText}>Favorite</Text>
                </Pressable>

                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    // momentan placeholder:
                    // navigation.navigate(ROUTES.Orders) când o să existe
                  }}
                >
                  <Text style={styles.menuText}>Comenzile mele</Text>
                </Pressable>

                <View style={styles.divider} />

                <Pressable style={styles.menuItem} onPress={logout}>
                  <Text style={[styles.menuText, styles.logout]}>
                    Deconectare
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    position: "relative",
    zIndex: 999999,
  },

  container: {
    maxWidth: 1200,
    width: "80%",
    marginHorizontal: "auto",
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  left: { flexDirection: "row", alignItems: "center", gap: 12 },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  backTxt: { fontSize: 20, fontWeight: "900", color: "#111", marginTop: -1 },

  logo: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111",
  },

  searchBox: { flex: 1 },

  searchInput: {
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    outlineStyle: "none",
  },

  right: { flexDirection: "row", alignItems: "center", gap: 12 },

  sellBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  sellText: { color: "#fff", fontWeight: "900" },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900" },

  menu: {
    position: "absolute",
    top: 50,
    right: 0,
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    zIndex: 999999,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 999,
  },

  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuText: { fontSize: 14, fontWeight: "700", color: "#111" },

  divider: { height: 1, backgroundColor: "#e5e7eb" },

  logout: { color: "#b91c1c" },
});
