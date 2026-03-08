// src/components/HeaderBackButton.js
// Reusable theme-aware circular header button
// Referință vizuală: butonul din ThemeSettingsScreen
// - doar cerc + conținut central
// - light: bulină albă soft
// - dark: glass circle discret
// - poate fi folosit absolute sau inline
// - implicit afișează săgeata back, dar poate primi și children (ex: •••)

import React, { useContext, useMemo } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export const HEADER_BACK_SIZE = 48;

export default function HeaderBackButton({
  onPress,
  top,
  left = 14,
  size = HEADER_BACK_SIZE,
  absolute = true,
  style,
  hitSlop = 12,
  children,
  iconStyle,
}) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme } = useContext(ThemeContext);

  const S = useMemo(
    () => makeStyles(tokens, scheme, size, absolute, top, left, insets),
    [tokens, scheme, size, absolute, top, left, insets],
  );

  const content = children ?? <Text style={[S.backIcon, iconStyle]}>‹</Text>;

  return (
    <Pressable onPress={onPress} hitSlop={hitSlop} style={[S.backBtn, style]}>
      {content}
    </Pressable>
  );
}

function makeStyles(tokens, scheme, size, absolute, top, left, insets) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const text = pickTok(tokens, "text", "#111827");
  const shadowColor = pickTok(tokens, "shadowColor", "#000");

  const isDark =
    scheme === "dark" ||
    bg === "#0B1220" ||
    bg === "#081224" ||
    bg === "#000814";

  const backBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)";

  const backBorder = isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(255,255,255,0.98)";

  const resolvedTop =
    typeof top === "number" ? top : Math.max(insets.top, 0) + 10;

  return StyleSheet.create({
    backBtn: {
      position: absolute ? "absolute" : "relative",
      left: absolute ? left : undefined,
      top: absolute ? resolvedTop : undefined,
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: backBg,
      borderWidth: 1,
      borderColor: backBorder,
      zIndex: 50,
      shadowColor,
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },

    backIcon: {
      fontSize: 34,
      lineHeight: 34,
      color: text,
      fontWeight: "900",
      marginLeft: -2,
      marginTop: -1,
      textAlign: "center",
      includeFontPadding: false,
    },
  });
}
