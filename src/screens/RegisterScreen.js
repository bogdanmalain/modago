// src/screens/RegisterScreen.js
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
} from "react-native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

export default function RegisterScreen({ navigation }) {
  const passRef = useRef(null);
  const pass2Ref = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const [loading, setLoading] = useState(false);

  const [existingAccount, setExistingAccount] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  const notify = useCallback((title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const normalize = (s) => String(s || "").toLowerCase();

  const isAlreadyRegisteredError = (msg) => {
    const m = normalize(msg);
    return (
      m.includes("already registered") ||
      m.includes("already exists") ||
      m.includes("user already") ||
      m.includes("email address is already") ||
      m.includes("duplicate key") ||
      m.includes("unique constraint")
    );
  };

  const goLogin = useCallback(() => {
    navigation.replace(ROUTES.Login, { email: String(email || "").trim() });
  }, [navigation, email]);

  const goForgot = useCallback(() => {
    // ⚠️ Dacă nu ai ruta ForgotPassword definită în routes + AppNavigator,
    // asta va da "NAVIGATE not handled".
    navigation.navigate(ROUTES.ForgotPassword, {
      email: String(email || "").trim(),
    });
  }, [navigation, email]);

  const onRegister = useCallback(async () => {
    const e = String(email || "").trim();

    setExistingAccount(false);
    setInfoMsg("");

    if (!e || !password || !password2) {
      notify("Lipsesc date", "Completează email + parolă.");
      return;
    }
    if (password.length < 6) {
      notify("Parolă prea scurtă", "Minim 6 caractere.");
      return;
    }
    if (password !== password2) {
      notify("Parole diferite", "Parolele nu coincid.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
      });

      if (error) {
        if (isAlreadyRegisteredError(error.message)) {
          setExistingAccount(true);
          setInfoMsg("Există deja un cont cu acest email.");
          return;
        }
        notify("Înregistrare eșuată", error.message);
        return;
      }

      const identities = data?.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        setExistingAccount(true);
        setInfoMsg("Există deja un cont cu acest email.");
        return;
      }

      // ⚠️ Dacă nu ai ruta VerifyEmail definită în routes + AppNavigator,
      // asta va da "NAVIGATE not handled".
      // după signUp reușit
      navigation.replace(ROUTES.Login, { email: e });
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare la înregistrare.");
    } finally {
      setLoading(false);
    }
  }, [email, password, password2, navigation, notify]);

  const eye1 = showPass1 ? "👁 Vezi" : "🙈";
  const eye2 = showPass2 ? "👁 Vezi" : "🙈";

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Creează cont</Text>

        {!!infoMsg && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{infoMsg}</Text>
          </View>
        )}

        <TextInput
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (existingAccount) {
              setExistingAccount(false);
              setInfoMsg("");
            }
          }}
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
            secureTextEntry={!showPass1}
            style={[styles.input, styles.passInput]}
            placeholderTextColor="#9aa4b2"
            editable={!loading}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => pass2Ref.current?.focus?.()}
          />
          <TouchableOpacity
            onPress={() => setShowPass1((v) => !v)}
            style={styles.eyeBtn}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.eyeText}>{eye1}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.passRow}>
          <TextInput
            ref={pass2Ref}
            value={password2}
            onChangeText={setPassword2}
            placeholder="Repetă parola"
            secureTextEntry={!showPass2}
            style={[styles.input, styles.passInput]}
            placeholderTextColor="#9aa4b2"
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={onRegister}
          />
          <TouchableOpacity
            onPress={() => setShowPass2((v) => !v)}
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
          onPress={onRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Înregistrare</Text>
          )}
        </TouchableOpacity>

        {existingAccount && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.secondaryBtn}
            onPress={goForgot}
            disabled={loading}
          >
            <Text style={styles.secondaryText}>Ai uitat parola?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.linkBtn}
          onPress={goLogin}
          disabled={loading}
        >
          <Text style={styles.linkText}>Ai deja cont? Autentifică-te</Text>
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

  infoBox: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  infoText: { color: "#9a3412", fontWeight: "900", textAlign: "center" },

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
