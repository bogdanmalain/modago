// src/components/Header.js
// Header (web) – Logo · Auth · Search

import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { ThemeContext } from "../theme/ThemeProvider";
import { ROUTES } from "../navigation/routes";

export default function Header({
  query,
  setQuery,
  isLoggedIn,
  onLogout,
  navigation: navProp,
}) {
  const insets = useSafeAreaInsets();
  const navHook = useNavigation();
  const navigation = navProp || navHook;

  const { tokens } = useContext(ThemeContext);
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

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

        {/* Auth */}
        {!isLoggedIn ? (
          <View style={styles.authRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => navigation.navigate(ROUTES.Register)}
              activeOpacity={0.9}
            >
              <Text style={styles.outlineText}>Înregistrare</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate(ROUTES.Login)}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Conectare</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate(ROUTES.AddItem)}
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
          placeholderTextColor={tokens.muted}
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

function makeStyles(tokens) {
  return StyleSheet.create({
    safe: {
      backgroundColor: tokens.bg,
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
      backgroundColor: tokens.primary,
      borderRadius: 2,
      marginRight: 6,
    },
    logoText: {
      fontSize: 22,
      fontWeight: "700",
      color: tokens.text,
    },
    logoGo: {
      fontWeight: "900",
      color: tokens.primary,
    },

    /* Auth */
    authRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    outlineBtn: {
      borderWidth: 1,
      borderColor: tokens.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    outlineText: {
      color: tokens.primary,
      fontWeight: "700",
    },
    primaryBtn: {
      backgroundColor: tokens.primary,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 10,
    },
    primaryText: {
      color: tokens.onPrimary || "#fff",
      fontWeight: "800",
    },
    logoutBtn: {
      backgroundColor: tokens.danger,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    logoutText: {
      color: tokens.onPrimary || "#fff",
      fontWeight: "900",
    },

    /* Search */
    searchWrap: {
      marginTop: 8,
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: tokens.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: tokens.border,
      paddingHorizontal: 12,
      height: 44,
      flexDirection: "row",
      alignItems: "center",

      shadowColor: tokens.shadowColor,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    searchIcon: { fontSize: 16, marginRight: 8 },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: tokens.text,
      height: 44,
    },
    clearBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: tokens.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    clearText: {
      fontSize: 14,
      fontWeight: "900",
      color: tokens.primary,
    },
  });
}
