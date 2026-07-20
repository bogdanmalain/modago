// src/components/ItemCardDarkProduct.js
// COMPONENTĂ: ItemCardDarkProduct
// MODIFICARE:
// - am schimbat afișarea prețului din Home din RON în MDL
// - am păstrat formatările existente pentru mărimile copiilor, brand și stare
// - restul layout-ului și flow-ul existent rămân neschimbate

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Modal,
  ScrollView,
  Easing,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON = Platform.OS === "android" ? 42 : 44;
const BADGE_MIN = 22;

function toPriceNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const cleaned = String(value ?? "")
    .replace(/\s/g, "")
    .replace("RON", "")
    .replace("MDL", "")
    .replace("Lei", "")
    .replace("lei", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(value) {
  const n = Number(value || 0);
  return `${n.toFixed(2).replace(".", ",")} MDL`;
}

function calculateBuyerProtectionFee(price) {
  const p = Number(price || 0);
  return Number((p * 0.0675).toFixed(2));
}

function calculateShippingFrom(price) {
  const p = Number(price || 0);
  if (p >= 300) return 11.99;
  if (p >= 150) return 8.89;
  return 6.99;
}

function normalizeMetaValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";

  const lowered = text.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return "";

  return text;
}

function toTitleCase(value) {
  const text = normalizeMetaValue(value);
  if (!text) return "";

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatKidsSizeLabel(value) {
  const text = normalizeMetaValue(value);
  if (!text) return "";

  const normalized = text.replace(/\s+/g, "").replace(/_/g, "-");

  const map = {
    "50-56": "0-2 luni / 50-56",
    "62-68": "3-6 luni / 62-68",
    "74-80": "6-12 luni / 74-80",
    "86-92": "1-2 ani / 86-92",
    "98-104": "2-4 ani / 98-104",
    "110-116": "5 ani / 110-116",
    "122-128": "6-8 ani / 122-128",
    "134-140": "8-10 ani / 134-140",
    "146-152": "10-12 ani / 146-152",
    "158-164": "12-14 ani / 158-164",
  };

  return map[normalized] || normalized;
}

function formatDisplaySize(value, item) {
  const text = normalizeMetaValue(value);
  if (!text) return "";

  const category = String(item?.category || "").toLowerCase();
  const isKids = category.includes("copii");

  if (isKids) {
    return formatKidsSizeLabel(text);
  }

  return text.toUpperCase();
}

function formatConditionLabel(value) {
  const raw = normalizeMetaValue(value);
  if (!raw) return "";

  const key = raw.toLowerCase().replace(/\s+/g, "_");

  const map = {
    new_with_tags: "Nou cu etichetă",
    new_without_tags: "Nou fără etichetă",
    very_good: "Foarte bună",
    good: "Bună",
    satisfactory: "Satisfăcătoare",
    used: "Folosită",
  };

  if (map[key]) return map[key];

  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\p{L}/u, (c) => c.toUpperCase());
}

function pickItemMeta(item, directKeys = [], attributeKeys = []) {
  for (const key of directKeys) {
    const value = normalizeMetaValue(item?.[key]);
    if (value) return value;
  }

  const attrs =
    item?.attributes && typeof item.attributes === "object"
      ? item.attributes
      : null;

  if (!attrs) return "";

  for (const key of attributeKeys) {
    const value = normalizeMetaValue(attrs?.[key]);
    if (value) return value;
  }

  return "";
}

function getMetaRows(item) {
  const brandRaw = pickItemMeta(item, ["brand"], ["brand", "Brand"]);
  const sizeRaw = pickItemMeta(
    item,
    ["size"],
    ["size", "Size", "mărime", "marime", "Mărime", "Marime"],
  );
  const conditionRaw = pickItemMeta(
    item,
    ["condition", "state"],
    ["condition", "Condition", "state", "State", "stare", "Stare"],
  );

  const brand = toTitleCase(brandRaw);
  const size = formatDisplaySize(sizeRaw, item);
  const condition = formatConditionLabel(conditionRaw);

  const secondRow = [size, condition].filter(Boolean).join(" · ");

  return {
    brand,
    secondRow,
    hasAny: Boolean(brand || secondRow),
  };
}

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
  const insets = useSafeAreaInsets();
  const { height: SCREEN_H } = Dimensions.get("window");

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
  const buyerSheetY = useRef(new Animated.Value(SCREEN_H)).current;

  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [buyerSheetMounted, setBuyerSheetMounted] = useState(false);

  const numericPrice = useMemo(() => toPriceNumber(item?.price), [item?.price]);
  const buyerProtectionFee = useMemo(
    () => calculateBuyerProtectionFee(numericPrice || 0),
    [numericPrice],
  );
  const shippingFrom = useMemo(
    () => calculateShippingFrom(numericPrice || 0),
    [numericPrice],
  );
  const totalIncl = useMemo(
    () =>
      Number(
        (Number(numericPrice || 0) + Number(buyerProtectionFee || 0)).toFixed(
          2,
        ),
      ),
    [numericPrice, buyerProtectionFee],
  );

  const metaRows = useMemo(() => getMetaRows(item), [item]);

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

  const openPriceSheet = () => {
    setInfoSheetVisible(true);
    setBuyerSheetMounted(false);
    buyerSheetY.setValue(SCREEN_H);
  };

  const closeBuyerSheetOnly = () => {
    Animated.timing(buyerSheetY, {
      toValue: SCREEN_H,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setBuyerSheetMounted(false);
    });
  };

  const closeInfoSheet = () => {
    if (buyerSheetMounted) {
      Animated.timing(buyerSheetY, {
        toValue: SCREEN_H,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setBuyerSheetMounted(false);
        setInfoSheetVisible(false);
        buyerSheetY.setValue(SCREEN_H);
      });
      return;
    }

    setInfoSheetVisible(false);
    buyerSheetY.setValue(SCREEN_H);
  };

  const openBuyerProtectionInsideSheet = () => {
    setBuyerSheetMounted(true);
    buyerSheetY.setValue(SCREEN_H);

    Animated.timing(buyerSheetY, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
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
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.35)"]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 50,
              }}
              pointerEvents="none"
            />
            {dots}
          </View>

          <View
            style={[
              styles.body,
              Platform.OS === "android" && styles.bodyAndroid,
            ]}
          >
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.title,
                  { color: text },
                  Platform.OS === "android" && styles.titleAndroid,
                ]}
                numberOfLines={2}
              >
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
                        {
                          minWidth: dynamicBadgeWidth,
                          backgroundColor: primary,
                        },
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

            {metaRows.hasAny ? (
              <View style={styles.detailsBlock}>
                {metaRows.brand ? (
                  <Text
                    style={[
                      styles.detailsLineTop,
                      { color: muted },
                      Platform.OS === "android" && styles.detailsLineTopAndroid,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {metaRows.brand}
                  </Text>
                ) : null}

                {metaRows.secondRow ? (
                  <Text
                    style={[
                      styles.detailsLineBottom,
                      { color: muted },
                      Platform.OS === "android" &&
                        styles.detailsLineBottomAndroid,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {metaRows.secondRow}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Pressable onPress={openPriceSheet} hitSlop={6}>
              <Text
                style={[
                  styles.price,
                  { color: primary },
                  Platform.OS === "android" && styles.priceAndroid,
                ]}
              >
                {numericPrice !== null
                  ? formatPrice(numericPrice)
                  : `${item?.price} MDL`}
              </Text>

              {numericPrice !== null ? (
                <View style={styles.inclRow}>
                  <Text
                    style={[
                      styles.inclText,
                      { color: primary },
                      Platform.OS === "android" && styles.inclTextAndroid,
                    ]}
                  >
                    {formatPrice(totalIncl)} incl.
                  </Text>

                  <View style={styles.inclIcons}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={13}
                      color={primary}
                    />
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={primary}
                    />
                  </View>
                </View>
              ) : null}
            </Pressable>

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
                <Text
                  style={[styles.catText, { color: text }]}
                  numberOfLines={1}
                >
                  {item?.category}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={infoSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeInfoSheet}
      >
        <View
          style={[styles.sheetOverlay, { backgroundColor: "rgba(0,0,0,0.46)" }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeInfoSheet} />

          <View style={styles.sheetWrap}>
            <View
              style={[
                styles.sheetHandle,
                { backgroundColor: "rgba(255,255,255,0.35)" },
              ]}
            />

            <View
              style={[
                styles.sheetCard,
                {
                  backgroundColor: card,
                  borderColor: border,
                  maxHeight: SCREEN_H * 0.76,
                  minHeight: SCREEN_H * 0.6,
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.priceSheetScrollContent,
                  { paddingBottom: Math.max(insets.bottom, 18) },
                ]}
              >
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={[styles.sheetEyebrow, { color: primary }]}>
                      ModaGo
                    </Text>
                    <Text style={[styles.sheetTitle, { color: text }]}>
                      Cum se formează prețul
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={closeInfoSheet}
                    style={[
                      styles.sheetCloseBtn,
                      { backgroundColor: "rgba(255,255,255,0.06)" },
                    ]}
                  >
                    <Ionicons name="close" size={26} color={text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sheetIntro, { color: muted }]}>
                  Vezi rapid din ce este compus costul estimat pentru acest
                  articol.
                </Text>

                <View style={styles.breakdownList}>
                  <View
                    style={[
                      styles.breakdownCard,
                      {
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderColor: border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.breakdownIconWrap,
                        {
                          backgroundColor: "rgba(63,169,181,0.12)",
                          borderColor: "rgba(63,169,181,0.22)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color={primary}
                      />
                    </View>
                    <View style={styles.breakdownContent}>
                      <Text style={[styles.breakdownLabel, { color: text }]}>
                        Preț articol
                      </Text>
                      <Text style={[styles.breakdownHint, { color: muted }]}>
                        Prețul setat de vânzător.
                      </Text>
                    </View>
                    <Text style={[styles.breakdownValue, { color: text }]}>
                      {numericPrice !== null
                        ? formatPrice(numericPrice)
                        : `${item?.price || "-"} MDL`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.breakdownCard,
                      {
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderColor: border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.breakdownIconWrap,
                        {
                          backgroundColor: "rgba(63,169,181,0.12)",
                          borderColor: "rgba(63,169,181,0.22)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={primary}
                      />
                    </View>

                    <View style={styles.breakdownContent}>
                      <View style={styles.breakdownLabelRow}>
                        <Text style={[styles.breakdownLabel, { color: text }]}>
                          Protecție cumpărător
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={openBuyerProtectionInsideSheet}
                          style={styles.inlineInfoBtn}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={18}
                            color={primary}
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.breakdownHint, { color: muted }]}>
                        Acoperă suportul pentru comandă și siguranța
                        tranzacției.
                      </Text>
                    </View>

                    <Text style={[styles.breakdownValue, { color: text }]}>
                      {formatPrice(buyerProtectionFee)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.breakdownCard,
                      {
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderColor: border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.breakdownIconWrap,
                        {
                          backgroundColor: "rgba(63,169,181,0.12)",
                          borderColor: "rgba(63,169,181,0.22)",
                        },
                      ]}
                    >
                      <Ionicons name="cube-outline" size={18} color={primary} />
                    </View>
                    <View style={styles.breakdownContent}>
                      <Text style={[styles.breakdownLabel, { color: text }]}>
                        Livrare estimată
                      </Text>
                      <Text style={[styles.breakdownHint, { color: muted }]}>
                        Costul final depinde de metoda de expediere aleasă.
                      </Text>
                    </View>
                    <Text style={[styles.breakdownValue, { color: text }]}>
                      de la {formatPrice(shippingFrom)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.totalCard,
                    {
                      backgroundColor: "rgba(63,169,181,0.12)",
                      borderColor: "rgba(63,169,181,0.22)",
                    },
                  ]}
                >
                  <View style={styles.totalTopRow}>
                    <Text style={[styles.totalLabel, { color: text }]}>
                      Total estimat
                    </Text>
                    <Text style={[styles.totalValue, { color: primary }]}>
                      {formatPrice(totalIncl)}
                    </Text>
                  </View>

                  <Text style={[styles.totalSubtext, { color: muted }]}>
                    {formatPrice(totalIncl)} + livrarea selectată la checkout.
                  </Text>
                </View>

                <Text style={[styles.sheetNote, { color: muted }]}>
                  Taxa de protecție pentru cumpărător este obligatorie atunci
                  când achiziționezi un articol. Aceasta se adaugă la fiecare
                  comandă finalizată prin cumpărare. Prețul articolului este
                  stabilit de vânzător și poate face obiectul negocierii.
                </Text>
              </ScrollView>
            </View>
          </View>

          {buyerSheetMounted ? (
            <Animated.View
              style={[
                styles.buyerOverlaySheet,
                {
                  top: Math.max(insets.top, 8),
                  backgroundColor: card,
                  transform: [{ translateY: buyerSheetY }],
                },
              ]}
            >
              <View style={styles.buyerHandleWrap}>
                <View
                  style={[
                    styles.sheetHandle,
                    { backgroundColor: "rgba(255,255,255,0.35)" },
                  ]}
                />
              </View>

              <View style={styles.protectionSheetHeader}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={closeBuyerSheetOnly}
                  style={[
                    styles.protectionBackBtn,
                    { backgroundColor: "rgba(255,255,255,0.06)" },
                  ]}
                >
                  <Ionicons name="chevron-back" size={22} color={text} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={closeInfoSheet}
                  style={[
                    styles.sheetCloseBtn,
                    { backgroundColor: "rgba(255,255,255,0.06)" },
                  ]}
                >
                  <Ionicons name="close" size={26} color={text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.protectionSheetScrollContent,
                  { paddingBottom: Math.max(insets.bottom, 24) + 16 },
                ]}
              >
                <View style={styles.protectionHero}>
                  <View
                    style={[
                      styles.protectionHeroIcon,
                      {
                        backgroundColor: "rgba(63,169,181,0.12)",
                        borderColor: "rgba(63,169,181,0.22)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={34}
                      color={primary}
                    />
                  </View>

                  <Text style={[styles.protectionTitle, { color: text }]}>
                    Protecția cumpărătorului
                  </Text>

                  <Text style={[styles.protectionLink, { color: primary }]}>
                    Află cum calculăm taxa de protecție a cumpărătorului
                  </Text>
                </View>

                <View style={styles.protectionSection}>
                  <View style={styles.protectionSectionHeader}>
                    <Ionicons name="cash-outline" size={24} color={primary} />
                    <Text
                      style={[styles.protectionSectionTitle, { color: text }]}
                    >
                      Politica de rambursare
                    </Text>
                  </View>

                  <Text style={[styles.protectionText, { color: muted }]}>
                    Poți primi o rambursare în cazul în care comanda:
                  </Text>
                  <Text style={[styles.protectionBullet, { color: muted }]}>
                    • nu a fost expediată sau s-a pierdut
                  </Text>
                  <Text style={[styles.protectionBullet, { color: muted }]}>
                    • sosește deteriorată
                  </Text>
                  <Text style={[styles.protectionBullet, { color: muted }]}>
                    • este neconformă cu descrierea
                  </Text>

                  <Text style={[styles.protectionParagraph, { color: muted }]}>
                    Ai la dispoziție 2 zile pentru a trimite o reclamație de la
                    data când primești notificarea că un articol a fost livrat,
                    chiar dacă acesta nu a sosit.
                  </Text>

                  <Text style={[styles.protectionParagraph, { color: muted }]}>
                    Cumpărătorii suportă costul returnării unui articol, dacă nu
                    există alt acord.
                  </Text>
                </View>

                <View style={styles.protectionSection}>
                  <View style={styles.protectionSectionHeader}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={24}
                      color={primary}
                    />
                    <Text
                      style={[styles.protectionSectionTitle, { color: text }]}
                    >
                      Tranzacții securizate
                    </Text>
                  </View>

                  <Text style={[styles.protectionParagraph, { color: muted }]}>
                    Banii tăi sunt păstrați în siguranță pe toată durata
                    tranzacției. Nu îi vom elibera vânzătorului până când nu
                    primești comanda și confirmi că totul este în regulă.
                  </Text>

                  <Text style={[styles.protectionParagraph, { color: muted }]}>
                    Plățile sunt criptate de partenerul nostru de plată, astfel
                    încât banii tăi sunt întotdeauna trimiși și primiți în
                    siguranță. Vânzătorul nu va vedea niciodată detaliile tale
                    de plată.
                  </Text>
                </View>

                <View style={styles.protectionSection}>
                  <View style={styles.protectionSectionHeader}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={24}
                      color={primary}
                    />
                    <Text
                      style={[styles.protectionSectionTitle, { color: text }]}
                    >
                      Asistența noastră
                    </Text>
                  </View>

                  <Text style={[styles.protectionParagraph, { color: muted }]}>
                    Contactează oricând echipa noastră de asistență, îți stă la
                    dispoziție pentru a-ți oferi ajutor.
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.protectionPrimaryBtn,
                    { backgroundColor: primary },
                  ]}
                  onPress={closeInfoSheet}
                >
                  <Text
                    style={[
                      styles.protectionPrimaryBtnText,
                      { color: onPrimary },
                    ]}
                  >
                    Am înțeles
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </>
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
  bodyAndroid: {
    paddingTop: 11,
    paddingBottom: 13,
    minHeight: 170,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    paddingRight: 10,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  titleAndroid: {
    fontSize: 13.5,
    lineHeight: 17,
    paddingRight: 8,
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

  detailsBlock: {
    marginTop: 8,
    minHeight: 34,
  },
  detailsLineTop: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "700",
  },
  detailsLineBottom: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "700",
  },
  detailsLineTopAndroid: {
    fontSize: 12,
    lineHeight: 15,
  },
  detailsLineBottomAndroid: {
    fontSize: 12,
    lineHeight: 15,
  },

  price: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  priceAndroid: {
    fontSize: 15.5,
    lineHeight: 19,
    marginTop: 7,
  },
  inclRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inclText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  inclTextAndroid: {
    fontSize: 12,
  },
  inclIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
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
    maxWidth: "100%",
  },
  catText: { fontWeight: "800", fontSize: 13 },

  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetWrap: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  sheetCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    borderWidth: 1,
  },
  priceSheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    marginTop: 2,
  },
  sheetIntro: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },

  breakdownList: {
    marginTop: 18,
    gap: 12,
  },
  breakdownCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  breakdownIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 1,
  },
  breakdownContent: {
    flex: 1,
    paddingRight: 8,
  },
  breakdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    flex: 1,
  },
  inlineInfoBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  breakdownHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 1,
  },

  totalCard: {
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  totalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  totalSubtext: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  sheetNote: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },

  buyerOverlaySheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },
  buyerHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  protectionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  protectionBackBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  protectionSheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  protectionHero: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  protectionHeroIcon: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 18,
  },
  protectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  protectionLink: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  protectionSection: {
    marginBottom: 28,
  },
  protectionSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  protectionSectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginTop: -1,
  },
  protectionText: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "500",
    marginLeft: 36,
    marginBottom: 2,
  },
  protectionBullet: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "500",
    marginLeft: 54,
  },
  protectionParagraph: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "500",
    marginLeft: 36,
  },
  protectionPrimaryBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  protectionPrimaryBtnText: {
    fontSize: 18,
    fontWeight: "800",
  },
});
