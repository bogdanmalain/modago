// src/components/Input.js
import React, { useContext, useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export function Input({ style, placeholderTextColor, ...props }) {
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <TextInput
      {...props}
      style={[S.input, style]}
      placeholderTextColor={placeholderTextColor ?? S.placeholder.color}
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
  style,
}) {
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const label = show ? "🙈 Ascunde" : "👁 Vezi";

  return (
    <View style={S.passRow}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!show}
        style={[S.input, S.passInput, style]}
        placeholderTextColor={S.placeholder.color}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      <TouchableOpacity onPress={onToggle} style={S.eyeBtn} activeOpacity={0.8}>
        <Text style={S.eyeText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.10)");

  return StyleSheet.create({
    placeholder: { color: muted },

    input: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: text,
      marginTop: 10,
      height: 52,
    },

    passRow: { position: "relative", marginTop: 10 },
    passInput: { marginTop: 0, paddingRight: 120 },

    eyeBtn: {
      position: "absolute",
      right: 12,
      top: 0,
      height: 52,
      justifyContent: "center",
    },
    eyeText: {
      fontWeight: "900",
      color: text,
      ...(Platform.OS === "web" ? { fontFamily: "system-ui" } : null),
    },
  });
}
