// src/screens/WelcomeScreen.js
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;

  const tiles = useMemo(
    () => [
      { id: "1", src: require("../../assets/welcome/1.jpg") },
      { id: "2", src: require("../../assets/welcome/2.jpg") },
      { id: "3", src: require("../../assets/welcome/3.jpg") },
      { id: "4", src: require("../../assets/welcome/4.jpg") },
      { id: "5", src: require("../../assets/welcome/5.jpg") },
      { id: "6", src: require("../../assets/welcome/6.jpg") },
    ],
    []
  );

  const col = 3;
  const gap = 10;
  const pad = 18;
  const tileSize = Math.floor((width - pad * 2 - gap * (col - 1)) / col);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top */}
      <View style={styles.topRow}>
        <View style={styles.langRow}>
          <Text style={styles.globe}>🌐</Text>
          <Text style={styles.langText}>Română</Text>
          <Text style={styles.chev}>▾</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Omitere</Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <View style={[styles.tilesWrap, { paddingHorizontal: pad }]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
          {tiles.map((t) => (
            <View
              key={t.id}
              style={[styles.tile, { width: tileSize, height: tileSize * 1.1 }]}
            >
              <Image source={t.src} style={styles.tileImg} />
            </View>
          ))}
        </View>
      </View>

      {/* Text */}
      <View style={styles.headlineWrap}>
        <Text style={[styles.headline, isSmall && { fontSize: 30 }]}>
          De la nou la vechi{"\n"}și iar la nou.
        </Text>
      </View>

      {/* CTA */}
      <View style={styles.btnWrap}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryText}>Înregistrează-te pe ModaGo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>Am deja un cont</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Despre ModaGo:{" "}
          <Text style={styles.footerLink}>Platforma noastră</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1417" },

  topRow: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 12 : 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  langRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  globe: { fontSize: 16 },
  langText: { color: "#dfe7ee", fontWeight: "700", fontSize: 16 },
  chev: { color: "#dfe7ee" },

  skipBtn: { padding: 8 },
  skipText: { color: "#9fb0bf", fontWeight: "800" },

  tilesWrap: { marginTop: 18 },
  tile: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1c242a",
  },
  tileImg: { width: "100%", height: "100%" },

  headlineWrap: { marginTop: 28, paddingHorizontal: 22 },
  headline: {
    color: "#e8f0f6",
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 40,
  },

  btnWrap: { marginTop: 26, paddingHorizontal: 22 },
  primaryBtn: {
    backgroundColor: "#3d96a4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#081214", fontWeight: "900", fontSize: 16 },

  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#3d96a4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#3d96a4", fontWeight: "900", fontSize: 16 },

  footer: {
    marginTop: 18,
    textAlign: "center",
    color: "#9fb0bf",
    fontWeight: "600",
  },
  footerLink: { color: "#b9c8d6", textDecorationLine: "underline" },
});
