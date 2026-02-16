/**
 * ================================
 * LOGINSCREEN – VARIANTA STABILĂ +15px
 * ================================
 *
 * 🔒 FĂRĂ KeyboardAvoidingView
 * 🔒 FĂRĂ calcule pe tastatură
 * 🔒 FĂRĂ kbOpen / transform / flex-end
 *
 * ✅ Fără tremurat la Email ↔ Parolă
 * ✅ Card stabil
 * ✅ iOS safe
 *
 * 🔧 Doar standardizare butoane cu AppButton (brand teal via tokens.primary)
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";
import AppButton from "../components/AppButton";

export default function LoginScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const passRef = useRef(null);
  const { tokens } = useContext(ThemeContext);

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
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("invalid")) {
          notify("Autentificare eșuată", "Email sau parolă greșită.");
          return;
        }
        notify("Eroare", error.message);
        return;
      }

      if (!data?.session?.user) {
        notify("Eroare", "Nu am primit sesiune.");
        return;
      }

      // Redirectul este gestionat de AppNavigator
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  }, [email, password, notify]);

  const styles = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Login</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor={tokens.subtext}
            editable={!loading}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passRef.current?.focus?.()}
            autoCorrect={false}
            textContentType="none"
            autoComplete="off"
          />

          <View style={styles.passRow}>
            <TextInput
              ref={passRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Parolă"
              secureTextEntry={!showPass}
              style={[styles.input, styles.passInput]}
              placeholderTextColor={tokens.subtext}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={onLogin}
              autoCorrect={false}
              textContentType="none"
              autoComplete="off"
            />

            <TouchableOpacity
              onPress={() => setShowPass((v) => !v)}
              style={styles.eyeBtn}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.eyeText}>{showPass ? "👁 Vezi" : "🙈"}</Text>
            </TouchableOpacity>
          </View>

          <AppButton
            title="Autentificare"
            onPress={onLogin}
            loading={loading}
            disabled={loading}
            variant="primary"
            height={52}
            radius={14}
            style={{ marginTop: 14 }}
          />

          <AppButton
            title="Ai uitat parola?"
            onPress={() =>
              navigation.navigate(ROUTES.ForgotPassword, {
                email: email.trim(),
              })
            }
            disabled={loading}
            variant="outline"
            height={52}
            radius={14}
            style={{ marginTop: 12 }}
          />

          <AppButton
            title="Nu ai cont? Creează unul"
            onPress={() => navigation.replace(ROUTES.Register)}
            disabled={loading}
            variant="ghost"
            height={40}
            radius={14}
            style={{ marginTop: 14, alignSelf: "center" }}
            textStyle={{ fontSize: 15 }}
          />
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function makeStyles(tokens, insets) {
  const cardBg =
    tokens.scheme === "dark"
      ? "rgba(19, 28, 46, 0.55)"
      : "rgba(255,255,255,0.85)";

  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: tokens.bg,
    },

    container: {
      flexGrow: 1,
      paddingTop: Math.max(insets.top, 16) + 32,
      paddingBottom: Math.max(insets.bottom, 16) + 32,
      paddingHorizontal: 20,
      justifyContent: "center",
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

      // 🔧 ridicare card 15px (fix)
      marginBottom: 140,

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
      marginBottom: 10,
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
      marginTop: 10,
    },

    passRow: { position: "relative", marginTop: 10 },
    passInput: { paddingRight: 110 },

    eyeBtn: {
      position: "absolute",
      right: 12,
      top: 0,
      height: 48,
      justifyContent: "center",
    },

    eyeText: {
      fontWeight: "900",
      color: tokens.text,
    },
  });
}
