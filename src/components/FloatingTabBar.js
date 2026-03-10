// src/components/FloatingTabBar.js
// COMPONENTĂ: FloatingTabBar
// MODIFICARE:
// - compatibil cu navigatorul nou: tabbar-ul rămâne doar pentru tab-urile reale
// - nu mai ascunde ItemDetails / EditItem etc. din tabbar, pentru că nu mai sunt în tabs
// - păstrat offset separat pentru MyItems dacă ajunge să fie folosit ca route activă
// - UI UPDATE:
//   • bara rămâne albicioasă / curată
//   • pill-ul activ pe light este mai transparent
//   • icon + text active rămân theme-aware (primary)
//   • label-uri schimbate:
//      • Home -> Acasă
//      • Inbox -> Mesaje primite

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

  const tabBottom = Math.max(
    insets.bottom - (activeRouteName === ROUTES.MyItems ? 43 : 35),
    0,
  );

  const S = useMemo(
    () => makeStyles(tokens, isDark, tabBottom),
    [tokens, isDark, tabBottom],
  );

  const wanted = [
    ROUTES.Home,
    ROUTES.Search,
    ROUTES.AddItem,
    ROUTES.Inbox,
    ROUTES.Profile,
  ];
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

          if (route.name === ROUTES.AddItem) {
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
                  <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          }

          const isProfile = route.name === ROUTES.Profile;
          const isSearch = route.name === ROUTES.Search;
          const isInbox = route.name === ROUTES.Inbox;
          const isHome = route.name === ROUTES.Home;

          const iconOff = isSearch
            ? "search-outline"
            : isInbox
              ? "mail-outline"
              : isProfile
                ? null
                : "home-outline";

          const iconOn = isSearch
            ? "search"
            : isInbox
              ? "mail"
              : isProfile
                ? null
                : "home";

          const textLabel = isSearch
            ? "Căutare"
            : isInbox
              ? "Mesaje primite"
              : isProfile
                ? "Profil"
                : isHome
                  ? "Acasă"
                  : "Acasă";

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={String(label)}
              testID={options?.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.86}
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

                <Text
                  numberOfLines={1}
                  style={[S.label, isFocused ? S.labelOn : S.labelOff]}
                >
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
          tint="light"
          intensity={18}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.92)"
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
  const muted = pickTok(tokens, "muted", isDark ? "#8F98AA" : "#6B7280");
  const primary = pickTok(tokens, "primary", "#43C6DB");
  const card = pickTok(tokens, "card", isDark ? "#111A2E" : "#FFFFFF");
  const bg = pickTok(tokens, "bg", isDark ? "#071224" : "#F3F4F6");

  const border = isDark ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.08)";
  const strongBorder = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.08)";

  const overlay = isDark ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.78)";

  const pillFill = isDark ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0)";

  const pillBorder = isDark
    ? "rgba(255,255,255,0.52)"
    : "rgba(255,255,255,0.94)";

  const iconOn = primary;
  const iconOff = isDark ? "rgba(15,23,42,0.62)" : "rgba(15,23,42,0.58)";

  const labelOn = primary;
  const labelOff = isDark ? "rgba(15,23,42,0.74)" : "rgba(15,23,42,0.68)";

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
      left: 12,
      right: 12,
      bottom,
      height: 76,
      borderRadius: 28,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },

    bar: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom,
      height: 76,
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: strongBorder,
      backgroundColor: "transparent",
    },

    glassOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: overlay,
    },

    barWeb: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom,
      height: 76,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.88)",
      borderWidth: 1,
      borderColor: strongBorder,
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
      minHeight: 60,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 7,
      borderRadius: 22,
      marginHorizontal: 4,
    },

    pillOn: {
      backgroundColor: pillFill,
      borderWidth: 1.5,
      borderColor: pillBorder,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },

    pillOff: {
      backgroundColor: "transparent",
      borderWidth: 0,
    },

    iconRow: {
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },

    label: {
      marginTop: 6,
      fontSize: 11.5,
      fontWeight: "800",
      maxWidth: "92%",
      textAlign: "center",
    },

    labelOn: {
      color: labelOn,
    },

    labelOff: {
      color: labelOff,
    },

    iconOn: {
      color: iconOn,
    },

    iconOff: {
      color: iconOff,
    },

    centerSlot: {
      width: 90,
      alignItems: "center",
    },

    plusBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },

    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(255,255,255,0.34)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
    },

    avatarOn: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },

    avatarText: {
      fontSize: 14,
      fontWeight: "900",
      color: muted,
    },

    avatarTextOn: {
      color: primary,
    },

    dot: {
      position: "absolute",
      right: -2,
      top: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#EF4444",
      borderWidth: 2,
      borderColor: isDark ? card : bg,
    },
  });
}
