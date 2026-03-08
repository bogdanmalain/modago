// src/components/ScreenHeader.js
// Reusable screen header
// - safe area top
// - back button optional
// - title
// - right slot optional
// - folosește HeaderBackButton intern

import React, { useContext, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../theme/ThemeProvider";
import HeaderBackButton from "./HeaderBackButton";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function ScreenHeader({
  title,
  onBack,
  showBack = true,
  rightSlot = null,
  horizontalPadding = 14,
  bottomSpacing = 12,
}) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(
    () => makeStyles(tokens, insets, horizontalPadding, bottomSpacing),
    [tokens, insets, horizontalPadding, bottomSpacing],
  );

  return (
    <View style={S.wrap}>
      <View style={S.row}>
        <View style={S.left}>
          {showBack ? (
            <HeaderBackButton onPress={onBack} absolute={false} />
          ) : (
            <View style={S.sidePlaceholder} />
          )}
        </View>

        <View style={S.center}>
          <Text numberOfLines={1} style={S.title}>
            {title}
          </Text>
        </View>

        <View style={S.right}>
          {rightSlot || <View style={S.sidePlaceholder} />}
        </View>
      </View>
    </View>
  );
}

function makeStyles(tokens, insets, horizontalPadding, bottomSpacing) {
  const text = pickTok(tokens, "text", "#111827");

  return StyleSheet.create({
    wrap: {
      paddingTop: Math.max(insets.top, 10),
      paddingHorizontal: horizontalPadding,
      paddingBottom: bottomSpacing,
    },

    row: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
    },

    left: {
      width: 48,
      alignItems: "flex-start",
      justifyContent: "center",
    },

    center: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 12,
    },

    right: {
      width: 48,
      alignItems: "flex-end",
      justifyContent: "center",
    },

    sidePlaceholder: {
      width: 48,
      height: 48,
    },

    title: {
      fontSize: 22,
      fontWeight: "900",
      color: text,
    },
  });
}
