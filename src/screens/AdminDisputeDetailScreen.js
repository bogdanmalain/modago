// ================================================================
// ModaGo – AdminDisputeDetailScreen.js
// Fișier: src/screens/AdminDisputeDetailScreen.js
//
// Flow:
//   AdminDisputesScreen → AdminDisputeDetailScreen
//
// Ecran SEPARAT de DisputeScreen (cel văzut de buyer/seller) — accesibil
// doar din lista de admin. Verificare is_admin și aici, în plus față de
// RLS + verificarea server-side din release-funds (defense in depth):
// un participant la comandă (buyer/seller) nu ajunge niciodată aici,
// indiferent dacă e și admin, pentru că nu există navigare către acest
// ecran din DisputeScreen/OrderStatusScreen.
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useContext } from "react";
import { ThemeContext } from "../theme/ThemeProvider";
import {
  getOrderById,
  getDisputeForOrder,
  getDisputeEvidence,
  getDisputeEvidenceSignedUrl,
  isCurrentUserAdmin,
  resolveDisputeAsAdmin,
} from "../services/orderService";
import { DISPUTE_STATUS_LABELS } from "../types/escrow";

export default function AdminDisputeDetailScreen({ route, navigation }) {
  const { orderId, itemTitle } = route.params ?? {};

  const { tokens } = useContext(ThemeContext);
  const isDark = tokens?.scheme === "dark";
  const TEAL = tokens?.primary ?? "#2CA6A4";
  const s = styles(isDark, TEAL);
  const insets = useSafeAreaInsets();

  const [isAdmin, setIsAdmin] = useState(null); // null = verificare în curs
  const [order, setOrder] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [evidenceUrls, setEvidenceUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const admin = await isCurrentUserAdmin();
      setIsAdmin(admin);
      if (!admin) {
        setLoading(false);
        return;
      }

      const [orderData, disputeData] = await Promise.all([
        getOrderById(orderId),
        getDisputeForOrder(orderId),
      ]);
      setOrder(orderData);
      setDispute(disputeData);

      if (disputeData) {
        const items = await getDisputeEvidence(disputeData.id);
        setEvidence(items);

        const imageItems = items.filter((e) => e.type === "image" && e.storage_path);
        const urlEntries = await Promise.all(
          imageItems.map(async (e) => [
            e.id,
            await getDisputeEvidenceSignedUrl(e.storage_path),
          ]),
        );
        setEvidenceUrls(Object.fromEntries(urlEntries));
      }
    } catch (e) {
      Alert.alert("Eroare", "Nu am putut încărca disputa.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleResolve = useCallback(
    (trigger, label, splitPct) => {
      if (!order) return;
      Alert.alert(
        "Confirmă decizia",
        `${label} — sigur vrei să aplici această rezolvare?`,
        [
          { text: "Anulează", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              setResolving(true);
              try {
                await resolveDisputeAsAdmin(order.id, trigger, splitPct);
                await load();
                Alert.alert("Gata", "Disputa a fost rezolvată.");
              } catch (e) {
                Alert.alert("Eroare", e.message ?? "Nu am putut rezolva disputa.");
              } finally {
                setResolving(false);
              }
            },
          },
        ],
      );
    },
    [order, load],
  );

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centerFill}>
          <ActivityIndicator color={TEAL} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centerFill}>
          <Text style={s.errorText}>Nu ai acces la acest ecran.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order || !dispute) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centerFill}>
          <Text style={s.errorText}>Disputa nu a putut fi găsită.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isResolved = ["resolved_release", "resolved_refund", "resolved_split", "closed"].includes(
    dispute.status,
  );
  const canResolve = !isResolved;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={goBackSafe} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dispută (admin)</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <Text style={s.itemTitle} numberOfLines={2}>
            {order.item?.title ?? itemTitle ?? "Produs"}
          </Text>
          <Text style={s.itemPrice}>{order.price_mdl} MDL</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Status dispută</Text>
          <Text style={[s.statusBadge, isResolved && s.statusBadgeResolved]}>
            {DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
          </Text>
          <Text style={s.reasonLabel}>Motiv</Text>
          <Text style={s.reasonText}>{dispute.reason}</Text>

          {dispute.buyer_offer_pct !== null && dispute.buyer_offer_pct !== undefined && (
            <>
              <Text style={[s.reasonLabel, { marginTop: 10 }]}>Negociere buyer/seller</Text>
              <Text style={s.reasonText}>
                Cumpărătorul a propus {dispute.buyer_offer_pct}% —{" "}
                {dispute.offer_status === "rejected"
                  ? "vânzătorul a respins"
                  : dispute.offer_status === "accepted"
                  ? "acceptată"
                  : "în așteptare"}
              </Text>
            </>
          )}
        </View>

        {evidence.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Dovezi</Text>
            {evidence.map((e) => (
              <View key={e.id} style={s.evidenceItem}>
                <Text style={s.evidenceAuthor}>
                  {e.uploaded_by === order.buyer_id ? "Cumpărător" : "Vânzător"}
                </Text>
                {e.type === "image" && evidenceUrls[e.id] ? (
                  <Image
                    source={{ uri: evidenceUrls[e.id] }}
                    style={s.evidenceImage}
                  />
                ) : (
                  <Text style={s.evidenceText}>{e.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {canResolve && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Rezolvă disputa</Text>
            <Text style={s.helperText}>
              Produsul rămâne la cumpărător — decizia privește doar banii
              deja blocați în escrow.
            </Text>

            <TouchableOpacity
              style={[s.resolveBtn, s.resolveBtnRelease, resolving && s.btnDisabled]}
              onPress={() =>
                handleResolve("admin_resolve_release", "Eliberează tot vânzătorului")
              }
              disabled={resolving}
            >
              <Text style={s.resolveBtnText}>Eliberează tot vânzătorului</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.resolveBtn, s.resolveBtnRefund, resolving && s.btnDisabled]}
              onPress={() =>
                handleResolve("admin_resolve_refund", "Rambursează tot cumpărătorului")
              }
              disabled={resolving}
            >
              <Text style={s.resolveBtnText}>Rambursează tot cumpărătorului</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.resolveBtn, s.resolveBtnSplit, resolving && s.btnDisabled]}
              onPress={() => handleResolve("admin_resolve_split", "Split 50/50", 50)}
              disabled={resolving}
            >
              <Text style={s.resolveBtnText}>Split 50/50</Text>
            </TouchableOpacity>

            {resolving && <ActivityIndicator color={TEAL} style={{ marginTop: 10 }} />}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (isDark, TEAL) =>
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

    itemTitle: { fontSize: 15, fontWeight: "600", color: isDark ? "#FFFFFF" : "#000000" },
    itemPrice: { fontSize: 14, fontWeight: "700", color: TEAL, marginTop: 4 },

    statusBadge: {
      alignSelf: "flex-start",
      fontSize: 13,
      fontWeight: "700",
      color: "#B00020",
      backgroundColor: isDark ? "#3A1414" : "#FBE9E9",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 12,
    },
    statusBadgeResolved: {
      color: TEAL,
      backgroundColor: isDark ? "#1C2B26" : "rgba(44,166,164,0.10)",
    },
    reasonLabel: { fontSize: 12, color: isDark ? "#8E8E93" : "#6E6E73", marginBottom: 4 },
    reasonText: { fontSize: 14, color: isDark ? "#FFFFFF" : "#000000" },

    helperText: {
      fontSize: 13,
      color: isDark ? "#8E8E93" : "#6E6E73",
      lineHeight: 18,
      marginBottom: 12,
    },

    evidenceItem: { marginBottom: 14 },
    evidenceAuthor: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#8E8E93" : "#6E6E73",
      marginBottom: 6,
    },
    evidenceImage: { width: "100%", height: 200, borderRadius: 10 },
    evidenceText: { fontSize: 14, color: isDark ? "#FFFFFF" : "#000000" },

    resolveBtn: {
      borderRadius: 12,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    btnDisabled: { opacity: 0.5 },
    resolveBtnRelease: { backgroundColor: TEAL },
    resolveBtnRefund: { backgroundColor: "#B00020" },
    resolveBtnSplit: { backgroundColor: isDark ? "#3A3A3C" : "#6E6E73" },
    resolveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  });
