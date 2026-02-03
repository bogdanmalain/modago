// src/components/Input.js
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../theme";

export function Input({ style, ...props }) {
  return (
    <TextInput
      {...props}
      style={[styles.input, style]}
      placeholderTextColor="#9aa4b2"
    />
  );
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder = "Parolă",
  show,
  onToggle,
  inputRef,
  returnKeyType,
  onSubmitEditing,
}) {
  const label = show ? "🙈 Ascunde" : "👁 Vezi"; // ✅ simplu și consistent

  return (
    <View style={styles.passRow}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!show}
        style={[styles.input, styles.passInput]}
        placeholderTextColor="#9aa4b2"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      <TouchableOpacity
        onPress={onToggle}
        style={styles.eyeBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.eyeText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: theme.font.body,
    color: theme.colors.text,
    marginTop: theme.spacing.gap,
    height: theme.sizes.inputHeight,
  },
  passRow: { position: "relative", marginTop: theme.spacing.gap },
  passInput: { marginTop: 0, paddingRight: 120 },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    height: theme.sizes.inputHeight,
    justifyContent: "center",
  },
  eyeText: {
    fontWeight: "900",
    color: theme.colors.text,
    ...(Platform.OS === "web" ? { fontFamily: "system-ui" } : null),
  },
});
