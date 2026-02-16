// src/screens/ForgotPasswordScreen.js
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ThemeContext } from "../theme/ThemeProvider";
import AppButton from "../components/AppButton";

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme } = useContext(ThemeContext);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ doar ca să știm dacă tastatura e deschisă (pentru poziționare)
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const s1 = Keyboard.addListener(showEvt, () => setKbOpen(true));
    const s2 = Keyboard.addListener(hideEvt, () => setKbOpen(false));

    // ✅ iOS: dacă intri în altă aplicație, nu mai primești mereu "hide"
    const appSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") setKbOpen(false);
    });

    return () => {
      s1?.remove?.();
      s2?.remove?.();
      appSub?.remove?.();
    };
  }, []);

  const notify = useCallback((title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const onSend = useCallback(async () => {
    if (!email.trim()) {
      notify("Email lipsă", "Introdu adresa de email.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        notify("Eroare", error.message);
        return;
      }

      notify("Email trimis", "Verifică inbox-ul pentru pașii de resetare.");
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  }, [email, notify]);

  const styles = useMemo(
    () => makeStyles(tokens, insets, scheme, kbOpen),
    [tokens, insets, scheme, kbOpen],
  );

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Resetare parolă</Text>

          {/* ✅ NU atingem textul */}
          <Text style={styles.subtitle}>
            Îți trimitem un email cu pașii de resetare.
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor={tokens.subtext}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={onSend}
          />

          <AppButton
            title="Trimite email"
            onPress={onSend}
            loading={loading}
            disabled={loading}
            variant="primary"
            height={52}
            radius={14}
          />

          <AppButton
            title="Înapoi la autentificare"
            onPress={() => navigation.goBack()}
            disabled={loading}
            variant="ghost"
            height={40}
            radius={14}
            style={{ marginTop: 14, alignSelf: "center" }}
            textStyle={{ fontSize: 15 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(tokens, insets, scheme, kbOpen) {
  const isDark = scheme === "dark";

  const cardBg = isDark ? "rgba(19, 28, 46, 0.55)" : "rgba(255,255,255,0.85)";

  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: tokens.bg,
    },

    // ✅ cheia: când tastatura e DESCHISĂ -> cardul stă jos (deasupra tastaturii)
    // ✅ când tastatura e ÎNCHISĂ -> cardul rămâne centrat (ca înainte)
    scrollContent: {
      flexGrow: 1,
      justifyContent: kbOpen ? "flex-end" : "center",
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top, 16),
      paddingBottom: Math.max(insets.bottom, 16) + (kbOpen ? 14 : 24),
    },

    card: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
      backgroundColor: cardBg,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: tokens.border,

      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 3,
    },

    title: {
      fontSize: 30,
      fontWeight: "900",
      color: tokens.text,
      textAlign: "center",
      marginBottom: 6,
    },

    // ✅ NU schimbăm “cum era” — doar rămâne theme-aware
    subtitle: {
      marginTop: 8,
      marginBottom: 12,
      color:
        tokens.scheme === "dark"
          ? "rgba(200,210,230,0.85)" // 🔥 forțat pentru card dark (iOS safe)
          : tokens.subtext,
      fontWeight: "600",
      textAlign: "center",
    },

    input: {
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: "rgba(0,0,0,0.10)",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: tokens.text,
      marginBottom: 14,
    },
  });
}
