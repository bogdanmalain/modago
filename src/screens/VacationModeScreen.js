// src/screens/VacationModeScreen.js
// ================================
// VACATIONMODESCREEN
// ================================
// CE ESTE:
// -> ecran pentru Mod Vacanță
//
// MODIFICĂRI:
// -> switch-ul este aliniat mai bine pe verticală în rând
// -> starea se salvează în user_metadata prin Supabase
// -> când este activat apare bara de jos, în stilul din referință
// -> textul a fost corectat: "activat"

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function VacationModeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        const value = Boolean(user?.user_metadata?.vacation_mode_enabled);

        if (!alive) return;
        setEnabled(value);
      } catch (e) {
        console.log("❌ vacation mode load error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
  }, [navigation]);

  const saveVacationMode = useCallback(async (nextValue) => {
    setEnabled(nextValue);
    setSaving(true);

    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;
      const currentMeta = user?.user_metadata || {};

      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          vacation_mode_enabled: nextValue,
          hide_my_items_on_vacation: nextValue,
        },
      });

      if (error) throw error;
    } catch (e) {
      console.log("❌ vacation mode save error:", e);
      setEnabled((prev) => !prev);
    } finally {
      setSaving(false);
    }
  }, []);

  const onToggle = useCallback(() => {
    if (saving) return;
    saveVacationMode(!enabled);
  }, [enabled, saveVacationMode, saving]);

  if (loading) {
    return (
      <View style={[S.screen, S.centered]}>
        <ActivityIndicator size="large" color={S.__colors.primary} />
      </View>
    );
  }

  return (
    <View style={S.screen}>
      <View style={[S.content, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={S.header}>
          <TouchableOpacity
            style={S.backBtn}
            activeOpacity={0.9}
            onPress={goBackSafe}
          >
            <Ionicons name="chevron-back" size={22} color={S.__colors.text} />
          </TouchableOpacity>

          <Text style={S.title}>Mod Vacanță</Text>

          <View style={S.headerSpacer} />
        </View>

        <View style={S.mainRow}>
          <Text style={S.mainLabel}>Ascunde articolele mele</Text>

          <View style={S.switchWrap}>
            <Switch
              value={enabled}
              onValueChange={onToggle}
              disabled={saving}
              trackColor={{
                false: S.__colors.switchOff,
                true: S.__colors.primary,
              }}
              thumbColor={S.__colors.switchThumb}
              ios_backgroundColor={S.__colors.switchOff}
            />
          </View>
        </View>

        <View style={S.fillArea} />

        {enabled ? (
          <View
            style={[
              S.bottomBar,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <View style={S.bottomTextWrap}>
              <Text style={S.bottomTitle}>Modul Vacanță este activat</Text>
              <Text style={S.bottomSubtext}>Articolele tale sunt ascunse</Text>
            </View>

            <TouchableOpacity
              style={S.bottomBtn}
              activeOpacity={0.9}
              onPress={() => saveVacationMode(false)}
              disabled={saving}
            >
              <Text style={S.bottomBtnText}>Dezactivare</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#0B1220");
  const text = pickTok(tokens, "text", "#E5E7EB");
  const muted = pickTok(tokens, "muted", "#9CA3AF");
  const card = pickTok(tokens, "card", "#111A2E");
  const border = pickTok(tokens, "border", "rgba(255,255,255,0.10)");
  const primary = pickTok(tokens, "primary", "#0D8C96");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");
  const surfaceSoft = pickTok(
    tokens,
    "surfaceSoft",
    "rgba(127,140,141,0.18)",
  );

  return StyleSheet.create({
    __colors: {
      text,
      primary,
      switchOff: surfaceSoft,
      switchThumb: "#FFFFFF",
    },

    screen: {
      flex: 1,
      backgroundColor: bg,
    },

    content: {
      flex: 1,
      paddingHorizontal: 16,
    },

    centered: {
      justifyContent: "center",
      alignItems: "center",
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
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

    mainRow: {
      minHeight: 92,
      borderRadius: 20,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    },

    mainLabel: {
      flex: 1,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      color: text,
      paddingRight: 8,
    },

    switchWrap: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },

    fillArea: {
      flex: 1,
      backgroundColor: "transparent",
    },

    bottomBar: {
      borderTopWidth: 1,
      borderColor: border,
      paddingTop: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    },

    bottomTextWrap: {
      flex: 1,
    },

    bottomTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: text,
    },

    bottomSubtext: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: muted,
      fontWeight: "600",
    },

    bottomBtn: {
      minWidth: 140,
      height: 52,
      borderRadius: 14,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },

    bottomBtnText: {
      color: onPrimary,
      fontSize: 16,
      fontWeight: "800",
    },
  });
}