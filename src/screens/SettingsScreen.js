/**
 * ================================
 * src/screens/SettingsScreen.js
 * ================================
 * CE ESTE:
 * -> ecran real de Setări pentru varianta mobilă ModaGo
 *
 * MODIFICĂRI:
 * -> textul/albul este aliniat vizual cu ProfileScreen
 * -> rândul "Tema aplicației" afișează corect Auto / Light / Dark
 * -> păstrat layout-ul pe secțiuni și navigarea existentă
 * -> elementele neimplementate încă au alert simplu
 */

import React, { useContext, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import HeaderBackButton, {
  HEADER_BACK_SIZE,
} from "../components/HeaderBackButton";
import { ThemeContext } from "../theme/ThemeProvider";
import { ROUTES } from "../navigation/routes";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function getThemeLabel(settings) {
  const mode = settings?.mode === "manual" ? "manual" : "auto";
  const manualScheme = settings?.manualScheme === "dark" ? "dark" : "light";

  if (mode === "auto") return "Auto";
  return manualScheme === "dark" ? "Dark" : "Light";
}

const FLOATING_TABBAR_SAFE_SPACE = 110;

function SectionTitle({ children, S }) {
  return <Text style={S.sectionTitle}>{children}</Text>;
}

function SettingsRow({ icon, title, value, onPress, S, showDivider = false }) {
  return (
    <>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={S.rowCard}>
        <View style={S.rowLeft}>
          <View style={S.rowIconWrap}>
            <Ionicons name={icon} size={21} color={S.__colors.icon} />
          </View>

          <Text style={S.rowTitle}>{title}</Text>
        </View>

        <View style={S.rowRight}>
          {!!value && <Text style={S.rowValue}>{value}</Text>}
          <Ionicons
            name="chevron-forward"
            size={18}
            color={S.__colors.chevron}
          />
        </View>
      </TouchableOpacity>

      {showDivider ? <View style={S.divider} /> : null}
    </>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { tokens, settings } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  const onBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
  }, [navigation]);

  const showPlaceholder = useCallback((title) => {
    Alert.alert(title, "Secțiunea o implementăm în pasul următor.");
  }, []);

  const goEditProfile = useCallback(() => {
    navigation.navigate(ROUTES.EditProfile);
  }, [navigation]);

  const goThemeSettings = useCallback(() => {
    navigation.navigate(ROUTES.ThemeSettings);
  }, [navigation]);

  const themeLabel = getThemeLabel(settings);

  return (
    <View style={S.screen}>
      <HeaderBackButton onPress={onBack} top={insets.top + 10} />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={S.title}>Setări</Text>

        <SectionTitle S={S}>Cont</SectionTitle>
        <View style={S.card}>
          <SettingsRow
            icon="person-outline"
            title="Detalii profil"
            onPress={goEditProfile}
            S={S}
            showDivider
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Securitate"
            onPress={() => showPlaceholder("Securitate")}
            S={S}
          />
        </View>

        <SectionTitle S={S}>Notificări</SectionTitle>
        <View style={S.card}>
          <SettingsRow
            icon="notifications-outline"
            title="Notificări"
            onPress={() => showPlaceholder("Notificări")}
            S={S}
          />
        </View>

        <SectionTitle S={S}>Aplicație</SectionTitle>
        <View style={S.card}>
          <SettingsRow
            icon="language-outline"
            title="Limbă"
            value="Română"
            onPress={() => showPlaceholder("Limbă")}
            S={S}
            showDivider
          />
          <SettingsRow
            icon="moon-outline"
            title="Tema aplicației"
            value={themeLabel}
            onPress={goThemeSettings}
            S={S}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(tokens, insets) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const divider = pickTok(tokens, "divider", border);
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));
  const shadowColor = pickTok(tokens, "shadowColor", "#000");

  const topPad = insets.top + 10 + HEADER_BACK_SIZE + 20;

  return StyleSheet.create({
    __colors: {
      icon: text,
      chevron: muted,
    },

    screen: {
      flex: 1,
      backgroundColor: bg,
    },

    scroll: {
      flex: 1,
      backgroundColor: bg,
    },

    content: {
      paddingTop: topPad,
      paddingBottom: Math.max(insets.bottom, 16) + FLOATING_TABBAR_SAFE_SPACE,
      paddingHorizontal: 16,
    },

    title: {
      fontSize: 28,
      fontWeight: "900",
      color: text,
      marginBottom: 18,
      paddingHorizontal: 2,
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: muted,
      marginBottom: 8,
      marginTop: 10,
      paddingHorizontal: 2,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    card: {
      backgroundColor: card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: border,
      overflow: "hidden",
      shadowColor,
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
      marginBottom: 10,
    },

    rowCard: {
      minHeight: 64,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 0,
    },

    rowIconWrap: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    rowTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "800",
      color: text,
    },

    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 12,
    },

    rowValue: {
      fontSize: 15,
      fontWeight: "800",
      color: muted,
      marginRight: 8,
    },

    divider: {
      height: 1,
      marginLeft: 56,
      backgroundColor: divider,
    },
  });
}
