// src/components/ui.js
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../theme";

export function Screen({ children, style }) {
  return <View style={[styles.page, style]}>{children}</View>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function InfoBox({ children, variant = "warn" }) {
  const v = variant === "warn" ? styles.warnBox : styles.infoBox;
  const t = variant === "warn" ? styles.warnText : styles.infoText;
  return (
    <View style={v}>
      <Text style={t}>{children}</Text>
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, loading, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && styles.disabled, style]}
    >
      <Text style={styles.primaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[styles.secondaryBtn, disabled && styles.disabled, style]}
    >
      <Text style={styles.secondaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function LinkButton({ title, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[styles.linkBtn, style]}
    >
      <Text style={styles.linkText}>{title}</Text>
    </TouchableOpacity>
  );
}

export const uiFontFamily =
  Platform.OS === "web" ? { fontFamily: "system-ui" } : null;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.page,
  },
  card: {
    width: "100%",
    maxWidth: theme.sizes.maxCardWidth,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    padding: theme.spacing.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: "900",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 10,
    ...(uiFontFamily || {}),
  },

  warnBox: {
    backgroundColor: theme.colors.warnBg,
    borderColor: theme.colors.warnBorder,
    borderWidth: 1,
    padding: 10,
    borderRadius: theme.radius.input,
    marginTop: 6,
    marginBottom: 6,
  },
  warnText: {
    color: theme.colors.warnText,
    fontWeight: "900",
    textAlign: "center",
    ...(uiFontFamily || {}),
  },

  infoBox: {
    backgroundColor: "#eef2ff",
    borderColor: "#dbe3ff",
    borderWidth: 1,
    padding: 10,
    borderRadius: theme.radius.input,
    marginTop: 6,
    marginBottom: 6,
  },
  infoText: {
    color: "#2b4cff",
    fontWeight: "900",
    textAlign: "center",
    ...(uiFontFamily || {}),
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.btn,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: theme.colors.primaryText,
    fontWeight: "900",
    fontSize: theme.font.btn,
    ...(uiFontFamily || {}),
  },

  secondaryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.secondaryBg,
    paddingVertical: 14,
    borderRadius: theme.radius.btn,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.secondaryBorder,
  },
  secondaryText: {
    color: theme.colors.secondaryText,
    fontWeight: "900",
    fontSize: 15,
    ...(uiFontFamily || {}),
  },

  linkBtn: { marginTop: 14, alignItems: "center" },
  linkText: {
    color: theme.colors.primary,
    fontWeight: "900",
    ...(uiFontFamily || {}),
  },

  disabled: { opacity: 0.6 },
});
