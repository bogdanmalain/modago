import React, { useContext, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ThemeContext } from "../theme/ThemeProvider";
import { ROUTES } from "../navigation/routes";
import { supabase } from "../supabaseClient";
import HeaderBackButton, {
  HEADER_BACK_SIZE,
} from "../components/HeaderBackButton";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

const FLOATING_TABBAR_SAFE_SPACE = 110;

export default function SecurityScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  const onBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.Settings);
  }, [navigation]);

  const onSave = useCallback(async () => {
    if (!password || !password2) {
      Alert.alert("Lipsesc date", "Completează parola nouă și confirmarea.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Parolă prea scurtă", "Minim 8 caractere.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      Alert.alert("Parolă prea slabă", "Parola trebuie să conțină litere și cifre.");
      return;
    }
    if (password !== password2) {
      Alert.alert("Parole diferite", "Cele două parole nu coincid.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert("Eroare", error.message || "Nu am putut schimba parola.");
        return;
      }
      setPassword("");
      setPassword2("");
      Alert.alert("Gata", "Parola a fost schimbată cu succes.");
    } catch (e) {
      Alert.alert("Eroare", e?.message || "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  }, [password, password2]);

  return (
    <View style={S.screen}>
      <HeaderBackButton onPress={onBack} top={insets.top + 10} />

      <View style={S.content}>
        <Text style={S.title}>Securitate</Text>
        <Text style={S.subtitle}>
          Schimbă parola contului tău ModaGo.
        </Text>

        <View style={S.card}>
          <TextInput
            style={S.input}
            placeholder="Parolă nouă"
            placeholderTextColor={S.__muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            returnKeyType="next"
          />
          <TextInput
            style={S.input}
            placeholder="Repetă parola nouă"
            placeholderTextColor={S.__muted}
            secureTextEntry
            value={password2}
            onChangeText={setPassword2}
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={onSave}
          />

          <TouchableOpacity
            style={[S.saveBtn, busy && S.saveBtnDisabled]}
            onPress={onSave}
            disabled={busy}
            activeOpacity={0.9}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={S.saveBtnText}>Salvează parola</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function makeStyles(tokens, insets) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));
  const primary = pickTok(tokens, "primary", pickTok(tokens, "accent", "#2563EB"));

  const topPad = insets.top + 10 + HEADER_BACK_SIZE + 18;

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },
    content: {
      paddingTop: topPad,
      paddingBottom: Math.max(insets.bottom, 16) + FLOATING_TABBAR_SAFE_SPACE,
      paddingHorizontal: 16,
    },
    title: { fontSize: 24, fontWeight: "900", color: text },
    subtitle: {
      marginTop: 6,
      marginBottom: 16,
      fontSize: 14,
      fontWeight: "600",
      color: muted,
    },
    card: {
      backgroundColor: card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: border,
    },
    input: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: bg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: text,
      marginBottom: 10,
    },
    saveBtn: {
      backgroundColor: primary,
      borderRadius: 12,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });

  return { ...s, __muted: muted };
}
