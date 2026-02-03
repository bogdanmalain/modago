// src/screens/UpdatePasswordScreen.js
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

export default function UpdatePasswordScreen({ navigation }) {
  const p2Ref = useRef(null);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [loading, setLoading] = useState(false);

  const notify = useCallback((title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const onSave = useCallback(async () => {
    if (!p1 || !p2) {
      notify("Lipsesc date", "Completează parola și confirmarea.");
      return;
    }
    if (p1.length < 6) {
      notify("Parolă prea scurtă", "Minim 6 caractere.");
      return;
    }
    if (p1 !== p2) {
      notify("Parole diferite", "Parolele nu coincid.");
      return;
    }

    try {
      setLoading(true);

      // IMPORTANT: funcționează DOAR când ești în “recovery session”
      // (adică aplicația a fost deschisă din link-ul de reset)
      const { error } = await supabase.auth.updateUser({ password: p1 });

      if (error) {
        notify(
          "Nu pot salva parola",
          error.message ||
            "Link-ul de reset nu este activ sau a expirat. Cere un link nou.",
        );
        return;
      }

      notify("Gata!", "Parola a fost schimbată. Te poți loga.");
      navigation.replace(ROUTES.Login);
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  }, [p1, p2, navigation, notify]);

  // ✅ cerința ta: când e ascuns -> 🙈, când e vizibil -> 👁 Vezi
  const eye1 = show1 ? "👁 Vezi" : "🙈";
  const eye2 = show2 ? "👁 Vezi" : "🙈";

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Parolă nouă</Text>

          <View style={styles.passRow}>
            <TextInput
              value={p1}
              onChangeText={setP1}
              placeholder="Parolă nouă"
              secureTextEntry={!show1}
              style={[styles.input, styles.passInput]}
              placeholderTextColor="#9aa4b2"
              editable={!loading}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => p2Ref.current?.focus?.()}
            />
            <TouchableOpacity
              onPress={() => setShow1((v) => !v)}
              style={styles.eyeBtn}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.eyeText}>{eye1}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.passRow}>
            <TextInput
              ref={p2Ref}
              value={p2}
              onChangeText={setP2}
              placeholder="Confirmă parola"
              secureTextEntry={!show2}
              style={[styles.input, styles.passInput]}
              placeholderTextColor="#9aa4b2"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={onSave}
            />
            <TouchableOpacity
              onPress={() => setShow2((v) => !v)}
              style={styles.eyeBtn}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.eyeText}>{eye2}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryBtn}
            onPress={onSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Salvează</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.linkBtn}
            onPress={() => navigation.replace(ROUTES.ForgotPassword)}
            disabled={loading}
          >
            <Text style={styles.linkText}>Cere alt link</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fb" },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
  },

  input: {
    borderWidth: 1,
    borderColor: "#e6eaf2",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    marginTop: 12,
  },

  passRow: { position: "relative" },
  passInput: { paddingRight: 110 },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 12,
    height: 48,
    justifyContent: "center",
  },
  eyeText: {
    fontWeight: "900",
    color: "#111",
    fontFamily: Platform.OS === "web" ? "system-ui" : undefined,
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#0B69FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  linkBtn: { marginTop: 14, alignItems: "center" },
  linkText: { color: "#0B69FF", fontWeight: "900" },
});
