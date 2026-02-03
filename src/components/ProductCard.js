// src/components/ProductCard.js
import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function pickFirstImage(item) {
  const arr = item?.images || item?.image_urls || item?.photos || [];
  if (Array.isArray(arr) && arr.length > 0) return arr[0];
  if (item?.image_url) return item.image_url;
  if (item?.image) return item.image;
  return null;
}

function formatPriceLei(value) {
  if (value === null || value === undefined) return "";
  const n = Number(value);
  if (Number.isFinite(n)) return `${n} lei`;
  return `${String(value)} lei`;
}

function normalizeCategory(item) {
  return (
    item?.category_label ||
    item?.category ||
    item?.gender ||
    item?.type ||
    item?.section ||
    ""
  );
}

function ProductCard({
  item,
  onPress,
  liked = false,
  likeCount = 0,
  accentColor = "#2563EB",
}) {
  const img = useMemo(() => pickFirstImage(item), [item]);
  const title = String(item?.title || item?.name || "Produs");
  const price = formatPriceLei(item?.price ?? item?.amount ?? "");
  const category = String(normalizeCategory(item));

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      android_ripple={{ color: "rgba(0,0,0,0.05)" }}
    >
      {/* IMAGE 1:1 */}
      <View style={styles.imageWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="image" size={22} color="#9CA3AF" />
          </View>
        )}

        {/* LIKE OVERLAY (bottom-right) */}
        <View style={styles.likeOverlay}>
          <View style={styles.likeCircle}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={14}
              color={liked ? "#EF4444" : "#FFFFFF"}
            />
          </View>
          <Text style={styles.likeCount}>
            {Math.max(0, Number(likeCount) || 0)}
          </Text>
        </View>
      </View>

      {/* CONTENT */}
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>

        {!!price && (
          <Text
            style={[styles.price, { color: accentColor }]}
            numberOfLines={1}
          >
            {price}
          </Text>
        )}

        {!!category && (
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default memo(ProductCard);

const R = 14;

const styles = StyleSheet.create({
  // Card: warm white, premium
  card: {
    backgroundColor: "#FCFBF7", // alb cald / murdar
    borderRadius: R,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",

    // shadow spec din mockup
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  imageWrap: {
    width: "100%",
    aspectRatio: 1, // 1:1
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Like overlay
  likeOverlay: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)", // #000 / .45
    alignItems: "center",
    justifyContent: "center",
  },
  likeCount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 999,
    overflow: "hidden",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  body: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },

  // Title 14 bold
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 18,
  },

  // Price 16 bold accent
  price: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
  },

  category: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
});
