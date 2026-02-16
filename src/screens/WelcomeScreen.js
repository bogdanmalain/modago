/**
 * ==========================================
 * WELCOMESCREEN – AUTO SPACERS (EGAL SUS/JOS)
 * ==========================================
 * ✅ Fără marginTop “din ochi” (nu depinde de iPhone)
 * ✅ Distanță egală: header->conținut == conținut->jos (dinamic)
 * ✅ Păstrăm grid / logo / culori / ordine / cover exact ca acum
 *
 * Assets:
 * - ../../assets/welcome/1.png ... 6.png
 * - ../../assets/logo/modago-logo.png (dark)
 * - ../../assets/logo/modago-logo-light.png (light)
 */

import React, { useMemo, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ThemeContext } from "../theme/ThemeProvider";
import AppButton from "../components/AppButton";

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const images = useMemo(
    () => [
      require("../../assets/welcome/1.png"),
      require("../../assets/welcome/2.png"),
      require("../../assets/welcome/3.png"),
      require("../../assets/welcome/4.png"),
      require("../../assets/welcome/5.png"),
      require("../../assets/welcome/6.png"),
    ],
    [],
  );

  const go = useCallback(
    (routeName) => {
      if (!navigation?.navigate) return;
      try {
        navigation.navigate(routeName);
      } catch (e) {
        console.log("WelcomeScreen navigate error:", e);
        Alert.alert("Navigație", `Nu pot naviga către: ${routeName}`);
      }
    },
    [navigation],
  );

  const openAbout = useCallback(async () => {
    const url = "https://modago.app";
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) return Alert.alert("Link", "Nu pot deschide link-ul.");
      await Linking.openURL(url);
    } catch (e) {
      console.log("Linking error:", e);
      Alert.alert("Link", "A apărut o eroare la deschiderea link-ului.");
    }
  }, []);

  const onPressLanguage = useCallback(() => {
    Alert.alert(
      "Limbă",
      "Selectorul de limbă îl facem după ce stabilizăm restul.",
    );
  }, []);

  // --- sizing grid 3x2 ---
  const { width } = Dimensions.get("window");

  const H_PADDING = 10;
  const GAP = 6;

  const innerW = Math.max(0, width - H_PADDING * 2);
  const rawCard = Math.floor((innerW - GAP * 2) / 3);
  const CARD = Math.max(105, Math.min(rawCard, 150));

  const bg = tokens?.bg ?? "#0b1320";
  const text = tokens?.text ?? "#ffffff";
  const subtext = tokens?.subtext ?? "#9aa4b2";
  const border = tokens?.border ?? "rgba(255,255,255,0.10)";

  // ✅ brand din tokens (oficial)
  const BRAND = tokens?.primary ?? "#3fa9b5";

  const isDark = tokens?.scheme === "dark";

  const styles = useMemo(
    () =>
      makeStyles({
        bg,
        text,
        subtext,
        border,
        insets,
        CARD,
        GAP,
        BRAND,
      }),
    [bg, text, subtext, border, insets, CARD, GAP, BRAND],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.page}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.headerSide}
            onPress={onPressLanguage}
          >
            <Text style={styles.headerText}>🌐 Română</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.logoWrap}>
              <View style={styles.logoCrop} pointerEvents="none">
                <Image
                  source={
                    isDark
                      ? require("../../assets/logo/modago-logo.png")
                      : require("../../assets/logo/modago-logo-light.png")
                  }
                  style={styles.logoImg}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.headerSide, styles.headerSideRight]}
            onPress={() => go("Home")}
          >
            <Text style={styles.headerText}>Omitere</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ SPACER SUS (egalizare automată) */}
        <View style={styles.spacerTop} />

        {/* CONTENT (grid + text + buttons) */}
        <View style={styles.content}>
          {/* GRID */}
          <View style={styles.grid}>
            {images.map((img, i) => (
              <View key={i} style={styles.tile}>
                <Image source={img} style={styles.tileImg} />
              </View>
            ))}
          </View>

          {/* TEXT */}
          <Text style={styles.title}>Din dulap direct{"\n"}în aplicație.</Text>
          <Text style={styles.subtitle}>
            Postezi în 30 secunde. Vinzi simplu. Cumperi safe.
          </Text>

          {/* BUTTONS (AppButton) */}
          <AppButton
            title="Înregistrează-te pe ModaGo"
            onPress={() => go("Register")}
            variant="primary"
            height={52}
            radius={14}
            style={styles.primaryBtn}
          />

          <AppButton
            title="Am deja un cont"
            onPress={() => go("Login")}
            variant="outline"
            height={52}
            radius={14}
            style={styles.secondaryBtn}
          />

          <Text style={styles.footer}>
            Despre ModaGo:{" "}
            <Text style={styles.link} onPress={openAbout}>
              Platforma noastră
            </Text>
          </Text>
        </View>

        {/* ✅ SPACER JOS (egalizare automată) */}
        <View style={styles.spacerBottom} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles({ bg, text, subtext, border, insets, CARD, GAP, BRAND }) {
  const R = 18;

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },

    page: {
      flex: 1,
      backgroundColor: bg,
      paddingHorizontal: 10,
      paddingBottom: Math.max(insets.bottom, 10),
    },

    /* HEADER */
    headerRow: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      marginTop: Platform.OS === "android" ? 6 : 0,
    },
    headerSide: { width: 96, justifyContent: "center" },
    headerSideRight: { alignItems: "flex-end" },
    headerText: { color: subtext, fontWeight: "800", fontSize: 16 },
    headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

    logoWrap: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 16,
    },
    logoCrop: {
      width: 210,
      height: 44,
      borderRadius: 14,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    logoImg: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      transform: [{ scale: 1.35 }, { translateY: 8 }],
    },

    /* ✅ AUTO SPACERS */
    spacerTop: {
      flexGrow: 1,
      minHeight: 8,
      maxHeight: 28,
    },
    spacerBottom: {
      flexGrow: 1,
      minHeight: 8,
      maxHeight: 28,
    },

    /* CONTENT WRAP */
    content: {
      flexShrink: 0,
    },

    /* GRID */
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },

    tile: {
      width: CARD,
      height: Math.round(CARD * 1.45),
      borderRadius: R,
      overflow: "hidden",
      marginBottom: GAP,
      backgroundColor: "rgba(255,255,255,0.04)",
      borderWidth: 1,
      borderColor: border,
    },

    tileImg: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },

    /* TEXT */
    title: {
      marginTop: 6,
      fontSize: 34,
      fontWeight: "900",
      color: text,
      textAlign: "center",
    },
    subtitle: {
      marginTop: 8,
      color: subtext,
      textAlign: "center",
      fontWeight: "700",
      fontSize: 15,
    },

    /* BUTTONS (păstrăm exact width/centrare ca înainte) */
    primaryBtn: {
      marginTop: 16,
      alignSelf: "center",
      width: "88%",
      // culoarea vine din AppButton via tokens.primary
    },
    secondaryBtn: {
      marginTop: 10,
      alignSelf: "center",
      width: "88%",
      // border-ul vine din AppButton via tokens.primary
    },

    footer: {
      marginTop: 12,
      textAlign: "center",
      color: subtext,
      fontWeight: "700",
    },
    link: {
      color: text,
      fontWeight: "900",
      textDecorationLine: "underline",
    },
  });
}
