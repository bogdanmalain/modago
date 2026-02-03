// src/screens/InboxScreen.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function InboxScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Mesaje</Text>
      <Text style={styles.sub}>În curând: chat + inbox ca în Vinted.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#141823",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  sub: {
    marginTop: 10,
    color: "#9aa4b2",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
