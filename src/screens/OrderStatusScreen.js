// ================================================================
// ModaGo – OrderStatusScreen.js
// Fișier: src/screens/OrderStatusScreen.js
//
// Flow:
//   CheckoutScreen → [Stripe Sheet] → OrderStatusScreen
//
// Afișează statusul live al comenzii (tracking, curier) și permite
// cumpărătorului să confirme primirea coletului (shipped → delivered).
// ================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useContext } from "react";
import { ThemeContext } from "../theme/ThemeProvider";
import { supabase } from "../supabaseClient";
import {
  getOrderById,
  subscribeToOrder,
  confirmDelivery,
  addTracking,
} from "../services/orderService";
import { ORDER_STATUS_LABELS } from "../types/escrow";
import { ROUTES } from "../navigation/routes";

const TIMELINE_STEPS = ["paid", "shipped", "delivered", "completed"];

const COURIERS = ["Nova Poșta", "Poșta Moldovei", "Fan Courier"];

// Pagini oficiale de tracking (fără parametru AWB confirmat pentru deep-link —
// deschidem pagina generală, AWB-ul se poate copia din ecran și lipi acolo).
const COURIER_TRACKING_URLS = {
  "Nova Poșta": "https://nova.global/en-md/track/",
  "Poșta Moldovei": "https://posta.md/ro/track-trace",
  "Fan Courier": "https://www.fancourier.ro/en/awb-track/",
};

export default function OrderStatusScreen({ route, navigation }) {
  const { orderId, itemTitle } = route.params ?? {};

  const { tokens } = useContext(ThemeContext);
  const isDark = tokens?.scheme === "dark";
  const TEAL = tokens?.primary ?? "#2CA6A4";
  const TEAL_LIGHT = isDark ? "rgba(44,166,164,0.15)" : "rgba(44,166,164,0.10)";
  const s = styles(isDark, TEAL, TEAL_LIGHT);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [userId, setUserId] = useState(null);

  const [courier, setCourier] = useState(COURIERS[0]);
  const [trackingInput, setTrackingInput] = useState("");
  const [submittingTracking, setSubmittingTracking] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
  }, [navigation]);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (e) {
      Alert.alert("Eroare", "Nu am putut încărca comanda.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!orderId) return;
    const channel = subscribeToOrder(orderId, (updated) => {
      setOrder((prev) => (prev ? { ...prev, ...updated } : prev));
    });
    return () => channel.unsubscribe();
  }, [orderId]);

  const handleConfirmDelivery = useCallback(async () => {
    if (!orderId) return;
    Alert.alert(
      "Confirmă primirea",
      "Ești sigur că ai primit coletul? Banii vor fi eliberați vânzătorului.",
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setConfirming(true);
            try {
              await confirmDelivery(orderId);
              await loadOrder();
            } catch (e) {
              Alert.alert(
                "Eroare",
                e.message ?? "Nu am putut confirma livrarea.",
              );
            } finally {
              setConfirming(false);
            }
          },
        },
      ],
    );
  }, [orderId, loadOrder]);

  const handleAddTracking = useCallback(async () => {
    if (!orderId || !trackingInput.trim()) {
      Alert.alert("AWB lipsă", "Introdu numărul AWB primit de la curier.");
      return;
    }
    setSubmittingTracking(true);
    try {
      await addTracking({
        order_id: orderId,
        courier_name: courier,
        tracking_number: trackingInput.trim(),
      });
      setTrackingInput("");
      await loadOrder();
    } catch (e) {
      Alert.alert("Eroare", e.message ?? "Nu am putut salva AWB-ul.");
    } finally {
      setSubmittingTracking(false);
    }
  }, [orderId, courier, trackingInput, loadOrder]);

  const handleTrackPackage = useCallback(() => {
    if (!order?.courier_name) return;
    const url = COURIER_TRACKING_URLS[order.courier_name];
    if (!url) return;
    Alert.alert(
      "Urmărește coletul",
      `Se deschide pagina ${order.courier_name}. Introdu manual AWB-ul: ${order.tracking_number}`,
      [
        { text: "Anulează", style: "cancel" },
        { text: "Deschide", onPress: () => Linking.openURL(url) },
      ],
    );
  }, [order]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centerFill}>
          <ActivityIndicator color={TEAL} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centerFill}>
          <Text style={s.errorText}>Comanda nu a putut fi găsită.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);
  const isBuyer = !!userId && order.buyer_id === userId;
  const isSeller = !!userId && order.seller_id === userId;
  const canConfirmDelivery = isBuyer && order.status === "shipped";
  const canAddTracking = isSeller && order.status === "paid";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={s.header}>
        <TouchableOpacity onPress={goBackSafe} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Comanda ta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Card produs ── */}
        <View style={s.card}>
          <View style={s.itemRow}>
            <Image
              source={{
                uri: order.item?.images?.[0] ?? "https://via.placeholder.com/80",
              }}
              style={s.itemImage}
            />
            <View style={s.itemInfo}>
              <Text style={s.itemTitle} numberOfLines={2}>
                {order.item?.title ?? itemTitle ?? "Produs"}
              </Text>
              <Text style={s.itemPrice}>{order.price_mdl} MDL</Text>
            </View>
          </View>
        </View>

        {/* ── Status curent ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Status</Text>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>{statusLabel}</Text>
          </View>

          {order.tracking_number ? (
            <View style={s.trackingBox}>
              <Ionicons name="cube-outline" size={18} color={TEAL} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.trackingLabel}>
                  {order.courier_name ?? "Curier"}
                </Text>
                <Text style={s.trackingNumber} selectable>
                  {order.tracking_number}
                </Text>
              </View>
              {isBuyer && (
                <TouchableOpacity style={s.trackBtn} onPress={handleTrackPackage}>
                  <Text style={s.trackBtnText}>Urmărește</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : canAddTracking ? (
            <View style={s.trackingForm}>
              <Text style={s.trackingFormLabel}>Adaugă AWB de expediere</Text>
              <View style={s.courierRow}>
                {COURIERS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.courierChip, courier === c && s.courierChipActive]}
                    onPress={() => setCourier(c)}
                  >
                    <Text
                      style={[
                        s.courierChipText,
                        courier === c && s.courierChipTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.trackingTextInput}
                placeholder="Număr AWB"
                placeholderTextColor={isDark ? "#8E8E93" : "#9CA3AF"}
                value={trackingInput}
                onChangeText={setTrackingInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  s.trackingSubmitBtn,
                  submittingTracking && s.confirmBtnDisabled,
                ]}
                onPress={handleAddTracking}
                disabled={submittingTracking}
              >
                {submittingTracking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.confirmBtnText}>Trimite tracking</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Timeline ── */}
          <View style={s.timeline}>
            {TIMELINE_STEPS.map((step, idx) => {
              const done = currentStepIndex >= idx;
              return (
                <View key={step} style={s.timelineStep}>
                  <View style={[s.timelineDot, done && s.timelineDotDone]} />
                  <Text
                    style={[s.timelineLabel, done && s.timelineLabelDone]}
                  >
                    {ORDER_STATUS_LABELS[step]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Info escrow ── */}
        <View style={[s.card, s.escrowCard]}>
          <View style={s.escrowHeader}>
            <Ionicons name="shield-checkmark" size={20} color={TEAL} />
            <Text style={s.escrowTitle}>Plată protejată</Text>
          </View>
          <Text style={s.escrowText}>
            Banii sunt blocați în siguranță și ajung la vânzător{" "}
            <Text style={s.escrowBold}>doar după ce confirmi primirea</Text>.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {canConfirmDelivery && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.confirmBtn, confirming && s.confirmBtnDisabled]}
            onPress={handleConfirmDelivery}
            disabled={confirming}
            activeOpacity={0.85}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={s.confirmBtnText}>Am primit coletul</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = (isDark, TEAL, TEAL_LIGHT) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#000" : "#F5F5F5" },
    centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
    errorText: { fontSize: 15, color: isDark ? "#8E8E93" : "#6E6E73" },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderBottomWidth: 0.5,
      borderBottomColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "600", color: isDark ? "#FFFFFF" : "#000000" },

    scroll: { flex: 1 },
    content: { padding: 16, gap: 12 },

    card: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 14,
      padding: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#8E8E93" : "#6E6E73",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },

    itemRow: { flexDirection: "row", gap: 12 },
    itemImage: {
      width: 64,
      height: 64,
      borderRadius: 10,
      backgroundColor: isDark ? "#2C2C2E" : "#F0F0F0",
    },
    itemInfo: { flex: 1, gap: 4, justifyContent: "center" },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      lineHeight: 20,
    },
    itemPrice: { fontSize: 15, fontWeight: "700", color: TEAL },

    statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL },
    statusText: { fontSize: 17, fontWeight: "700", color: isDark ? "#FFFFFF" : "#000000" },

    trackingBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1C2B26" : TEAL_LIGHT,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    trackingLabel: { fontSize: 12, color: isDark ? "#9FE1CB" : TEAL, fontWeight: "600" },
    trackingNumber: { fontSize: 14, color: isDark ? "#FFFFFF" : "#000000", marginTop: 2 },
    trackBtn: {
      backgroundColor: TEAL,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    trackBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

    trackingForm: { marginBottom: 12 },
    trackingFormLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 8,
    },
    courierRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    courierChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    courierChipActive: { backgroundColor: TEAL, borderColor: TEAL },
    courierChipText: { fontSize: 13, color: isDark ? "#AEAEB2" : "#6E6E73" },
    courierChipTextActive: { color: "#FFFFFF", fontWeight: "600" },
    trackingTextInput: {
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 10,
    },
    trackingSubmitBtn: {
      backgroundColor: TEAL,
      borderRadius: 12,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
    },

    timeline: { marginTop: 4 },
    timelineStep: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    timelineDotDone: { backgroundColor: TEAL },
    timelineLabel: { fontSize: 14, color: isDark ? "#8E8E93" : "#6E6E73" },
    timelineLabelDone: { color: isDark ? "#FFFFFF" : "#000000", fontWeight: "600" },

    escrowCard: { backgroundColor: isDark ? "#1C2B26" : TEAL_LIGHT, gap: 10 },
    escrowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    escrowTitle: { fontSize: 14, fontWeight: "700", color: isDark ? "#9FE1CB" : TEAL },
    escrowText: { fontSize: 13, color: isDark ? "#9FE1CB" : TEAL, lineHeight: 19 },
    escrowBold: { fontWeight: "700" },

    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 32 : 16,
      borderTopWidth: 0.5,
      borderTopColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    confirmBtn: {
      backgroundColor: TEAL,
      borderRadius: 14,
      height: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  });
