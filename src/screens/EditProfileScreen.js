// src/screens/EditProfileScreen.js
// CE ESTE:
// - ecran mobil pentru editarea profilului utilizatorului
//
// MODIFICĂRI:
// - păstrat FIX-ul keyboard-aware
// - redus contrastul vizual: carduri, inputuri și buton back au border mai soft
// - cardurile sunt mai apropiate de aspectul primei variante bune
// - păstrată logica existentă pentru update profil și parolă
// - theme-aware, fără să afecteze restul aplicației

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
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function withAlpha(hex, alpha) {
  if (!hex || typeof hex !== "string") return hex;

  if (hex.startsWith("rgba(") || hex.startsWith("rgb(")) return hex;

  let c = hex.replace("#", "").trim();

  if (c.length === 3) {
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  }

  if (c.length !== 6) return hex;

  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType = "default",
  returnKeyType = "done",
  onSubmitEditing,
  S,
}) {
  return (
    <View style={S.fieldWrap}>
      <Text style={S.fieldLabel}>{label}</Text>

      <TextInput
        style={S.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={S.__colors.placeholder}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [session, setSession] = useState(null);
  const user = session?.user || null;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let sub;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      setSession(sess);

      const currentUser = sess?.user ?? null;
      const currentName =
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.display_name ||
        currentUser?.user_metadata?.name ||
        (currentUser?.email ? currentUser.email.split("@")[0] : "");

      setDisplayName(currentName || "");
      setEmail(currentUser?.email || "");
      setLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_e, newSess) => {
          setSession(newSess ?? null);
        },
      );

      sub = listener?.subscription;
    })();

    return () => sub?.unsubscribe?.();
  }, []);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
  }, [navigation]);

  const onSaveProfile = useCallback(async () => {
    if (!user) {
      Alert.alert("Eroare", "Nu există utilizator logat.");
      return;
    }

    Keyboard.dismiss();

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const currentName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.name ||
      (user?.email ? user.email.split("@")[0] : "");

    const currentEmail = (user?.email || "").trim().toLowerCase();

    const wantsNameUpdate = trimmedName && trimmedName !== currentName;
    const wantsEmailUpdate = trimmedEmail && trimmedEmail !== currentEmail;

    if (!wantsNameUpdate && !wantsEmailUpdate) {
      Alert.alert("Nimic de salvat", "Nu ai modificat numele sau email-ul.");
      return;
    }

    if (!trimmedName) {
      Alert.alert("Nume invalid", "Numele afișat nu poate fi gol.");
      return;
    }

    if (!trimmedEmail) {
      Alert.alert("Email invalid", "Email-ul nu poate fi gol.");
      return;
    }

    setSavingProfile(true);

    try {
      const payload = {
        data: {
          full_name: trimmedName,
          display_name: trimmedName,
          name: trimmedName,
        },
      };

      if (wantsEmailUpdate) {
        payload.email = trimmedEmail;
      }

      const { error } = await supabase.auth.updateUser(payload);

      if (error) throw error;

      const successMessages = [];
      if (wantsNameUpdate) successMessages.push("numele a fost actualizat");
      if (wantsEmailUpdate) {
        successMessages.push(
          "email-ul a fost actualizat (poate necesita confirmare pe email)",
        );
      }

      Alert.alert(
        "Profil actualizat",
        successMessages.join("\n• ").replace(/^/, "• "),
      );
    } catch (e) {
      console.log("❌ update profile error:", e);
      Alert.alert(
        "Eroare",
        e?.message || "Nu am putut salva modificările profilului.",
      );
    } finally {
      setSavingProfile(false);
    }
  }, [user, displayName, email]);

  const onSavePassword = useCallback(async () => {
    if (!user) {
      Alert.alert("Eroare", "Nu există utilizator logat.");
      return;
    }

    Keyboard.dismiss();

    if (!newPassword && !newPassword2) {
      Alert.alert("Nimic de salvat", "Introdu o parolă nouă.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Parolă prea scurtă",
        "Parola trebuie să aibă minimum 6 caractere.",
      );
      return;
    }

    if (newPassword !== newPassword2) {
      Alert.alert("Parole diferite", "Confirmarea parolei nu se potrivește.");
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setNewPassword2("");

      Alert.alert("Succes", "Parola a fost actualizată.");
    } catch (e) {
      console.log("❌ update password error:", e);
      Alert.alert("Eroare", e?.message || "Nu am putut actualiza parola.");
    } finally {
      setSavingPassword(false);
    }
  }, [user, newPassword, newPassword2]);

  if (loading) {
    return (
      <View style={[S.screen, S.centered]}>
        <ActivityIndicator size="large" color={S.__colors.primary} />
      </View>
    );
  }

  return (
    <View style={S.screen}>
      <KeyboardAvoidingView
        style={S.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top, 12)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={S.screen}
            contentContainerStyle={[
              S.content,
              {
                paddingTop: Math.max(insets.top, 12),
                paddingBottom: Math.max(insets.bottom, 18) + 28,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            contentInsetAdjustmentBehavior="always"
          >
            <View style={S.header}>
              <TouchableOpacity
                style={S.backBtn}
                activeOpacity={0.9}
                onPress={goBackSafe}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={S.__colors.text}
                />
              </TouchableOpacity>

              <Text style={S.title}>Editează profilul</Text>

              <View style={S.headerSpacer} />
            </View>

            <View style={S.card}>
              <Text style={S.sectionTitle}>Date profil</Text>

              <Field
                label="Nume afișat"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ex: Bobo"
                autoCapitalize="words"
                returnKeyType="next"
                S={S}
              />

              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="nume@email.com"
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                S={S}
              />

              <TouchableOpacity
                style={[S.saveBtn, savingProfile && S.saveBtnDisabled]}
                activeOpacity={0.9}
                onPress={onSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator
                    size="small"
                    color={S.__colors.onPrimary}
                  />
                ) : (
                  <Text style={S.saveBtnText}>Salvează profilul</Text>
                )}
              </TouchableOpacity>

              <Text style={S.helperText}>
                Dacă schimbi email-ul, Supabase poate cere confirmare pe noua
                adresă.
              </Text>
            </View>

            <View style={S.card}>
              <Text style={S.sectionTitle}>Schimbă parola</Text>

              <Field
                label="Parolă nouă"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimum 6 caractere"
                secureTextEntry
                returnKeyType="next"
                S={S}
              />

              <Field
                label="Confirmă parola nouă"
                value={newPassword2}
                onChangeText={setNewPassword2}
                placeholder="Confirmă parola"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={onSavePassword}
                S={S}
              />

              <TouchableOpacity
                style={[S.saveBtn, savingPassword && S.saveBtnDisabled]}
                activeOpacity={0.9}
                onPress={onSavePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator
                    size="small"
                    color={S.__colors.onPrimary}
                  />
                ) : (
                  <Text style={S.saveBtnText}>Actualizează parola</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#071633");
  const text = pickTok(tokens, "text", "#EAF1FF");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#9AA8C7"));
  const primary = pickTok(
    tokens,
    "primary",
    pickTok(tokens, "accent", "#4DB6C4"),
  );
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");

  const baseCard = pickTok(tokens, "card", "#0D1C42");
  const surfaceElevated = pickTok(tokens, "surfaceElevated", baseCard);
  const placeholder = pickTok(tokens, "placeholder", muted);

  const softBorder =
    pickTok(tokens, "borderSoft", null) ||
    withAlpha(text, 0.09) ||
    "rgba(255,255,255,0.09)";

  const softerBorder =
    pickTok(tokens, "divider", null) ||
    withAlpha(text, 0.06) ||
    "rgba(255,255,255,0.06)";

  const cardBg =
    pickTok(tokens, "surfaceOverlay", null) ||
    withAlpha(baseCard, 0.82) ||
    baseCard;

  const inputBg = pickTok(tokens, "inputBg", null) || withAlpha(bg, 0.58) || bg;

  const backBg =
    pickTok(tokens, "surfaceOverlay", null) ||
    withAlpha(baseCard, 0.6) ||
    baseCard;

  return StyleSheet.create({
    __colors: {
      bg,
      text,
      muted,
      primary,
      onPrimary,
      placeholder,
      softBorder,
      softerBorder,
      cardBg,
      inputBg,
      backBg,
    },

    flex: {
      flex: 1,
    },

    screen: {
      flex: 1,
      backgroundColor: bg,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 16,
      backgroundColor: bg,
    },

    centered: {
      justifyContent: "center",
      alignItems: "center",
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
    },

    backBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: backBg,
      borderWidth: 1,
      borderColor: softerBorder,
    },

    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "900",
      color: text,
    },

    headerSpacer: {
      width: 48,
    },

    card: {
      backgroundColor: cardBg,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: softerBorder,
      padding: 16,
      marginBottom: 18,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: text,
      marginBottom: 18,
    },

    fieldWrap: {
      marginBottom: 14,
    },

    fieldLabel: {
      fontSize: 14,
      fontWeight: "800",
      color: text,
      marginBottom: 8,
    },

    input: {
      minHeight: 56,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: softBorder,
      backgroundColor: inputBg,
      color: text,
      paddingHorizontal: 16,
      fontSize: 16,
      fontWeight: "700",
    },

    helperText: {
      marginTop: 16,
      fontSize: 13,
      lineHeight: 20,
      color: muted,
      fontWeight: "600",
    },

    saveBtn: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },

    saveBtnDisabled: {
      opacity: 0.7,
    },

    saveBtnText: {
      color: onPrimary,
      fontSize: 16,
      fontWeight: "900",
    },
  });
}
