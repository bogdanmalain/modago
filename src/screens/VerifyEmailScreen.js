// src/screens/VerifyEmailScreen.js
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

export default function VerifyEmailScreen({ navigation, route }) {
  const email = useMemo(
    () => String(route?.params?.email || "").trim(),
    [route]
  );
  const [loading, setLoading] = useState(false);

  const goLogin = useCallback(() => {
    navigation.replace(ROUTES.Login);
  }, [navigation]);

  const resend = useCallback(async () => {
    if (!email) {
      Alert.alert("Email lipsă", "Nu am primit email-ul. Revino la Register.");
      navigation.replace(ROUTES.Register);
      return;
    }

    try {
      setLoading(true);

      // supabase-js v2 are resend
      const fn = supabase?.auth?.resend;

      if (typeof fn !== "function") {
        Alert.alert(
          "Nu pot retrimite automat",
          "În versiunea ta de Supabase SDK lipsește funcția resend. Verifică inbox/spam sau fă din nou Register."
        );
        return;
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        Alert.alert("Nu s-a putut retrimite", error.message);
        return;
      }

      Alert.alert(
        "Trimis",
        "Am retrimis email-ul de confirmare. Verifică inbox/spam."
      );
    } catch (err) {
      Alert.alert("Eroare", err?.message || "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  }, [email, navigation]);

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Verifică email-ul</Text>

        <Text style={styles.text}>
          Ți-am trimis un email de confirmare{email ? ` către:` : "."}
        </Text>

        {!!email && <Text style={styles.email}>{email}</Text>}

        <Text style={[styles.text, { marginTop: 12 }]}>
          După ce confirmi, revii aici și te autentifici.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.9}
          onPress={goLogin}
          disabled={loading}
        >
          <Text style={styles.primaryText}>Mergi la Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.9}
          onPress={resend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.secondaryText}>Retrimite email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          activeOpacity={0.9}
          onPress={() => navigation.replace(ROUTES.Register)}
          disabled={loading}
        >
          <Text style={styles.linkText}>Schimbă email-ul</Text>
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
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
    marginBottom: 10,
    textAlign: "center",
  },
  text: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  email: {
    marginTop: 10,
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    color: "#0B69FF",
  },
  primaryBtn: {
    marginTop: 18,
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
