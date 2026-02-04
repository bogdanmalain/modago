// src/screens/ThemeSettingsScreen.js
import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../theme/ThemeProvider";

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, scheme, setAuto, setManual } = useContext(ThemeContext);

  const isDark = scheme === "dark";

  const S = useMemo(() => makeStyles(isDark), [isDark]);

  const isAuto = settings?.mode !== "manual";
  const isManualLight =
    settings?.mode === "manual" && settings?.manualScheme === "light";
  const isManualDark =
    settings?.mode === "manual" && settings?.manualScheme === "dark";

  const currentLabel = scheme;

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 12) + 72, // spațiu pt header transparent
        paddingBottom: Math.max(insets.bottom, 18),
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ❗ NU mai desenăm titlu aici (îl face header-ul din AppNavigator) */}

      {/* Info card */}
      <View style={S.infoCard}>
        <Text style={S.infoTitle}>Mod afișare</Text>
        <Text style={S.infoSub}>
          Tema curentă aplicată:{" "}
          <Text style={S.infoStrong}>{currentLabel}</Text>
        </Text>
      </View>

      {/* Rows */}
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

function makeStyles(isDark) {
  // Look “glass” fără expo-blur: doar RGBA + border + shadow
  const bg = isDark ? "#07101F" : "#F3F4F6";

  const card = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";

  const text = isDark ? "rgba(255,255,255,0.92)" : "#111827";
  const sub = isDark ? "rgba(255,255,255,0.55)" : "#6B7280";

  const accent = "#60A5FA";
  const accentBorder = isDark
    ? "rgba(96,165,250,0.85)"
    : "rgba(37,99,235,0.55)";
  const pillBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(17,24,39,0.05)";

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },

    infoCard: {
      backgroundColor: card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 12,
    },
    infoTitle: { fontSize: 16, fontWeight: "900", color: text },
    infoSub: { marginTop: 6, fontSize: 13, fontWeight: "700", color: sub },
    infoStrong: { color: text, fontWeight: "900" },

    rowCard: {
      backgroundColor: card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      // shadow subtil (mai ales pe iOS)
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 4 : 2,
    },

    rowSelected: {
      borderColor: accentBorder,
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
      color: sub,
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
      backgroundColor: pillBg,
    },
    pillSelected: {
      backgroundColor: isDark
        ? "rgba(96,165,250,0.22)"
        : "rgba(37,99,235,0.14)",
      borderColor: accentBorder,
    },
    pillIdle: {},
    pillText: { fontWeight: "900", fontSize: 14 },
    pillTextSelected: { color: accent },
    pillTextIdle: { color: isDark ? "rgba(255,255,255,0.6)" : "#6B7280" },

    footerNote: {
      marginTop: 8,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "700",
      color: sub,
      paddingHorizontal: 10,
    },
  });
}
