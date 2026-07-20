// src/screens/BalanceScreen.js
// ================================
// src/screens/BalanceScreen.js
// ================================
// CE ESTE:
// -> ecranul de Sold pentru varianta mobilă ModaGo
//
// MODIFICĂRI:
// -> FIX: info pentru "Sold în așteptare" apare acum ca bottom sheet,
//    de jos în sus, similar cu flow-ul din ItemDetails
// -> păstrat ecranul principal simplu: header + sold în așteptare + sold disponibil
// -> păstrat MDL
// -> theme-aware

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
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";
import { getMyBalance, createWithdrawalRequest } from "../services/orderService";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function BalanceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const { height: SCREEN_H } = Dimensions.get("window");

  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;
  const [pendingInfoVisible, setPendingInfoVisible] = useState(false);
  const [balance, setBalance] = useState({ pending_mdl: 0, available_mdl: 0 });
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [iban, setIban] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const loadBalance = useCallback(() => {
    setLoadingBalance(true);
    return getMyBalance()
      .then(setBalance)
      .catch(() => {})
      .finally(() => setLoadingBalance(false));
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const S = useMemo(
    () => makeStyles(tokens, insets, SCREEN_H),
    [tokens, insets, SCREEN_H],
  );

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
  }, [navigation]);

  const openPendingInfo = useCallback(() => {
    setPendingInfoVisible(true);
    sheetY.setValue(SCREEN_H);

    requestAnimationFrame(() => {
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [SCREEN_H, sheetY]);

  const closePendingInfo = useCallback(() => {
    Animated.timing(sheetY, {
      toValue: SCREEN_H,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPendingInfoVisible(false);
      sheetY.setValue(SCREEN_H);
    });
  }, [SCREEN_H, sheetY]);

  const openWithdraw = useCallback(() => {
    setCardHolderName("");
    setCardNumber("");
    setIban("");
    setWithdrawAmount(
      balance.available_mdl > 0 ? String(balance.available_mdl) : "",
    );
    setWithdrawVisible(true);
  }, [balance.available_mdl]);

  const closeWithdraw = useCallback(() => {
    if (submittingWithdraw) return;
    setWithdrawVisible(false);
  }, [submittingWithdraw]);

  const submitWithdraw = useCallback(async () => {
    const amount = Number(String(withdrawAmount).replace(",", "."));
    const digitsOnly = cardNumber.replace(/\D/g, "");
    const ibanDigitsAndLetters = iban.replace(/\s/g, "");

    if (!cardHolderName.trim()) {
      Alert.alert("Date incomplete", "Introdu numele titularului cardului.");
      return;
    }
    if (digitsOnly.length < 12) {
      Alert.alert("Card invalid", "Introdu un număr de card valid.");
      return;
    }
    if (ibanDigitsAndLetters.length < 15) {
      Alert.alert(
        "IBAN invalid",
        "Introdu contul bancar (IBAN) unde vrei să primești banii.",
      );
      return;
    }
    if (!amount || amount <= 0) {
      Alert.alert("Sumă invalidă", "Introdu o sumă validă de retras.");
      return;
    }
    if (amount > balance.available_mdl) {
      Alert.alert(
        "Sumă prea mare",
        "Nu poți retrage mai mult decât soldul disponibil.",
      );
      return;
    }

    setSubmittingWithdraw(true);
    try {
      await createWithdrawalRequest({
        amount_mdl: amount,
        card_holder_name: cardHolderName,
        card_number: cardNumber,
        iban,
      });
      setWithdrawVisible(false);
      await loadBalance();
      Alert.alert(
        "Cerere trimisă",
        "Cererea ta de retragere a fost înregistrată și va fi procesată în curând.",
      );
    } catch (e) {
      Alert.alert(
        "Eroare",
        e?.message || "Nu am putut trimite cererea de retragere.",
      );
    } finally {
      setSubmittingWithdraw(false);
    }
  }, [
    withdrawAmount,
    cardNumber,
    cardHolderName,
    iban,
    balance.available_mdl,
    loadBalance,
  ]);

  return (
    <View style={S.screen}>
      <ScrollView
        style={S.screen}
        contentContainerStyle={[
          S.content,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 18) + 18,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={S.header}>
          <TouchableOpacity
            style={S.backBtn}
            activeOpacity={0.9}
            onPress={goBackSafe}
          >
            <Ionicons name="chevron-back" size={22} color={S.__colors.text} />
          </TouchableOpacity>

          <Text style={S.title}>Sold</Text>

          <View style={S.headerSpacer} />
        </View>

        <View style={S.pendingRow}>
          <View style={S.pendingLeft}>
            <Text style={S.pendingLabel}>Sold în așteptare</Text>
          </View>

          <View style={S.pendingRight}>
            {loadingBalance ? (
              <ActivityIndicator color={S.__colors.muted} size="small" />
            ) : (
              <Text style={S.pendingValue}>
                {balance.pending_mdl.toFixed(2)} MDL
              </Text>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={openPendingInfo}
              style={S.infoCircle}
            >
              <Ionicons
                name="information-outline"
                size={18}
                color={S.__colors.muted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={S.balanceHero}>
          {loadingBalance ? (
            <ActivityIndicator color={S.__colors.text} size="large" />
          ) : (
            <Text style={S.balanceValue}>
              {balance.available_mdl.toFixed(2)} MDL
            </Text>
          )}
          <Text style={S.balanceCaption}>Sold disponibil</Text>

          <TouchableOpacity
            style={[
              S.withdrawBtn,
              (loadingBalance || balance.available_mdl <= 0) &&
                S.withdrawBtnDisabled,
            ]}
            activeOpacity={0.9}
            disabled={loadingBalance || balance.available_mdl <= 0}
            onPress={openWithdraw}
          >
            <Ionicons name="card-outline" size={18} color={S.__colors.onPrimary} />
            <Text style={S.withdrawBtnText}>Retrage fonduri</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={pendingInfoVisible}
        transparent
        animationType="none"
        onRequestClose={closePendingInfo}
      >
        <View style={S.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closePendingInfo}
          />

          <Animated.View
            style={[
              S.sheetRoot,
              {
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <View style={S.sheetHandleWrap}>
              <View style={S.sheetHandle} />
            </View>

            <View style={S.sheetHeader}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={closePendingInfo}
                style={S.sheetHeaderBtn}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={S.__colors.sheetText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={closePendingInfo}
                style={S.sheetHeaderBtn}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={S.__colors.sheetText}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={S.sheetScrollContent}
            >
              <Text style={S.sheetTitle}>Sold în așteptare</Text>

              <Text style={S.sheetParagraph}>
                Atunci când un cumpărător plătește pentru un articol, această
                plată apare „în așteptare” în soldul vânzătorului.
              </Text>

              <Text style={S.sheetParagraph}>
                Fondurile din „Sold în așteptare” sunt stocate temporar de către
                furnizorul nostru de servicii de plată până la finalizarea
                comenzii.
              </Text>

              <Text style={S.sheetParagraph}>
                Cumpărătorii au la dispoziție{" "}
                <Text style={S.sheetBold}>2 zile</Text> de la notificarea că
                articolul ar fi trebuit livrat sau că pare pierdută comanda,
                pentru a apăsa fie „Totul este în regulă” pentru a finaliza
                comanda sau „Am o problemă” pentru a depune o reclamație.
              </Text>

              <Text style={S.sheetParagraph}>
                <Text style={S.sheetBold}>Comanda va fi finalizată</Text> după
                ce cumpărătorul apasă „Totul este în regulă” sau dacă o problemă
                este semnalată și rezolvată.
              </Text>

              <Text style={S.sheetParagraph}>
                De îndată ce comanda este finalizată, tu îți vei primi plata în
                termen de 2 zile. Plata va trece la „Sold disponibil”.
              </Text>

              <View style={S.sheetDivider} />

              <Text style={S.sheetTitleSecondary}>Sold disponibil</Text>

              <Text style={S.sheetParagraph}>
                Poți folosi toate fondurile din „Sold disponibil” în 2 moduri.
                Le poți retrage în contul tău bancar sau le poți utiliza pentru
                a cumpăra de la alți membri.
              </Text>

              <Text style={S.sheetParagraph}>
                Soldul disponibil poate acoperi prețul unui articol, precum și
                taxa de protecție pentru cumpărător și costurile de expediere.
                Dacă nu retragi banii, se vor aplica automat următoarei tale
                achiziții.
              </Text>

              <View style={{ height: Math.max(insets.bottom, 20) + 12 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={withdrawVisible}
        transparent
        animationType="slide"
        onRequestClose={closeWithdraw}
      >
        <KeyboardAvoidingView
          style={S.sheetOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeWithdraw} />

          <View style={S.withdrawSheet}>
            <View style={S.sheetHandleWrap}>
              <View style={S.sheetHandle} />
            </View>

            <View style={S.sheetHeader}>
              <Text style={S.sheetTitleSecondary}>Retrage fonduri</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={closeWithdraw}
                style={S.sheetHeaderBtn}
              >
                <Ionicons name="close" size={22} color={S.__colors.sheetText} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={S.withdrawFormContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={S.fieldLabel}>Titular card</Text>
              <TextInput
                style={S.input}
                placeholder="Nume Prenume"
                placeholderTextColor={S.__colors.muted}
                value={cardHolderName}
                onChangeText={setCardHolderName}
                autoCapitalize="words"
              />

              <Text style={S.fieldLabel}>Număr card</Text>
              <TextInput
                style={S.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={S.__colors.muted}
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="number-pad"
                maxLength={19}
              />

              <Text style={S.fieldLabel}>IBAN (contul unde primești banii)</Text>
              <TextInput
                style={S.input}
                placeholder="MD24 AG00 0000 0000 1234 5678"
                placeholderTextColor={S.__colors.muted}
                value={iban}
                onChangeText={setIban}
                autoCapitalize="characters"
              />

              <Text style={S.fieldLabel}>Sumă de retras (MDL)</Text>
              <TextInput
                style={S.input}
                placeholder="0.00"
                placeholderTextColor={S.__colors.muted}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="decimal-pad"
              />

              <Text style={S.withdrawHint}>
                Disponibil pentru retragere: {balance.available_mdl.toFixed(2)} MDL
              </Text>

              <TouchableOpacity
                style={[
                  S.submitWithdrawBtn,
                  submittingWithdraw && S.withdrawBtnDisabled,
                ]}
                activeOpacity={0.9}
                disabled={submittingWithdraw}
                onPress={submitWithdraw}
              >
                {submittingWithdraw ? (
                  <ActivityIndicator color={S.__colors.onPrimary} />
                ) : (
                  <Text style={S.withdrawBtnText}>Trimite cererea</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: Math.max(insets.bottom, 20) + 12 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(tokens, insets, SCREEN_H) {
  const isDark = tokens?.scheme === "dark";

  const bg = pickTok(tokens, "bg", "#0B1220");
  const card = pickTok(tokens, "card", "#111A2E");
  const text = pickTok(tokens, "text", "#E5E7EB");
  const muted = pickTok(tokens, "muted", "#9CA3AF");
  const border = pickTok(tokens, "border", "rgba(255,255,255,0.10)");
  const shadowColor = pickTok(tokens, "shadowColor", "#000");

  const surfaceSoft = pickTok(
    tokens,
    "surfaceSoft",
    isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
  );

  const sheetBg = pickTok(tokens, "card", isDark ? "#0F172A" : "#FFFFFF");
  const sheetText = pickTok(tokens, "text", isDark ? "#EAF2F7" : "#0F172A");
  const sheetMuted = pickTok(
    tokens,
    "muted",
    isDark ? "rgba(234,242,247,0.76)" : "rgba(15,23,42,0.68)",
  );
  const sheetOverlay = isDark ? "rgba(0,0,0,0.46)" : "rgba(15,23,42,0.26)";
  const handleColor = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.16)";
  const sheetDivider = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(15,23,42,0.08)";

  const primary = pickTok(tokens, "primary", pickTok(tokens, "accent", "#2EC4B6"));
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";

  return StyleSheet.create({
    __colors: {
      text,
      muted,
      sheetText,
      onPrimary,
    },

    screen: {
      flex: 1,
      backgroundColor: bg,
    },

    content: {
      paddingHorizontal: 16,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
    },

    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "900",
      color: text,
    },

    headerSpacer: {
      width: 44,
    },

    pendingRow: {
      minHeight: 58,
      borderRadius: 18,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    pendingLeft: {
      flex: 1,
      paddingRight: 12,
    },

    pendingLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: muted,
    },

    pendingRight: {
      flexDirection: "row",
      alignItems: "center",
    },

    pendingValue: {
      fontSize: 16,
      fontWeight: "700",
      color: muted,
      marginRight: 10,
    },

    infoCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: border,
      backgroundColor: "transparent",
    },

    balanceHero: {
      alignItems: "center",
      paddingVertical: 18,
    },

    balanceValue: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "900",
      color: text,
    },

    balanceCaption: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: "600",
      color: muted,
    },

    withdrawBtn: {
      marginTop: 22,
      minHeight: 50,
      paddingHorizontal: 24,
      borderRadius: 25,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: primary,
      gap: 8,
    },

    withdrawBtnDisabled: {
      opacity: 0.5,
    },

    withdrawBtnText: {
      color: onPrimary,
      fontSize: 16,
      fontWeight: "800",
    },

    withdrawSheet: {
      backgroundColor: sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: border,
      maxHeight: SCREEN_H * 0.85,
    },

    withdrawFormContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },

    fieldLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: sheetMuted,
      marginBottom: 8,
      marginTop: 14,
    },

    input: {
      minHeight: 50,
      borderRadius: 14,
      paddingHorizontal: 16,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: border,
      color: sheetText,
      fontSize: 16,
      fontWeight: "600",
    },

    withdrawHint: {
      marginTop: 14,
      fontSize: 14,
      fontWeight: "600",
      color: sheetMuted,
    },

    submitWithdrawBtn: {
      marginTop: 22,
      minHeight: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: primary,
    },

    sheetOverlay: {
      flex: 1,
      backgroundColor: sheetOverlay,
      justifyContent: "flex-end",
    },

    sheetRoot: {
      backgroundColor: sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: border,
      minHeight: SCREEN_H * 0.84,
      maxHeight: SCREEN_H * 0.92,
      shadowColor,
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -6 },
      elevation: 10,
    },

    sheetHandleWrap: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 2,
    },

    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: handleColor,
    },

    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 6,
    },

    sheetHeaderBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: surfaceSoft,
    },

    sheetScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom, 18) + 14,
    },

    sheetTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "900",
      color: sheetText,
      marginBottom: 18,
    },

    sheetTitleSecondary: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "900",
      color: sheetText,
      marginBottom: 16,
      marginTop: 4,
    },

    sheetParagraph: {
      fontSize: 16,
      lineHeight: 28,
      color: sheetMuted,
      fontWeight: "500",
      marginBottom: 18,
    },

    sheetBold: {
      color: sheetText,
      fontWeight: "900",
    },

    sheetDivider: {
      height: 1,
      backgroundColor: sheetDivider,
      marginVertical: 8,
    },
  });
}