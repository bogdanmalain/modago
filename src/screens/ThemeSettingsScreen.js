// src/screens/ThemeSettingsScreen.js
import React, { useContext, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../theme/ThemeProvider";

function Row({ title, subtitle, right, onPress, topRadius, bottomRadius }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        topRadius && styles.topRadius,
        bottomRadius && styles.bottomRadius,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      <Text style={styles.right}>{right}</Text>
    </Pressable>
  );
}

export default function ThemeSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { settings, scheme, tokens, setAuto, setManual } =
    useContext(ThemeContext);

  const currentLabel = useMemo(() => {
    if (settings.mode === "auto") return "Auto";
    return settings.manualScheme === "dark" ? "Dark" : "Light";
  }, [settings]);

  const isAuto = settings.mode === "auto";
  const isLight =
    settings.mode === "manual" && settings.manualScheme === "light";
  const isDark = settings.mode === "manual" && settings.manualScheme === "dark";

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: tokens.bg, paddingTop: Math.max(insets.top, 12) },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.text }]}>
          Tema aplicației
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={[styles.closeX, { color: tokens.text }]}>×</Text>
        </Pressable>
      </View>

      <Text style={[styles.helper, { color: tokens.muted }]}>
        Selectează Auto (urmează sistemul) sau Manual (alegi Light/Dark).
      </Text>

      <View
        style={[
          styles.card,
          { borderColor: tokens.warmBorder, backgroundColor: tokens.surface },
        ]}
      >
        <Row
          title="Auto"
          subtitle="Urmează tema telefonului"
          right={isAuto ? "✓" : ""}
          onPress={setAuto}
          topRadius
        />
        <View style={[styles.sep, { backgroundColor: tokens.warmBorder }]} />
        <Row
          title="Light"
          subtitle="Tema luminoasă"
          right={isLight ? "✓" : ""}
          onPress={() => setManual("light")}
        />
        <View style={[styles.sep, { backgroundColor: tokens.warmBorder }]} />
        <Row
          title="Dark"
          subtitle="Tema întunecată"
          right={isDark ? "✓" : ""}
          onPress={() => setManual("dark")}
          bottomRadius
        />
      </View>

      <View style={[styles.preview, { borderColor: tokens.warmBorder }]}>
        <Text style={[styles.previewTitle, { color: tokens.text }]}>
          Activ acum:
        </Text>
        <Text style={[styles.previewValue, { color: tokens.accent }]}>
          {currentLabel} ({scheme})
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 6,
  },
  title: { fontSize: 20, fontWeight: "900" },

  closeBtn: {
    position: "absolute",
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: { fontSize: 28, fontWeight: "900", marginTop: -2 },

  helper: { marginTop: 6, fontSize: 13, fontWeight: "700" },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topRadius: {},
  bottomRadius: {},

  rowTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  rowSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  right: { fontSize: 18, fontWeight: "900", color: "#2F6BFF" },

  sep: { height: 1 },

  preview: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  previewTitle: { fontSize: 13, fontWeight: "900" },
  previewValue: { marginTop: 6, fontSize: 16, fontWeight: "900" },
});
