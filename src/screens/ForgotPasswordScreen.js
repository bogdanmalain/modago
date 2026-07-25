/**
 * ================================
 * FORGOTPASSWORDSCREEN
 * ================================
 * ScrollView simplu + Animated.translateY
 * -> AppState + blur/refocus = fix revenire din altă app
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ThemeContext } from "../theme/ThemeProvider";
import AppButton from "../components/AppButton";
import { ROUTES } from "../navigation/routes";

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme } = useContext(ThemeContext);
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const shiftY = useRef(new Animated.Value(0)).current;
  const kbVisible = useRef(false);
  const lastKbH = useRef(0);

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
            emailRef.current?.blur?.();
            setTimeout(() => {
              emailRef.current?.focus?.();
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

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace(ROUTES.Login);
  }, [navigation]);

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
    () => makeStyles(tokens, insets, scheme),
    [tokens, insets, scheme],
  );

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
          <Text style={styles.title}>Resetare parolă</Text>

          <Text style={styles.subtitle}>
            Îți trimitem un email cu pașii de resetare.
          </Text>

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
            returnKeyType="done"
            onSubmitEditing={onSend}
            autoCorrect={false}
            textContentType="none"
            autoComplete="off"
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
            onPress={goBackSafe}
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

function makeStyles(tokens, insets, scheme) {
  const isDark = scheme === "dark";
  const cardBg = isDark ? "rgba(19, 28, 46, 0.55)" : "rgba(255,255,255,0.85)";
  const border = tokens?.border ?? "rgba(255,255,255,0.10)";

  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      backgroundColor: tokens.bg,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top, 16) + 18,
      paddingBottom: Math.max(insets.bottom, 16) + 22,
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

    subtitle: {
      marginTop: 8,
      marginBottom: 12,
      color: isDark ? "rgba(200,210,230,0.85)" : tokens.subtext,
      fontWeight: "600",
      textAlign: "center",
    },

    input: {
      borderWidth: 1,
      borderColor: border,
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
