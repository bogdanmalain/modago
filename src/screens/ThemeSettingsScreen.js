// src/screens/ThemeSettingsScreen.js
// Ecran setări temă (Auto / Light / Dark) – theme-aware + SafeArea corect
// FIX: buton Back în ecran (sus-stânga) pentru cazul în care nu ai header de Stack
// FIX: paddingTop/paddingBottom corect + spațiu pentru FloatingTabBar

import React, { useContext, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

// Ajustează dacă tabbar-ul tău e mai înalt/mai jos
const FLOATING_TABBAR_SAFE_SPACE = 110;

export default function ThemeSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { settings, scheme, setAuto, setManual, tokens } =
    useContext(ThemeContext);

  const isAuto = settings?.mode !== "manual";
  const isManualLight =
    settings?.mode === "manual" && settings?.manualScheme === "light";
  const isManualDark =
    settings?.mode === "manual" && settings?.manualScheme === "dark";

  const S = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  const onBack = useCallback(() => {
    // dacă are istoric -> goBack, altfel du-te la un ecran “safe”
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate("Profile");
  }, [navigation]);

  return (
    <View style={S.screen}>
      {/* Back button (în ecran) */}
      <TouchableOpacity onPress={onBack} activeOpacity={0.85} style={S.backBtn}>
        <Text style={S.backIcon}>‹</Text>
        <Text style={S.backText}>Înapoi</Text>
      </TouchableOpacity>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Tema curentă:</Text>
          <Text style={S.infoValue}>{scheme}</Text>
        </View>

        <ThemeRow
          title="Auto (după telefon)"
          subtitle="Se schimbă automat când schimbi tema din iOS/Android"
          selected={isAuto}
          onPress={setAuto}
          styles={S}
        />

        <ThemeRow
          title="Light"
          subtitle="Forțează tema deschisă"
          selected={isManualLight}
          onPress={() => setManual("light")}
          styles={S}
        />

        <ThemeRow
          title="Dark"
          subtitle="Forțează tema închisă"
          selected={isManualDark}
          onPress={() => setManual("dark")}
          styles={S}
        />

        <Text style={S.footerNote}>
          Dacă ești pe „Auto”, aplicația urmărește tema sistemului.{"\n"}
          Dacă alegi Light/Dark, rămâne fix.
        </Text>
      </ScrollView>
    </View>
  );
}

function ThemeRow({ title, subtitle, selected, onPress, styles }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.rowCard, selected ? styles.rowSelected : null]}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>

      <View
        style={[styles.pill, selected ? styles.pillSelected : styles.pillIdle]}
      >
        <Text
          style={[
            styles.pillText,
            selected ? styles.pillTextSelected : styles.pillTextIdle,
          ]}
        >
          {selected ? "Selectat" : "Alege"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(tokens, insets) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));
  const primary = pickTok(
    tokens,
    "primary",
    pickTok(tokens, "accent", "#2563EB"),
  );
  const shadowColor = pickTok(tokens, "shadowColor", "#000");

  // spațiu sus: status bar + buton back
  const topPad = insets.top + 16 + 44;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },
    scroll: { flex: 1, backgroundColor: bg },

    content: {
      paddingTop: topPad, // ✅ coboară conținutul sub butonul back
      paddingBottom: Math.max(insets.bottom, 16) + FLOATING_TABBAR_SAFE_SPACE,
      paddingHorizontal: 16,
    },

    // Back
    backBtn: {
      position: "absolute",
      left: 12,
      top: insets.top + 10,
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      zIndex: 50,
    },
    backIcon: {
      fontSize: 26,
      lineHeight: 26,
      marginRight: 6,
      color: text,
      fontWeight: "900",
      marginTop: -2,
    },
    backText: { fontSize: 14, fontWeight: "900", color: text },

    infoRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    infoLabel: { fontSize: 16, fontWeight: "800", color: muted },
    infoValue: { fontSize: 18, fontWeight: "900", color: text },

    rowCard: {
      backgroundColor: card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      shadowColor,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 2,
    },

    rowSelected: {
      borderColor: primary,
      borderWidth: 2,
    },

    rowTitle: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "900",
      color: text,
    },
    rowSub: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
      color: muted,
    },

    pill: {
      minWidth: 92,
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
    },
    pillSelected: { borderColor: primary },
    pillIdle: {},
    pillText: { fontWeight: "900", fontSize: 14 },
    pillTextSelected: { color: primary },
    pillTextIdle: { color: muted },

    footerNote: {
      marginTop: 8,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "700",
      color: muted,
      paddingHorizontal: 10,
    },
  });
}
