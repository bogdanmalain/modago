// src/screens/ResetPasswordScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import * as Linking from "expo-linking";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

function parseParamsFromUrl(url) {
  if (!url) return {};

  // expo-linking parsează query (?a=b)
  const parsed = Linking.parse(url);
  const qp = { ...(parsed?.queryParams || {}) };

  // multe link-uri Supabase pun tokenurile în #fragment
  // exp://.../--/reset#access_token=...&refresh_token=...&type=recovery
  const hashIdx = url.indexOf("#");
  if (hashIdx >= 0) {
    const frag = url.slice(hashIdx + 1);
    frag.split("&").forEach((pair) => {
      const [k, v] = pair.split("=");
      if (!k) return;
      qp[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
  }

  return qp;
}

export default function ResetPasswordScreen({ navigation, route }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const notify = useCallback((title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const trySetSessionFromUrl = useCallback(
    async (url) => {
      const p = parseParamsFromUrl(url);

      // uneori route.params conține ceva (dacă ai linking config)
      const rp = route?.params || {};
      const access_token = String(p.access_token || rp.access_token || "");
      const refresh_token = String(p.refresh_token || rp.refresh_token || "");
      const code = String(p.code || rp.code || "");

      // Debug util (nu pune tokenurile în log în producție)
      console.log("🔗 reset url:", url);
      console.log(
        "🔑 has access_token?",
        !!access_token,
        "has refresh_token?",
        !!refresh_token,
        "has code?",
        !!code,
      );

      // 1) token flow
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error)
          throw new Error(
            error.message || "Nu pot seta sesiunea (setSession).",
          );
        return true;
      }

      // 2) code flow
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error)
          throw new Error(
            error.message || "Nu pot valida codul (exchangeCode).",
          );
        return true;
      }

      return false;
    },
    [route?.params],
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        // dacă deja ai session, gata
        const { data: s0 } = await supabase.auth.getSession();
        if (!mounted) return;
        if (s0?.session) {
          setChecking(false);
          return;
        }

        // 1) încearcă din initial URL
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const ok = await trySetSessionFromUrl(initialUrl);
          if (ok) {
            const { data: s1 } = await supabase.auth.getSession();
            if (!mounted) return;
            setChecking(false);
            if (!s1?.session)
              notify("Eroare", "Nu am primit sesiune după link.");
            return;
          }
        }

        // 2) ascultă event-uri de URL (uneori aici vine link-ul complet)
        const sub = Linking.addEventListener("url", async ({ url }) => {
          try {
            const ok = await trySetSessionFromUrl(url);
            if (!mounted) return;
            if (ok) {
              const { data: s2 } = await supabase.auth.getSession();
              if (!mounted) return;
              setChecking(false);
              if (!s2?.session)
                notify("Eroare", "Nu am primit sesiune după link.");
            }
          } catch (e) {
            if (!mounted) return;
            setChecking(false);
            notify("Eroare", e?.message || "Eroare la procesarea link-ului.");
          }
        });

        // dacă după puțin timp încă nu avem session, lăsăm UI-ul să meargă,
        // iar la Save îți spune clar ce lipsește
        setTimeout(async () => {
          if (!mounted) return;
          const { data } = await supabase.auth.getSession();
          if (!mounted) return;
          setChecking(false);
          if (!data?.session) {
            // nu alertăm agresiv aici (că poate încă nu a venit event-ul),
            // dar UI va funcționa și va spune la Save.
          }
        }, 700);

        return () => sub?.remove?.();
      } catch (e) {
        if (!mounted) return;
        setChecking(false);
        notify("Eroare", e?.message || "Eroare la inițializare reset.");
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [notify, trySetSessionFromUrl]);

  const onSave = useCallback(async () => {
    if (!password || !password2) {
      notify("Lipsesc date", "Completează parola și confirmarea.");
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
      setBusy(true);

      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        notify(
          "Eroare",
          "Auth session missing! Deschide din nou link-ul de reset (cel mai recent) și încearcă iar.",
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        notify("Eroare", error.message || "Nu am putut schimba parola.");
        return;
      }

      await supabase.auth.signOut();
      notify("Gata", "Parola a fost schimbată. Te poți autentifica acum.");
      navigation.replace(ROUTES.Login);
    } catch (e) {
      notify("Eroare", e?.message || "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  }, [password, password2, navigation, notify]);

  const eyeLabel = showPass ? "👁 Vezi" : "🙈";

  const subtitle = useMemo(() => {
    if (checking) return "Validăm link-ul de resetare...";
    return "Alege o parolă nouă pentru contul tău.";
  }, [checking]);

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Parolă nouă</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {checking ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : (
          <>
            <View style={styles.passRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Parolă nouă"
                secureTextEntry={!showPass}
                style={[styles.input, styles.passInput]}
                placeholderTextColor="#9aa4b2"
                editable={!busy}
                returnKeyType="next"
              />

              <TouchableOpacity
                onPress={() => setShowPass((v) => !v)}
                style={styles.eyeBtn}
                activeOpacity={0.8}
                disabled={busy}
              >
                <Text style={styles.eyeText}>{eyeLabel}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={password2}
              onChangeText={setPassword2}
              placeholder="Repetă parola"
              secureTextEntry={!showPass}
              style={styles.input}
              placeholderTextColor="#9aa4b2"
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={onSave}
            />

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primaryBtn}
              onPress={onSave}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Salvează parola</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.linkBtn}
              onPress={() => navigation.replace(ROUTES.Login)}
              disabled={busy}
            >
              <Text style={styles.linkText}>Înapoi la autentificare</Text>
            </TouchableOpacity>
          </>
        )}
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
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 10,
    color: "#556070",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
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
  linkBtn: { marginTop: 14, alignItems: "center" },
  linkText: { color: "#0B69FF", fontWeight: "900" },
});
