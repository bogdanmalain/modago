import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

export default function Header({
  query,
  setQuery,
  isLoggedIn,
  onLogout,
  // opțional, dacă îl primește din navigator:
  navigation: navProp,
  route,
}) {
  const insets = useSafeAreaInsets();
  const navHook = useNavigation();
  const navigation = navProp || navHook;

  // Pe mobil: nu ascundem nimic automat (ca să fie consistent).
  // Dacă vrei pe viitor să ascunzi pe anumite ecrane, facem cu prop.
  return (
    <SafeAreaView
      style={[styles.safe, { paddingTop: Math.max(insets.top, 8) }]}
    >
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.tag} />
          <Text style={styles.logoText}>
            Moda<Text style={styles.logoGo}>Go</Text>
          </Text>
        </View>

        {/* Right side */}
        {!isLoggedIn ? (
          <View style={styles.authRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.9}
            >
              <Text style={styles.outlineText}>Înregistrare</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Conectare</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("AddItem")}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Vinde</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={onLogout}
              activeOpacity={0.9}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔎</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Caută produse…"
          placeholderTextColor="#8a8a8a"
          style={styles.searchInput}
          returnKeyType="search"
        />

        {!!query && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            style={styles.clearBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "#f5f7fb",
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  /* Logo */
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tag: {
    width: 10,
    height: 10,
    backgroundColor: "#0B69FF",
    borderRadius: 2,
    marginRight: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  logoGo: {
    fontWeight: "900",
    color: "#0B69FF",
  },

  /* Auth */
  authRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#dbe3ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  outlineText: {
    color: "#2b4cff",
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: "#0B69FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
  },
  logoutBtn: {
    backgroundColor: "#ff3d3d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "900",
  },

  /* Search */
  searchWrap: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e6e9f2",
    paddingHorizontal: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    height: 44,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { fontSize: 14, fontWeight: "900", color: "#2b4cff" },
});
