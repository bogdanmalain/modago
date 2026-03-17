/**
 * ================================
 * src/screens/ThemeSettingsScreen.js
 * ================================
 * COMPONENTĂ: ThemeSettingsScreen
 *
 * MODIFICĂRI:
 * -> sus afișează corect tema selectată: Auto / Light / Dark
 * -> separat afișează și tema activă acum: dark / light
 * -> textul/albul este apropiat vizual de ProfileScreen
 * -> back-ul folosește goBack() dacă se poate, altfel fallback la Settings
 * -> restul logicii rămâne neschimbată
 */

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
import { ROUTES } from "../navigation/routes";
import HeaderBackButton, {
  HEADER_BACK_SIZE,
} from "../components/HeaderBackButton";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function getSelectedThemeLabel(settings) {
  const mode = settings?.mode === "manual" ? "manual" : "auto";
  const manualScheme = settings?.manualScheme === "dark" ? "dark" : "light";

  if (mode === "auto") return "Auto";
  return manualScheme === "dark" ? "Dark" : "Light";
}

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

  const selectedThemeLabel = getSelectedThemeLabel(settings);

  const S = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  const onBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.Settings);
  }, [navigation]);

  return (
    <View style={S.screen}>
      <HeaderBackButton onPress={onBack} top={insets.top + 10} />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={S.infoBlock}>
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>Tema selectată:</Text>
            <Text style={S.infoValue}>{selectedThemeLabel}</Text>
          </View>

          <View style={S.infoRowSecondary}>
            <Text style={S.infoLabelSecondary}>Tema activă acum:</Text>
            <Text style={S.infoValueSecondary}>{scheme}</Text>
          </View>
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
          „Tema activă acum” poate fi light sau dark, în funcție de telefon.
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
      <View style={styles.rowTextWrap}>
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

  const topPad = insets.top + 10 + HEADER_BACK_SIZE + 18;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },
    scroll: { flex: 1, backgroundColor: bg },

    content: {
      paddingTop: topPad,
      paddingBottom: Math.max(insets.bottom, 16) + FLOATING_TABBAR_SAFE_SPACE,
      paddingHorizontal: 16,
    },

    infoBlock: {
      marginBottom: 12,
      paddingHorizontal: 2,
    },

    infoRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },

    infoLabel: {
      fontSize: 16,
      fontWeight: "900",
      color: muted,
    },

    infoValue: {
      fontSize: 18,
      fontWeight: "900",
      color: text,
    },

    infoRowSecondary: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginTop: 6,
    },

    infoLabelSecondary: {
      fontSize: 14,
      fontWeight: "800",
      color: muted,
    },

    infoValueSecondary: {
      fontSize: 15,
      fontWeight: "900",
      color: text,
      textTransform: "lowercase",
    },

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
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },

    rowSelected: {
      borderColor: primary,
      borderWidth: 2,
    },

    rowTextWrap: {
      flex: 1,
      paddingRight: 12,
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

    pillSelected: {
      borderColor: primary,
    },

    pillIdle: {},

    pillText: {
      fontWeight: "900",
      fontSize: 14,
    },

    pillTextSelected: {
      color: primary,
    },

    pillTextIdle: {
      color: muted,
    },

    footerNote: {
      marginTop: 8,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "800",
      color: muted,
      paddingHorizontal: 10,
      lineHeight: 20,
    },
  });
}
