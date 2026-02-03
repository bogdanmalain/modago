// src/screens/ForgotPasswordScreen.js
import React, { useCallback, useEffect, useState } from "react";
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

export default function ForgotPasswordScreen({ navigation, route }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const incoming = route?.params?.email;
    if (incoming) setEmail(String(incoming));
  }, [route?.params?.email]);

  const notify = useCallback((title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const onSend = useCallback(async () => {
    const e = String(email || "").trim();
    if (!e) {
      notify(
        "Email lipsă",
        "Introdu email-ul ca să putem trimite resetarea parolei.",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        // web: revii la site; mobile: deep link (îl setăm separat când facem linking)
        redirectTo: Platform.OS === "web" ? window.location.origin : undefined,
      });

      if (error) {
        notify("Reset eșuat", error.message);
        return;
      }

      notify(
        "Verifică email-ul",
        "Dacă există un cont pe acest email, ți-am trimis link de resetare (verifică și spam).",
      );
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  }, [email, notify]);

  const backToLogin = useCallback(() => {
    navigation.replace(ROUTES.Login, { email: String(email || "").trim() });
  }, [navigation, email]);

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
          <Text style={styles.title}>Resetează parola</Text>
          <Text style={styles.subtitle}>
            Introdu email-ul și îți trimitem un link de resetare.
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#9aa4b2"
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={onSend}
          />

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryBtn}
            onPress={onSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Trimite link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.linkBtn}
            onPress={backToLogin}
            disabled={loading}
          >
            <Text style={styles.linkText}>Înapoi la Login</Text>
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
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: { color: "#334155", fontWeight: "700", textAlign: "center" },

  input: {
    borderWidth: 1,
    borderColor: "#e6eaf2",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    marginTop: 14,
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
