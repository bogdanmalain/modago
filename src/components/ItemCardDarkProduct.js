// src/components/ItemCardDarkProduct.js
// =============================
// MODIFICARE (DOAR ASTA):
// - countPill este acum poziționat RELATIV la cercul inimii (right:-6, bottom:-6)
// - badge-ul e ajustabil (ex: 7 / 12 / 99+), ca la Light
// - IMPORTANT: NU există state local pentru isFav (folosește strict prop-ul isFav),
//   ca să nu-ți mai dispară favoritele deja încărcate
// =============================

import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
} from "react-native";

const ICON = 44; // cercul inimii (dark)
const BADGE_MIN = 22;

export default function ItemCardDarkProduct({
  item,
  mainImage,
  imagesCount = 0,
  isFav = false,
  favCount = 0,
  onPressCard,
  onToggleFav,
  GAP = 12,
}) {
  // --- badge text (99+) + width dinamic ---
  const countText = favCount > 99 ? "99+" : String(favCount || 0);

  const dynamicBadgeWidth = useMemo(() => {
    if (countText.length === 1) return BADGE_MIN;
    if (countText.length === 2) return BADGE_MIN + 6;
    return BADGE_MIN + 12;
  }, [countText]);

  // --- pulse subtle când devine fav ---
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isFav) return;
    pulse.setValue(1);
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.08,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFav, pulse]);

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
              <Text
                style={{ color: "rgba(255,255,255,0.8)", fontWeight: "800" }}
              >
                Fără imagine
              </Text>
            </View>
          )}
        </View>

        {/* CONTENT */}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item?.title}
            </Text>

            {/* ❤️ FAVORITE (cerc + badge relativ la cerc) */}
            <View style={styles.favWrap}>
              <View style={{ position: "relative" }}>
                <Pressable onPress={onToggleFav} hitSlop={8}>
                  <Animated.View
                    style={[
                      styles.favCircle,
                      isFav ? styles.favCircleActive : styles.favCircleIdle,
                      { transform: [{ scale: pulse }] },
                    ]}
                  >
                    {/* ghost heart când NU e fav */}
                    {!isFav ? (
                      <Text style={styles.heartGhost}>♡</Text>
                    ) : (
                      <Text style={styles.heartSolid}>❤</Text>
                    )}
                  </Animated.View>
                </Pressable>

                {/* badge doar când are sens (>=1) */}
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

          <Text style={styles.price}>{item?.price} lei</Text>

          <View style={styles.metaRow}>
            <View style={styles.catPill}>
              <Text style={styles.catText}>{item?.category}</Text>
            </View>

            <Text style={styles.photosText}>{imagesCount} poze</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: { flex: 1 },

  cardInner: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0B1620",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  imageWrap: { width: "100%", aspectRatio: 1 },
  image: { width: "100%", height: "100%" },

  noImage: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  body: { padding: 12 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#EAF2F7",
    paddingRight: 10,
  },

  favWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  favCircle: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // idle = “OLX-ish ghost heart” (fără alb, fără count special)
  favCircleIdle: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  // active = cerc alb + inimă roșie
  favCircleActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },

  heartGhost: {
    fontSize: 18,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "900",
  },

  heartSolid: {
    fontSize: 18,
    color: "#EF4444",
    fontWeight: "900",
  },

  // 🔥 badge relativ la cercul inimii (ca la Light)
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
    borderColor: "rgba(255,255,255,0.95)",
    zIndex: 10,
  },

  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },

  price: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "900",
    color: "#2CA6A4",
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  catPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(44,166,164,0.18)",
    borderWidth: 1,
    borderColor: "rgba(44,166,164,0.30)",
  },

  catText: {
    color: "#CFEFEE",
    fontWeight: "800",
    fontSize: 13,
  },

  photosText: {
    color: "rgba(255,255,255,0.60)",
    fontWeight: "800",
  },
});
