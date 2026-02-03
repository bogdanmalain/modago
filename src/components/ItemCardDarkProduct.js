// src/components/ItemCardDarkProduct.js
import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";

export default function ItemCardDarkProduct({
  item,
  mainImage,
  dots = null,
  isFav = false,
  favCount = 0,
  onPressCard,
  onToggleFav,
  GAP = 12,
}) {
  return (
    <Pressable
      onPress={onPressCard}
      style={({ pressed }) => [
        styles.cardOuter,
        pressed && { transform: [{ scale: 0.99 }] },
        { marginBottom: GAP },
      ]}
    >
      <View style={styles.cardInner}>
        <View style={styles.imageBox}>
          {mainImage ? (
            <Image
              source={{ uri: mainImage }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>Fără imagine</Text>
            </View>
          )}

          {dots}

          {/* ❤️ pill dark pe poză (ca mockup) */}
          <Pressable onPress={onToggleFav} style={styles.favPill} hitSlop={10}>
            <Text style={[styles.favHeart, isFav && styles.favHeartActive]}>
              {isFav ? "♥" : "♡"}
            </Text>
            <Text style={styles.favCount}>{favCount}</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text numberOfLines={2} style={styles.title}>
            {item?.title || "-"}
          </Text>

          <Text numberOfLines={1} style={styles.price}>
            {typeof item?.price === "number" ? item.price : item?.price || "-"}{" "}
            lei
          </Text>

          <Text numberOfLines={1} style={styles.meta}>
            {item?.category || "Categorie"}
          </Text>

          <View style={styles.divider} />

          <Text numberOfLines={1} style={styles.metaMuted}>
            {item?.description || ""}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    flex: 1,
    borderRadius: 22,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  cardInner: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0F1220",
  },

  imageBox: {
    position: "relative",
    padding: 8,
    paddingBottom: 0,
  },

  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "#141A2C",
  },

  noImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "#141A2C",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },

  // pill ca în mockup: inimă + count în același pill
  favPill: {
    position: "absolute",
    right: 14,
    bottom: 14,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  favHeart: { fontSize: 18, fontWeight: "900", color: "rgba(255,255,255,0.9)" },
  favHeartActive: { color: "#EF4444" },
  favCount: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "900",
    fontSize: 14,
  },

  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },

  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 18,
  },

  price: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#2F6BFF",
  },

  meta: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.70)",
  },

  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  metaMuted: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.50)",
  },
});
