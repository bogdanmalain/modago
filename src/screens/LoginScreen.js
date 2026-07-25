/**
 * ================================
 * LOGINSCREEN
 * ================================
 * ScrollView simplu + Animated.translateY
 * -> AppState + blur/refocus = fix revenire din altă app
 * -> eyeBtn centrat cu INPUT_HEIGHT
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
  Animated,
  AppState,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";
import AppButton from "../components/AppButton";
import SocialAuthButtons from "../components/SocialAuthButtons";
import { isSocialAuthAvailable } from "../services/socialAuthService";

export default function LoginScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const { tokens } = useContext(ThemeContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const shiftY = useRef(new Animated.Value(0)).current;
  const kbVisible = useRef(false);
  const lastKbH = useRef(0);

  useEffect(() => {
    const incoming = route?.params?.email;
    if (incoming) setEmail(String(incoming));
  }, [route?.params?.email]);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const animateUp = (e) => {
      kbVisible.current = true;
      const kbH = e.endCoordinates.height;
      lastKbH.current = kbH;
      Animated.timing(shiftY, {
        toValue: -(kbH / 3.5 + 25),
        duration: Platform.OS === "ios" ? e.duration || 250 : 250,
        useNativeDriver: true,
      }).start();
    };

    const animateDown = (e) => {
      kbVisible.current = false;
      Animated.timing(shiftY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration || 250 : 250,
        useNativeDriver: true,
      }).start();
    };

    const s1 = Keyboard.addListener(showEvt, animateUp);
    const s2 = Keyboard.addListener(hideEvt, animateDown);

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setTimeout(() => {
          if (kbVisible.current && lastKbH.current > 0) {
            const focused = passRef.current?.isFocused?.() ? passRef : emailRef;
            focused.current?.blur?.();
            setTimeout(() => {
              focused.current?.focus?.();
            }, 50);
          } else if (!kbVisible.current) {
            shiftY.setValue(0);
          }
        }, 300);
      }
    });

    return () => {
      s1?.remove?.();
      s2?.remove?.();
      appSub?.remove?.();
    };
  }, [shiftY]);

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
    } catch (err) {
      notify("Eroare", err?.message || "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  }, [email, password, notify]);

  const styles = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      scrollEnabled={false}
    >
      <Animated.View
        style={[styles.cardWrap, { transform: [{ translateY: shiftY }] }]}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Login</Text>

          <TextInput
            ref={emailRef}
            value={email}
            onChangeText={setEmail}
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
              secureTextEntry={!showPass}
              style={[styles.input, styles.passInput]}
              placeholderTextColor={tokens.subtext ?? tokens.muted}
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

          {isSocialAuthAvailable() && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>sau</Text>
                <View style={styles.dividerLine} />
              </View>

              <SocialAuthButtons disabled={loading} />
            </>
          )}

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
      </Animated.View>
    </ScrollView>
  );
}

/* ───────── helpers ───────── */

const INPUT_VPAD = 12;
const INPUT_FONT = 16;
const INPUT_BORDER = 1;
const INPUT_HEIGHT = INPUT_VPAD * 2 + INPUT_FONT + INPUT_BORDER * 2;

function makeStyles(tokens, insets) {
  const cardBg =
    tokens.scheme === "dark"
      ? "rgba(19, 28, 46, 0.55)"
      : "rgba(255,255,255,0.85)";

  const border = tokens?.border ?? "rgba(255,255,255,0.10)";

  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      backgroundColor: tokens.bg,
      justifyContent: "center",
      paddingTop: Math.max(insets.top, 16) + 18,
      paddingBottom: Math.max(insets.bottom, 16) + 22,
      paddingHorizontal: 20,
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

    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 18,
      marginBottom: 4,
    },

    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: border,
    },

    dividerText: {
      marginHorizontal: 10,
      color: tokens.subtext ?? tokens.muted,
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
