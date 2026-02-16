// src/components/AppButton.js
import React, { useContext, useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";

/**
 * AppButton – buton standard ModaGo (theme-aware)
 * Variants: "primary" | "outline" | "ghost"
 */
export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  height = 52,
  radius = 14,
  style,
  textStyle,
  activityIndicatorColor,
}) {
  const { tokens } = useContext(ThemeContext);

  const isDisabled = disabled || loading;

  const computed = useMemo(() => {
    const primary = tokens?.primary ?? "#3fa9b5";
    const text = tokens?.text ?? "#111827";
    const onPrimary = tokens?.onPrimary ?? "#FFFFFF";

    const base = {
      height,
      borderRadius: radius,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      opacity: isDisabled ? 0.65 : 1,
    };

    if (variant === "outline") {
      return {
        btn: {
          ...base,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: primary,
        },
        text: {
          color: primary,
          fontWeight: "900",
          fontSize: 16,
          fontFamily: Platform.OS === "web" ? "system-ui" : undefined,
        },
        spinner: activityIndicatorColor || primary,
      };
    }

    if (variant === "ghost") {
      return {
        btn: {
          ...base,
          backgroundColor: "transparent",
          borderWidth: 0,
          borderColor: "transparent",
          paddingHorizontal: 0,
        },
        text: {
          color: primary,
          fontWeight: "900",
          fontSize: 15,
          fontFamily: Platform.OS === "web" ? "system-ui" : undefined,
        },
        spinner: activityIndicatorColor || primary,
      };
    }

    // primary
    return {
      btn: {
        ...base,
        backgroundColor: primary,
        borderWidth: 0,
        borderColor: "transparent",
      },
      text: {
        color: onPrimary,
        fontWeight: "900",
        fontSize: 16,
        fontFamily: Platform.OS === "web" ? "system-ui" : undefined,
      },
      spinner: activityIndicatorColor || onPrimary,
    };
  }, [tokens, variant, height, radius, isDisabled, activityIndicatorColor]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.btnBase, computed.btn, style]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={computed.spinner} />
      ) : (
        <Text style={[computed.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    alignSelf: "stretch",
  },
});
