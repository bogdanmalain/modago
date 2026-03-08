// src/components/ItemCardLightWarm.js
// COMPONENTĂ: ItemCardLightWarm
// MODIFICARE:
// - scos complet afișajul pentru numărul de poze
// - imagesCount rămâne eliminat din UI
// - metaRow păstrează doar categoria
// - restul logicii rămâne neschimbată

import React, { useContext, useMemo } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";

const ICON_SIZE = 40;
const BADGE_MIN = 22;

export default function ItemCardLightWarm({
  item,
  mainImage,
  dots = null,
  isFav = false,
  favCount = 0,
  onPressCard,
  onToggleFav,
  GAP = 12,
}) {
  const { tokens } = useContext(ThemeContext);

  const primary = tokens?.primary ?? "#3fa9b5";
  const card = tokens?.card ?? "#FFFFFF";
  const text = tokens?.text ?? "#111827";
  const muted = tokens?.muted ?? "#6B7280";
  const border = tokens?.border ?? "rgba(0,0,0,0.08)";
  const danger = tokens?.danger ?? "#EF4444";
  const onPrimary = tokens?.onPrimary ?? "#FFFFFF";
  const bg = tokens?.bg ?? "#F3F4F6";

  const countText = favCount > 99 ? "99+" : String(favCount || 0);

  const dynamicBadgeWidth = useMemo(
    () =>
      countText.length === 1
        ? BADGE_MIN
        : countText.length === 2
          ? BADGE_MIN + 6
          : BADGE_MIN + 12,
    [countText],
  );

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
            <View style={[styles.noImage, { backgroundColor: bg }]}>
              <Text style={{ fontWeight: "700", color: muted }}>
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
                <Pressable
                  onPress={onToggleFav}
                  hitSlop={8}
                  style={({ pressed }) => [
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <View
                    style={[
                      styles.favCircle,
                      { backgroundColor: bg, borderColor: border },
                    ]}
                  >
                    <Text
                      style={[styles.heart, { color: isFav ? danger : muted }]}
                    >
                      {isFav ? "❤" : "♡"}
                    </Text>
                  </View>
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
                  backgroundColor: `${primary}22`,
                  borderColor: `${primary}44`,
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
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heart: { fontSize: 18 },
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
    borderColor: "#fff",
  },
  countText: { fontSize: 12, fontWeight: "900" },
  price: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "900",
  },
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
