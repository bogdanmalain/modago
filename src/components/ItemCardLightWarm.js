// src/components/ItemCardLightWarm.js
import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";

export default function ItemCardLightWarm({
  item,
  mainImage,
  imagesCount = 0,
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
        <View style={styles.imageWrap}>
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

          {/* dots (dacă ai) */}
          {dots}

          {/* ❤️ pill alb + count badge */}
          <Pressable
            onPress={onToggleFav}
            style={styles.heartPill}
            hitSlop={10}
          >
            <Text style={[styles.heart, isFav && styles.heartActive]}>
              {isFav ? "♥" : "♡"}
            </Text>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>{favCount}</Text>
            </View>
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

          <View style={styles.divider} />

          <Text numberOfLines={1} style={styles.meta}>
            {item?.category || "Categorie"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // warm “paper” + shadow elegant
  cardOuter: {
    flex: 1,
    card: {
      backgroundColor: "#FFFFFF",
    }, // warm off-white
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  cardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EDE7DD",
  },

  imageWrap: {
    padding: 8,
    paddingBottom: 0,
    position: "relative",
  },

  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#EEE",
  },

  noImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: { color: "#6B7280", fontWeight: "800" },

  // ❤️ in imagine, dreapta-jos
  heartPill: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heart: { fontSize: 22, fontWeight: "900", color: "#111827" },
  heartActive: { color: "#EF4444" },

  countBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  countText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },

  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 18,
  },

  price: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#2F6BFF", // accent (poți lega ulterior la tema)
  },

  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: "#EFE7DC",
  },

  meta: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
});
