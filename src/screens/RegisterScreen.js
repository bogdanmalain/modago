/**
 * ================================
 * REGISTERSCREEN
 * ================================
 * KeyboardAvoidingView + ScrollView + kbOpen listener
 * -> justifyContent: kbOpen ? "flex-end" : "center" = centrare + push
 *
 * FIX v2: eyeBtn centrat cu INPUT_HEIGHT
 *       + autoCorrect/textContentType/autoComplete pe input-uri
 *       + placeholderTextColor fallback la tokens.muted
 */

import React, {
  useCallback,
  useRef,
  useState,
  useContext,
  useEffect,
  useMemo,
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
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";
import AppButton from "../components/AppButton";

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

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

  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const s1 = Keyboard.addListener(showEvt, () => setKbOpen(true));
    const s2 = Keyboard.addListener(hideEvt, () => setKbOpen(false));

    return () => {
      s1?.remove?.();
      s2?.remove?.();
    };
  }, []);

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

      navigation.replace(ROUTES.Login, { email: e });
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare la înregistrare.");
    } finally {
      setLoading(false);
    }
  }, [email, password, password2, navigation, notify]);

  const eye1 = showPass1 ? "👁 Vezi" : "🙈";
  const eye2 = showPass2 ? "👁 Vezi" : "🙈";

  const styles = useMemo(
    () => makeStyles(tokens, insets, kbOpen),
    [tokens, insets, kbOpen],
  );

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrap}>
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
              placeholderTextColor={tokens.subtext ?? tokens.muted}
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
                secureTextEntry={!showPass1}
                style={[styles.input, styles.passInput]}
                placeholderTextColor={tokens.subtext ?? tokens.muted}
                editable={!loading}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => pass2Ref.current?.focus?.()}
                autoCorrect={false}
                textContentType="none"
                autoComplete="off"
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
                placeholderTextColor={tokens.subtext ?? tokens.muted}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={onRegister}
                autoCorrect={false}
                textContentType="none"
                autoComplete="off"
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

            <AppButton
              title="Înregistrare"
              onPress={onRegister}
              loading={loading}
              disabled={loading}
              variant="primary"
              height={52}
              radius={14}
              style={{ marginTop: 14 }}
            />

            {existingAccount && (
              <AppButton
                title="Ai uitat parola?"
                onPress={goForgot}
                disabled={loading}
                variant="outline"
                height={52}
                radius={14}
                style={{ marginTop: 12 }}
              />
            )}

            <AppButton
              title="Ai deja cont? Autentifică-te"
              onPress={goLogin}
              disabled={loading}
              variant="ghost"
              height={40}
              radius={14}
              style={{ marginTop: 14, alignSelf: "center" }}
              textStyle={{ fontSize: 15 }}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ───────── helpers ───────── */

const INPUT_VPAD = 12;
const INPUT_FONT = 16;
const INPUT_BORDER = 1;
const INPUT_HEIGHT = INPUT_VPAD * 2 + INPUT_FONT + INPUT_BORDER * 2;

function makeStyles(tokens, insets, kbOpen) {
  const cardBg =
    tokens?.scheme === "dark"
      ? "rgba(19, 28, 46, 0.55)"
      : "rgba(255, 255, 255, 0.85)";

  const border = tokens?.border ?? "rgba(255,255,255,0.10)";
  const bottomGapWhenKeyboard = 10;

  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: tokens.bg,
    },

    scrollContent: {
      flexGrow: 1,
      paddingTop: Math.max(insets.top, 16) + 18,
      paddingHorizontal: 20,
      justifyContent: kbOpen ? "flex-end" : "center",
      paddingBottom: kbOpen
        ? Math.max(insets.bottom, 8) + bottomGapWhenKeyboard
        : Math.max(insets.bottom, 16) + 22,
    },

    cardWrap: {
      width: "100%",
    },

    card: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
      backgroundColor: cardBg,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: border,
      shadowColor: tokens.shadowColor || "#000",
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

    infoBox: {
      backgroundColor: "rgba(253, 186, 116, 0.14)",
      borderColor: "rgba(253, 186, 116, 0.55)",
      borderWidth: 1,
      padding: 10,
      borderRadius: 14,
      marginTop: 6,
      marginBottom: 6,
    },

    infoText: {
      color: tokens.text,
      fontWeight: "900",
      textAlign: "center",
    },

    input: {
      borderWidth: INPUT_BORDER,
      borderColor: border,
      backgroundColor: "rgba(0,0,0,0.10)",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: INPUT_VPAD,
      fontSize: INPUT_FONT,
      color: tokens.text,
      marginTop: 10,
    },

    passRow: {
      position: "relative",
      marginTop: 10,
    },

    passInput: {
      marginTop: 0,
      paddingRight: 110,
    },

    eyeBtn: {
      position: "absolute",
      right: 12,
      top: 0,
      height: INPUT_HEIGHT,
      justifyContent: "center",
      alignItems: "center",
    },

    eyeText: {
      fontWeight: "900",
      color: tokens.text,
    },
  });
}
