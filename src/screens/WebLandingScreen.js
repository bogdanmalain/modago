// src/screens/WebLandingScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native";

export default function WebLandingScreen({ onSellNow, onHowItWorks }) {
  // imagine de fundal (web). Poți schimba oricând cu alta.
  const HERO =
    "https://images.unsplash.com/photo-1520975682031-a0c5d9bd25e8?auto=format&fit=crop&w=2400&q=80";

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={{ uri: HERO }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={styles.card}>
          <Text style={styles.title}>Ești gata să-ți eliberezi garderoba?</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onSellNow}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryText}>Vinde acum</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={onHowItWorks}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Află cum funcționează</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },

  hero: {
    flex: 1,
    justifyContent: "center",
    minHeight: 560,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  card: {
    width: 380,
    maxWidth: "90%",
    marginLeft: 90,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e6e8eb",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 2,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
    marginBottom: 16,
  },

  // ✅ păstrăm culoarea ta
  primaryBtn: {
    backgroundColor: "#0B69FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },

  linkBtn: { marginTop: 12, alignItems: "center" },
  linkText: { color: "#0B69FF", fontWeight: "800", fontSize: 14 },
});
