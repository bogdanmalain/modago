// src/components/ItemCardDarkProduct.js
// COMPONENTĂ: ItemCardDarkProduct
// MODIFICARE:
// - scos complet afișajul pentru numărul de poze
// - imagesCount rămâne eliminat din UI
// - metaRow păstrează doar categoria
// - restul logicii rămâne neschimbată

import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
} from "react-native";

const ICON = 44;
const BADGE_MIN = 22;

export default function ItemCardDarkProduct({
  item,
  mainImage,
  dots = null,
  isFav = false,
  favCount = 0,
  onPressCard,
  onToggleFav,
  GAP = 12,
  tokens = {},
}) {
  const primary = tokens?.primary ?? "#3fa9b5";
  const card = tokens?.card ?? "#111A2E";
  const text = tokens?.text ?? "#E5E7EB";
  const muted = tokens?.muted ?? "#9CA3AF";
  const border = tokens?.border ?? "rgba(255,255,255,0.10)";
  const danger = tokens?.danger ?? "#F87171";
  const onPrimary = tokens?.onPrimary ?? "#FFFFFF";

  const countText = favCount > 99 ? "99+" : String(favCount || 0);

  const dynamicBadgeWidth = useMemo(() => {
    if (countText.length === 1) return BADGE_MIN;
    if (countText.length === 2) return BADGE_MIN + 6;
    return BADGE_MIN + 12;
  }, [countText]);

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
      <View
        style={[
          styles.cardInner,
          { backgroundColor: card, borderColor: border },
        ]}
      >
        {/* IMAGE */}
        <View style={styles.imageWrap}>
          {mainImage ? (
            <Image
              source={{ uri: mainImage }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.noImage,
                { backgroundColor: "rgba(255,255,255,0.06)" },
              ]}
            >
              <Text style={{ color: muted, fontWeight: "800" }}>
                Fără imagine
              </Text>
            </View>
          )}
          {dots}
        </View>

        {/* CONTENT */}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: text }]} numberOfLines={2}>
              {item?.title}
            </Text>

            <View style={styles.favWrap}>
              <View style={{ position: "relative" }}>
                <Pressable onPress={onToggleFav} hitSlop={8}>
                  <Animated.View
                    style={[
                      styles.favCircle,
                      isFav
                        ? styles.favCircleActive
                        : [styles.favCircleIdle, { borderColor: border }],
                      { transform: [{ scale: pulse }] },
                    ]}
                  >
                    {!isFav ? (
                      <Text style={[styles.heartGhost, { color: muted }]}>
                        ♡
                      </Text>
                    ) : (
                      <Text style={[styles.heartSolid, { color: danger }]}>
                        ❤
                      </Text>
                    )}
                  </Animated.View>
                </Pressable>

                {favCount > 0 && (
                  <View
                    style={[
                      styles.countPill,
                      { minWidth: dynamicBadgeWidth, backgroundColor: primary },
                    ]}
                  >
                    <Text style={[styles.countText, { color: onPrimary }]}>
                      {countText}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={[styles.price, { color: primary }]}>
            {item?.price} lei
          </Text>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.catPill,
                {
                  backgroundColor: `${primary}30`,
                  borderColor: `${primary}50`,
                },
              ]}
            >
              <Text style={[styles.catText, { color: text }]}>
                {item?.category}
              </Text>
            </View>
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
    borderWidth: 1,
  },
  imageWrap: { width: "100%", aspectRatio: 1 },
  image: { width: "100%", height: "100%" },
  noImage: {
    flex: 1,
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
  favCircleIdle: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
  },
  favCircleActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  heartGhost: { fontSize: 18, fontWeight: "900" },
  heartSolid: { fontSize: 18, fontWeight: "900" },
  countPill: {
    position: "absolute",
    right: -6,
    bottom: -6,
    height: BADGE_MIN,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
    zIndex: 10,
  },
  countText: { fontSize: 12, fontWeight: "900" },
  price: { marginTop: 8, fontSize: 18, fontWeight: "900" },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  catPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  catText: { fontWeight: "800", fontSize: 13 },
});
