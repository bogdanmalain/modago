// src/components/FloatingTabBar.js
// COMPONENTĂ: FloatingTabBar
// MODIFICARE:
// - fix crash când state este undefined la primul render
// - tabbar-ul se ascunde pe:
//   • ItemDetails
//   • AddItem
//   • EditItem
// - FIX: toate hooks rulează înainte de orice return null
// - FIX: poziția pe verticală poate fi ajustată per route
//   • Home / Search / Inbox / Profile rămân la offset normal
//   • MyItems este coborât puțin mai jos
// - restul comportamentului rămâne neschimbat

import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

import { ThemeContext } from "../theme/ThemeProvider";
import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function getInitialFromEmail(email) {
  const s = String(email || "").trim();
  if (!s) return "👤";
  return s[0].toUpperCase();
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme } = useContext(ThemeContext);
  const isDark = scheme === "dark";

  const [profileInitial, setProfileInitial] = useState("👤");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const email = data?.session?.user?.email || "";
        if (!mounted) return;
        setProfileInitial(getInitialFromEmail(email));
      } catch {}
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const email = sess?.user?.email || "";
      setProfileInitial(getInitialFromEmail(email));
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const routes = Array.isArray(state?.routes) ? state.routes : [];
  const activeIndex = typeof state?.index === "number" ? state.index : 0;
  const activeRouteName = routes?.[activeIndex]?.name || "";

  // offset per route
  const tabBottom = Math.max(
    insets.bottom - (activeRouteName === ROUTES.MyItems ? 43 : 35),
    0,
  );

  const S = useMemo(
    () => makeStyles(tokens, isDark, tabBottom),
    [tokens, isDark, tabBottom],
  );

  // Ascunde tabbar-ul pe ecranele full-screen / secundare unde nu o vrem
  const hiddenRoutes = [
    ROUTES.ImageViewer,
    ROUTES.ItemDetails,
    ROUTES.AddItem,
    ROUTES.EditItem,
  ];

  if (hiddenRoutes.includes(activeRouteName)) return null;

  const wanted = ["Home", "Search", "AddItem", "Inbox", "Profile"];
  const visibleRoutes = routes.filter((r) => wanted.includes(r.name));
  const orderedRoutes = wanted
    .map((name) => visibleRoutes.find((r) => r.name === name))
    .filter(Boolean);

  if (orderedRoutes.length === 0) return null;

  function renderButtons() {
    return (
      <View style={S.row}>
        {orderedRoutes.map((route) => {
          const index = routes.findIndex((r) => r.key === route.key);
          const isFocused = activeIndex === index;

          const { options } = descriptors?.[route.key] || {};
          const label = options?.tabBarLabel ?? options?.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          if (route.name === "AddItem") {
            return (
              <View key={route.key} style={S.centerSlot}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={String(label)}
                  testID={options?.tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  activeOpacity={0.9}
                  style={S.plusBtn}
                >
                  <Ionicons name="add" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          }

          const isProfile = route.name === "Profile";
          const isSearch = route.name === "Search";
          const isInbox = route.name === "Inbox";

          const iconOff = isSearch
            ? "search-outline"
            : isInbox
              ? "chatbubble-ellipses-outline"
              : "home-outline";

          const iconOn = isSearch
            ? "search"
            : isInbox
              ? "chatbubble-ellipses"
              : "home";

          const textLabel = isSearch
            ? "Căutare"
            : isInbox
              ? "Inbox"
              : isProfile
                ? "Profil"
                : "Home";

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={String(label)}
              testID={options?.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.85}
              style={S.item}
            >
              <View style={[S.pill, isFocused ? S.pillOn : S.pillOff]}>
                <View style={S.iconRow}>
                  {isProfile ? (
                    <View style={[S.avatar, isFocused && S.avatarOn]}>
                      <Text style={[S.avatarText, isFocused && S.avatarTextOn]}>
                        {profileInitial}
                      </Text>
                      <View style={S.dot} />
                    </View>
                  ) : (
                    <Ionicons
                      name={isFocused ? iconOn : iconOff}
                      size={22}
                      color={isFocused ? S.iconOn.color : S.iconOff.color}
                    />
                  )}
                </View>

                <Text style={[S.label, isFocused ? S.labelOn : S.labelOff]}>
                  {textLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={S.wrap}>
      <View style={S.shadow} pointerEvents="none" />

      {Platform.OS === "web" ? (
        <View style={S.barWeb}>{renderButtons()}</View>
      ) : (
        <BlurView
          tint={isDark ? "dark" : "light"}
          intensity={isDark ? 26 : 6}
          reducedTransparencyFallbackColor="transparent"
          style={S.bar}
        >
          <View pointerEvents="none" style={S.glassOverlay} />
          {renderButtons()}
        </BlurView>
      )}
    </View>
  );
}

function makeStyles(tokens, isDark, bottom) {
  const text = pickTok(tokens, "text", isDark ? "#E5E7EB" : "#0B1220");
  const muted = pickTok(tokens, "muted", isDark ? "#8F98AA" : "#374151");
  const primary = pickTok(tokens, "primary", isDark ? "#60A5FA" : "#2563EB");
  const card = pickTok(tokens, "card", isDark ? "#111A2E" : "#FFFFFF");

  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
  const overlay = isDark
    ? "rgba(10, 16, 28, 0.22)"
    : "rgba(255,255,255,0.01)";

  const pillFill = isDark
    ? "rgba(255,255,255,0.14)"
    : "rgba(255,255,255,0.55)";
  const pillBorder = isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(0,0,0,0.14)";

  const iconOn = isDark ? "rgba(255,255,255,0.98)" : "rgba(15,23,42,0.95)";
  const iconOff = isDark ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.55)";

  const labelOn = isDark ? "rgba(255,255,255,0.98)" : "rgba(15,23,42,0.95)";
  const labelOff = isDark ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.50)";

  return StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
    },
    shadow: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom,
      height: 72,
      borderRadius: 26,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.12 : 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    bar: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom,
      height: 72,
      borderRadius: 26,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: border,
      backgroundColor: "transparent",
    },
    glassOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: overlay,
    },
    barWeb: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom,
      height: 72,
      borderRadius: 26,
      backgroundColor: overlay,
      borderWidth: 1,
      borderColor: border,
    },
    row: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    pill: {
      width: "100%",
      alignItems: "center",
      paddingVertical: 7,
      borderRadius: 16,
      marginHorizontal: 6,
    },
    pillOn: {
      backgroundColor: pillFill,
      borderWidth: 1,
      borderColor: pillBorder,
    },
    pillOff: { backgroundColor: "transparent" },
    iconRow: { height: 24, justifyContent: "center" },
    label: { marginTop: 6, fontSize: 12, fontWeight: "800" },
    labelOn: { color: labelOn },
    labelOff: { color: labelOff },
    iconOn: { color: iconOn },
    iconOff: { color: iconOff },
    centerSlot: { width: 88, alignItems: "center" },
    plusBtn: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
    },
    avatarOn: {
      backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.07)",
    },
    avatarText: { fontSize: 14, fontWeight: "900", color: muted },
    avatarTextOn: { color: text },
    dot: {
      position: "absolute",
      right: -2,
      top: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#EF4444",
      borderWidth: 2,
      borderColor: card,
    },
  });
}