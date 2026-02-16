// src/components/CustomTabBar.js
// Custom floating TabBar (mobile)
// Home · Add (+) · Inbox · Profile (avatar cu inițială)
// Theme-aware (Light / Dark / Auto)

import React, { useContext, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../theme/ThemeProvider";

function getInitial(name = "") {
  return String(name || "")
    .slice(0, 1)
    .toUpperCase();
}

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  return (
    <View style={S.wrapper}>
      <View style={S.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

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

          // ➕ BUTON CENTRAL
          if (route.name === "AddItem") {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.85}
                style={S.addBtn}
              >
                <Text style={S.addPlus}>＋</Text>
              </TouchableOpacity>
            );
          }

          // 👤 PROFILE (bulină cu inițială)
          if (route.name === "Profile") {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={S.item}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    S.avatar,
                    isFocused && { borderColor: S.primaryBorder.borderColor },
                  ]}
                >
                  <Text style={S.avatarText}>{getInitial("B")}</Text>
                </View>
                <Text style={[S.label, isFocused && S.labelActive]}>
                  Profil
                </Text>
              </TouchableOpacity>
            );
          }

          // 🏠 HOME / 💬 INBOX
          const icon = route.name === "Home" ? "🏠" : "💬";
          const label = route.name === "Home" ? "Acasă" : "Inbox";

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={S.item}
              activeOpacity={0.8}
            >
              <Text style={[S.icon, isFocused && S.iconActive]}>{icon}</Text>
              <Text style={[S.label, isFocused && S.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(tokens, insets) {
  const bg = tokens?.card ?? "#FFFFFF";
  const text = tokens?.text ?? "#111827";
  const muted = tokens?.muted ?? "#6B7280";
  const primary = tokens?.primary ?? "#2563EB";
  const border = tokens?.border ?? "rgba(0,0,0,0.08)";
  const shadowColor = tokens?.shadowColor ?? "#000";

  // ✅ pentru butoane teal: textul “corect” vine din tokens (ai pus onPrimary în tokens)
  const onPrimary = tokens?.onPrimary ?? "#FFFFFF";

  return StyleSheet.create({
    wrapper: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: Math.max(insets.bottom, 10),
      paddingHorizontal: 14,
    },

    bar: {
      height: 64,
      borderRadius: 32,
      backgroundColor: bg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      borderWidth: 1,
      borderColor: border,

      shadowColor: shadowColor,
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },

    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },

    icon: {
      fontSize: 18,
      color: muted,
      opacity: 0.85,
    },
    iconActive: {
      color: text,
      opacity: 1,
    },

    label: {
      fontSize: 11,
      fontWeight: "700",
      color: muted,
    },
    labelActive: {
      color: text,
    },

    // ➕ ADD
    addBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,

      shadowColor: primary,
      shadowOpacity: 0.45,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
    },
    addPlus: {
      color: onPrimary,
      fontSize: 30,
      fontWeight: "900",
      marginTop: -2,
    },

    // 👤 PROFILE
    avatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    avatarText: {
      color: onPrimary,
      fontWeight: "900",
      fontSize: 13,
    },

    primaryBorder: {
      borderColor: primary,
    },
  });
}
