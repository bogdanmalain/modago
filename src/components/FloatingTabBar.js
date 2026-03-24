// src/components/FloatingTabBar.js
// COMPONENTĂ: FloatingTabBar
// MODIFICARE:
// - ANDROID FIX: fără glossy / blur pe Android, aspect mai curat
// - ANDROID FIX: bară puțin mai compactă și stabilă vizual
// - iOS rămâne cu blur/glossy ca înainte
// - păstrată logica de navigare și etichetele existente

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

function hexToRgba(hex, alpha, fallback) {
  if (!hex || typeof hex !== "string") return fallback;
  if (hex.startsWith("rgba(") || hex.startsWith("rgb(")) return hex;

  let c = hex.replace("#", "").trim();

  if (c.length === 3) {
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  }

  if (c.length !== 6) return fallback;

  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme } = useContext(ThemeContext);
  const isDark = scheme === "dark";
  const isAndroid = Platform.OS === "android";

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

  const extraLift = isAndroid ? 10 : 18;
  const tabBottom = Math.max(
    insets.bottom - (activeRouteName === ROUTES.MyItems ? 43 : 35) + extraLift,
    isAndroid ? 10 : 12,
  );

  const S = useMemo(
    () => makeStyles(tokens, isDark, tabBottom, isAndroid),
    [tokens, isDark, tabBottom, isAndroid],
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

  function getTabMeta(routeName) {
    switch (routeName) {
      case ROUTES.Home:
        return {
          label: "Acasă",
          iconOff: "home-outline",
          iconOn: "home",
        };
      case ROUTES.Search:
        return {
          label: "Căutare",
          iconOff: "search-outline",
          iconOn: "search",
        };
      case ROUTES.AddItem:
        return {
          label: "Vinde",
          iconOff: "add-circle-outline",
          iconOn: "add-circle",
        };
      case ROUTES.Inbox:
        return {
          label: "Mesaje primite",
          iconOff: "mail-outline",
          iconOn: "mail",
        };
      case ROUTES.Profile:
        return {
          label: "Profil",
          iconOff: null,
          iconOn: null,
        };
      default:
        return {
          label: routeName,
          iconOff: "ellipse-outline",
          iconOn: "ellipse",
        };
    }
  }

  function renderButtons() {
    return (
      <View style={S.row}>
        {orderedRoutes.map((route) => {
          const index = routes.findIndex((r) => r.key === route.key);
          const isFocused = activeIndex === index;

          const { options } = descriptors?.[route.key] || {};
          const fallbackMeta = getTabMeta(route.name);
          const label =
            options?.tabBarLabel ?? options?.title ?? fallbackMeta.label;

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

          const isProfile = route.name === ROUTES.Profile;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={String(label)}
              testID={options?.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.9}
              style={S.item}
            >
              <View
                style={[
                  S.tabBubble,
                  isFocused ? S.tabBubbleOn : S.tabBubbleOff,
                ]}
              >
                {isProfile ? (
                  <View style={[S.avatar, isFocused && S.avatarOn]}>
                    <Text style={[S.avatarText, isFocused && S.avatarTextOn]}>
                      {profileInitial}
                    </Text>
                    <View style={S.dot} />
                  </View>
                ) : (
                  <Ionicons
                    name={
                      isFocused ? fallbackMeta.iconOn : fallbackMeta.iconOff
                    }
                    size={21}
                    color={isFocused ? S.iconOn.color : S.iconOff.color}
                  />
                )}

                <Text
                  numberOfLines={1}
                  style={[S.label, isFocused ? S.labelOn : S.labelOff]}
                >
                  {fallbackMeta.label}
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
      ) : isAndroid ? (
        <View style={S.barAndroid}>{renderButtons()}</View>
      ) : (
        <BlurView
          tint={isDark ? "dark" : "light"}
          intensity={isDark ? 26 : 14}
          reducedTransparencyFallbackColor={
            isDark ? "rgba(10,16,28,0.96)" : "rgba(255,255,255,0.97)"
          }
          style={S.bar}
        >
          <View pointerEvents="none" style={S.glassOverlay} />
          {renderButtons()}
        </BlurView>
      )}
    </View>
  );
}

function makeStyles(tokens, isDark, bottom, isAndroid) {
  const primary = pickTok(
    tokens,
    "primary",
    pickTok(tokens, "accent", "#43C6DB"),
  );
  const text = pickTok(tokens, "text", isDark ? "#E7EEF8" : "#111827");
  const muted = pickTok(tokens, "muted", isDark ? "#93A0B4" : "#6B7280");
  const bg = pickTok(tokens, "bg", isDark ? "#071224" : "#F3F4F6");
  const card = pickTok(tokens, "card", isDark ? "#111A2E" : "#FFFFFF");
  const borderTok = pickTok(tokens, "border", isDark ? "#22304A" : "#D1D5DB");

  const barBg = isDark ? "rgba(11,17,30,0.96)" : "rgba(255,255,255,0.98)";

  const barBorder = isDark
    ? hexToRgba(text, 0.08, "rgba(255,255,255,0.08)")
    : hexToRgba("#111827", 0.08, "rgba(17,24,39,0.08)");

  const bubbleFill = isDark
    ? hexToRgba(primary, 0.16, "rgba(67,198,219,0.16)")
    : hexToRgba(primary, 0.11, "rgba(67,198,219,0.11)");

  const bubbleBorder = isDark
    ? hexToRgba(primary, 0.22, "rgba(67,198,219,0.22)")
    : "transparent";

  const iconOn = primary;
  const iconOff = isDark
    ? hexToRgba(text, 0.72, "rgba(231,238,248,0.72)")
    : hexToRgba("#111827", 0.56, "rgba(17,24,39,0.56)");

  const labelOn = isDark ? text : primary;
  const labelOff = isDark
    ? hexToRgba(text, 0.82, "rgba(231,238,248,0.82)")
    : hexToRgba("#111827", 0.66, "rgba(17,24,39,0.66)");

  const avatarBg = isDark
    ? hexToRgba(text, 0.08, "rgba(255,255,255,0.08)")
    : "rgba(255,255,255,0.42)";

  const avatarBgOn = isDark
    ? hexToRgba(primary, 0.14, "rgba(67,198,219,0.14)")
    : hexToRgba(primary, 0.12, "rgba(67,198,219,0.12)");

  const profileTextOff = isDark ? text : muted;
  const profileTextOn = primary;

  const dotBorder = isDark ? card : bg;

  const horizontalInset = isAndroid ? 16 : 22;
  const barRadius = isAndroid ? 30 : 34;
  const bubbleRadius = isAndroid ? 20 : 22;
  const barHeight = isAndroid ? 62 : 64;

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
      left: horizontalInset,
      right: horizontalInset,
      bottom,
      height: barHeight,
      borderRadius: barRadius,
      shadowColor: "#000",
      shadowOpacity: isDark ? (isAndroid ? 0.14 : 0.18) : 0.05,
      shadowRadius: isDark ? 14 : 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: isDark ? 8 : 4,
    },

    bar: {
      position: "absolute",
      left: horizontalInset,
      right: horizontalInset,
      bottom,
      height: barHeight,
      borderRadius: barRadius,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: barBorder,
      backgroundColor: "transparent",
    },

    barAndroid: {
      position: "absolute",
      left: horizontalInset,
      right: horizontalInset,
      bottom,
      height: barHeight,
      borderRadius: barRadius,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: barBorder,
      backgroundColor: barBg,
    },

    glassOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark
        ? "rgba(11,17,30,0.84)"
        : "rgba(255,255,255,0.88)",
    },

    barWeb: {
      position: "absolute",
      left: horizontalInset,
      right: horizontalInset,
      bottom,
      height: barHeight,
      borderRadius: barRadius,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: barBorder,
      backgroundColor: isDark
        ? "rgba(11,17,30,0.84)"
        : "rgba(255,255,255,0.88)",
    },

    row: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: isAndroid ? 8 : 10,
    },

    item: {
      flex: 1,
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 2,
    },

    tabBubble: {
      width: "100%",
      minHeight: isAndroid ? 46 : 48,
      borderRadius: bubbleRadius,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      paddingHorizontal: 4,
    },

    tabBubbleOn: {
      backgroundColor: bubbleFill,
      borderWidth: isDark ? 1 : 0,
      borderColor: bubbleBorder,
    },

    tabBubbleOff: {
      backgroundColor: "transparent",
      borderWidth: 0,
    },

    label: {
      marginTop: 4,
      fontSize: isAndroid ? 10 : 10.5,
      fontWeight: "800",
      textAlign: "center",
      maxWidth: "96%",
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

    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: avatarBg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark
        ? hexToRgba(text, 0.08, "rgba(255,255,255,0.08)")
        : borderTok,
    },

    avatarOn: {
      backgroundColor: avatarBgOn,
      borderColor: isDark
        ? hexToRgba(primary, 0.18, "rgba(67,198,219,0.18)")
        : "transparent",
    },

    avatarText: {
      fontSize: 13,
      fontWeight: "900",
      color: profileTextOff,
    },

    avatarTextOn: {
      color: profileTextOn,
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
      borderColor: dotBorder,
    },
  });
}
