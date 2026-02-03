// src/screens/LoginScreen.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

export default function LoginScreen({ navigation, route }) {
  const passRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
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

  const onLogin = useCallback(async () => {
    const e = String(email || "").trim();
    if (!e || !password) {
      notify("Lipsesc date", "Completează email + parolă.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      });

      if (error) {
        const msg = String(error.message || "");
        const low = msg.toLowerCase();

        if (
          low.includes("invalid login credentials") ||
          low.includes("invalid credentials") ||
          low.includes("invalid password")
        ) {
          notify("Parolă greșită", "Parola nu se potrivește.");
          return;
        }

        notify("Autentificare eșuată", msg);
        return;
      }

      if (!data?.session?.user) {
        notify("Eroare", "Nu am primit sesiune după login.");
        return;
      }

      // ✅ NU navigăm aici.
      // AppNavigator detectează session și face redirect corect:
      // - web -> Home
      // - mobile -> Tabs
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare la autentificare.");
    } finally {
      setLoading(false);
    }
  }, [email, password, notify]);

  const goRegister = useCallback(() => {
    navigation.replace(ROUTES.Register);
  }, [navigation]);

  const goForgot = useCallback(() => {
    navigation.navigate(ROUTES.ForgotPassword, {
      email: String(email || "").trim(),
    });
  }, [navigation, email]);

  const eyeLabel = showPass ? "👁 Vezi" : "🙈";

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#9aa4b2"
          editable={!loading}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passRef.current?.focus?.()}
        />

        <View style={styles.passRow}>
          <TextInput
            ref={passRef}
            value={password}
            onChangeText={setPassword}
            placeholder="Parolă"
            secureTextEntry={!showPass}
            style={[styles.input, styles.passInput]}
            placeholderTextColor="#9aa4b2"
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={onLogin}
          />

          <TouchableOpacity
            onPress={() => setShowPass((v) => !v)}
            style={styles.eyeBtn}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.eyeText}>{eyeLabel}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryBtn}
          onPress={onLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Autentificare</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.secondaryBtn}
          onPress={goForgot}
          disabled={loading}
        >
          <Text style={styles.secondaryText}>Ai uitat parola?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.linkBtn}
          onPress={goRegister}
          disabled={loading}
        >
          <Text style={styles.linkText}>Nu ai cont? Creează unul</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f5f7fb",
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
    marginBottom: 10,
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
    marginTop: 10,
  },

  passRow: { position: "relative", marginTop: 10 },
  passInput: { marginTop: 0, paddingRight: 110 },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
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

  secondaryBtn: {
    marginTop: 12,
    backgroundColor: "#eef2ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dbe3ff",
  },
  secondaryText: { color: "#2b4cff", fontWeight: "900", fontSize: 15 },

  linkBtn: { marginTop: 14, alignItems: "center" },
  linkText: { color: "#0B69FF", fontWeight: "900" },
});
