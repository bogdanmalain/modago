// =============================
// MODIFICARE:
// - countPill este acum poziționat RELATIV la cercul inimii
// - NU mai este legat de card
// - Inima rămâne identică
// =============================

import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";

const ICON_SIZE = 40;
const BADGE_MIN = 22;

export default function ItemCardLightWarm({
  item,
  mainImage,
  imagesCount = 0,
  isFav = false,
  favCount = 0,
  onPressCard,
  onToggleFav,
  GAP = 12,
}) {
  const countText = favCount > 99 ? "99+" : String(favCount || 0);

  const dynamicBadgeWidth =
    countText.length === 1
      ? BADGE_MIN
      : countText.length === 2
        ? BADGE_MIN + 6
        : BADGE_MIN + 12;

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
        {/* IMAGE */}
        <View style={styles.imageWrap}>
          {mainImage ? (
            <Image
              source={{ uri: mainImage }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={{ fontWeight: "700" }}>Fără imagine</Text>
            </View>
          )}
        </View>

        {/* CONTENT */}
        <View style={styles.contentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {item?.title}
            </Text>

            <Text style={styles.price}>{item?.price} lei</Text>

            <Text style={styles.meta}>{item?.category}</Text>

            <Text style={styles.meta}>{imagesCount} poze</Text>
          </View>

          {/* ❤️ FAVORITE */}
          <View style={styles.favWrap}>
            <View style={{ position: "relative" }}>
              <Pressable
                onPress={onToggleFav}
                style={({ pressed }) => [
                  styles.favCircle,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={styles.heart}>{isFav ? "❤" : "♡"}</Text>
              </Pressable>

              {favCount > 0 && (
                <View
                  style={[styles.countPill, { minWidth: dynamicBadgeWidth }]}
                >
                  <Text style={styles.countText}>{countText}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    flex: 1,
  },

  cardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  imageWrap: {
    width: "100%",
    aspectRatio: 1,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  noImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
  },

  contentRow: {
    padding: 12,
    flexDirection: "row",
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },

  price: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "900",
    color: "#2CA6A4",
  },

  meta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  favWrap: {
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  favCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  heart: {
    fontSize: 18,
    color: "#EF4444",
  },

  // 🔥 acum e legat de cerc
  countPill: {
    position: "absolute",
    right: -6,
    bottom: -6,
    height: BADGE_MIN,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#2CA6A4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
});
