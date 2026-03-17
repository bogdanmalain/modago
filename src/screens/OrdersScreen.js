// src/screens/OrdersScreen.js
// ================================
// ORDERSSCREEN
// ================================
// CE ESTE:
// -> ecran placeholder pentru Comenzile mele
//
// MODIFICĂRI:
// -> ecran nou, theme-aware
// -> back corect
// -> empty state pregătit pentru integrare ulterioară

import React, { useCallback, useContext, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function OrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
  }, [navigation]);

  return (
    <View style={S.screen}>
      <View style={[S.content, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={S.header}>
          <TouchableOpacity style={S.backBtn} activeOpacity={0.9} onPress={goBackSafe}>
            <Ionicons name="chevron-back" size={22} color={S.__colors.text} />
          </TouchableOpacity>

          <Text style={S.title}>Comenzile mele</Text>

          <View style={S.headerSpacer} />
        </View>

        <View style={S.emptyCard}>
          <View style={S.emptyIconWrap}>
            <Ionicons name="receipt-outline" size={28} color={S.__colors.primary} />
          </View>

          <Text style={S.emptyTitle}>Nu ai comenzi încă</Text>
          <Text style={S.emptyText}>
            Când legăm fluxul de cumpărare, aici vor apărea comenzile tale.
          </Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#0B1220");
  const card = pickTok(tokens, "card", "#111A2E");
  const text = pickTok(tokens, "text", "#E5E7EB");
  const muted = pickTok(tokens, "muted", "#9CA3AF");
  const border = pickTok(tokens, "border", "rgba(255,255,255,0.10)");
  const primary = pickTok(tokens, "primary", "#2EC4B6");

  return StyleSheet.create({
    __colors: { text, primary },

    screen: {
      flex: 1,
      backgroundColor: bg,
    },

    content: {
      flex: 1,
      paddingHorizontal: 16,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
    },

    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "900",
      color: text,
    },

    headerSpacer: {
      width: 44,
    },

    emptyCard: {
      borderRadius: 24,
      padding: 22,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      alignItems: "center",
    },

    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(46,196,182,0.12)",
      borderWidth: 1,
      borderColor: "rgba(46,196,182,0.18)",
      marginBottom: 16,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: text,
      textAlign: "center",
    },

    emptyText: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      color: muted,
      fontWeight: "600",
      textAlign: "center",
    },
  });
}