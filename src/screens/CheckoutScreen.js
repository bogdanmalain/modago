// ================================================================
// ModaGo – CheckoutScreen.js
// Fișier: src/screens/CheckoutScreen.js
//
// Flow:
//   ItemDetailsScreen → CheckoutScreen → [Stripe Sheet] → OrderStatusScreen
//
// Stripe Payment Sheet e nativ și nu rulează în Expo Go fără dev build.
// useCheckoutStripe() (src/utils/stripeCompat.js) folosește Stripe real
// în dev build / build de producție și un mock (succes automat) în Expo Go.
// ================================================================

import React, { useState, useEffect, useCallback, useContext } from "react";
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
} from "react-native";
import { useCheckoutStripe } from "../utils/stripeCompat";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../theme/ThemeProvider";
import { initiateCheckout, getMyAddresses } from "../services/orderService";

export default function CheckoutScreen({ route, navigation }) {
  const { item } = route.params;

  const { tokens } = useContext(ThemeContext);
  const isDark = tokens?.scheme === "dark";
  const TEAL = tokens?.primary ?? "#2CA6A4";
  const TEAL_LIGHT = isDark ? "rgba(44,166,164,0.15)" : "rgba(44,166,164,0.10)";
  const TEAL_DARK = "#1A7A78";
  const s = styles(isDark, TEAL, TEAL_LIGHT, TEAL_DARK);

  const { initPaymentSheet, presentPaymentSheet } = useCheckoutStripe();

  // ── State ────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelected] = useState(null);
  const [loadingAddresses, setLoadingAddr] = useState(true);
  const [paying, setPaying] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // ── Preia adresele utilizatorului ────────────────────────────────
  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    try {
      const data = await getMyAddresses();
      setAddresses(data);
      const def = data.find((a) => a.is_default) ?? data[0] ?? null;
      setSelected(def);
    } catch (e) {
      Alert.alert("Eroare", "Nu am putut încărca adresele de livrare.");
    } finally {
      setLoadingAddr(false);
    }
  }

  // ── Calculează sumele ─────────────────────────────────────────────
  // Taxă de protecție cumpărător (stil Vinted): 5% + 2 MDL fix.
  // Doar pentru afișare — suma reală e recalculată și autoritară pe server.
  const BUYER_FEE_PCT = 5;
  const BUYER_FEE_FIXED_MDL = 2;
  const priceMdl = Number(item.price);
  const feeMdl =
    Math.round((priceMdl * BUYER_FEE_PCT / 100 + BUYER_FEE_FIXED_MDL) * 100) /
    100;
  const totalMdl = Math.round((priceMdl + feeMdl) * 100) / 100;

  // ── Inițiază plata ────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!selectedAddress) {
      Alert.alert("Adresă lipsă", "Selectează o adresă de livrare.");
      return;
    }

    setPaying(true);

    try {
      // 1. Creează order + PaymentIntent pe server
      const { order_id, client_secret } = await initiateCheckout({
        item_id: item.id.toString(),
        shipping_address_id: selectedAddress.id,
      });

      setOrderId(order_id);

      // 2. Inițializează Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "ModaGo",
        paymentIntentClientSecret: client_secret,
        defaultBillingDetails: {
          name: selectedAddress.full_name,
        },
        appearance: {
          colors: {
            primary: TEAL,
            background: isDark ? "#1C1C1E" : "#FFFFFF",
            componentBackground: isDark ? "#2C2C2E" : "#F2F2F7",
            primaryText: isDark ? "#FFFFFF" : "#000000",
            secondaryText: isDark ? "#EBEBF5" : "#6E6E73",
          },
        },
      });

      if (initError) {
        Alert.alert("Eroare Stripe", initError.message);
        setPaying(false);
        return;
      }

      // 3. Prezintă sheet-ul de plată
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code === "Canceled") {
          // Utilizatorul a închis sheet-ul — nu e eroare
        } else {
          Alert.alert("Plată eșuată", payError.message);
        }
        setPaying(false);
        return;
      }

      // 4. Plată reușită → navigăm la OrderStatusScreen
      // Webhook-ul Stripe va actualiza status-ul comenzii în background
      navigation.replace("OrderStatus", {
        orderId: order_id,
        itemTitle: item.title,
      });
    } catch (e) {
      console.error("Checkout error:", e);
      Alert.alert(
        "Eroare",
        e.message ?? "A apărut o problemă. Încearcă din nou.",
      );
      setPaying(false);
    }
  }, [selectedAddress, item, initPaymentSheet, presentPaymentSheet, isDark]);

  // ── UI ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Finalizează comanda</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Card produs ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Produs</Text>
          <View style={s.itemRow}>
            <Image
              source={{
                uri: item.images?.[0] ?? "https://via.placeholder.com/80",
              }}
              style={s.itemImage}
            />
            <View style={s.itemInfo}>
              <Text style={s.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={s.itemSeller}>
                Vânzător: {item.seller_username ?? "Utilizator"}
              </Text>
              <Text style={s.itemPrice}>{priceMdl} MDL</Text>
            </View>
          </View>
        </View>

        {/* ── Adresă de livrare ── */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>Adresă de livrare</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ShippingAddresses", {
                  onSelect: (addr) => setSelected(addr),
                })
              }
            >
              <Text style={s.changeBtn}>
                {addresses.length === 0 ? "Adaugă" : "Schimbă"}
              </Text>
            </TouchableOpacity>
          </View>

          {loadingAddresses ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 12 }} />
          ) : selectedAddress ? (
            <AddressCard address={selectedAddress} s={s} TEAL={TEAL} />
          ) : (
            <TouchableOpacity
              style={s.addAddressBtn}
              onPress={() =>
                navigation.navigate("ShippingAddresses", {
                  onSelect: (addr) => setSelected(addr),
                })
              }
            >
              <Ionicons name="add-circle-outline" size={20} color={TEAL} />
              <Text style={s.addAddressText}>Adaugă o adresă de livrare</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Info curier ── */}
        <View style={[s.card, s.infoCard]}>
          <Ionicons name="cube-outline" size={18} color={TEAL} />
          <Text style={s.infoText}>
            Vânzătorul alege curierul (Nova Poșta, Fan Courier, Poșta Moldovei)
            și îți trimite numărul de tracking după expediere.
          </Text>
        </View>

        {/* ── Sumar preț ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Sumar</Text>

          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Preț produs</Text>
            <Text style={s.priceValue}>{priceMdl} MDL</Text>
          </View>

          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Protecție cumpărător</Text>
            <Text style={s.priceValue}>{feeMdl} MDL</Text>
          </View>

          <View style={s.divider} />

          <View style={s.priceRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{totalMdl} MDL</Text>
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
            Dacă coletul nu sosește, primești banii înapoi.
          </Text>
        </View>

        {/* Spațiu pentru buton fix */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Buton plată fix jos ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.payBtn, (!selectedAddress || paying) && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={!selectedAddress || paying}
          activeOpacity={0.85}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="lock-closed"
                size={18}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={s.payBtnText}>Plătește {totalMdl} MDL</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Subcomponentă: card adresă selectată ─────────────────────────
function AddressCard({ address, s, TEAL }) {
  return (
    <View style={s.addressCard}>
      <View style={s.addressCardInner}>
        <Ionicons
          name="location-outline"
          size={18}
          color={TEAL}
          style={{ marginTop: 2 }}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.addressName}>{address.full_name}</Text>
          <Text style={s.addressLine}>{address.address}</Text>
          <Text style={s.addressLine}>
            {address.city}
            {address.postal_code ? `, ${address.postal_code}` : ""}
          </Text>
          <Text style={s.addressPhone}>{address.phone}</Text>
        </View>
        {address.is_default && (
          <View style={s.defaultBadge}>
            <Text style={s.defaultBadgeText}>Implicit</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = (isDark, TEAL, TEAL_LIGHT, TEAL_DARK) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: isDark ? "#000" : "#F5F5F5",
    },
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
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
    },

    scroll: { flex: 1 },
    content: {
      padding: 16,
      gap: 12,
    },

    // Card generic
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
    sectionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    changeBtn: {
      fontSize: 14,
      fontWeight: "600",
      color: TEAL,
    },

    // Produs
    itemRow: {
      flexDirection: "row",
      gap: 12,
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: 10,
      backgroundColor: isDark ? "#2C2C2E" : "#F0F0F0",
    },
    itemInfo: {
      flex: 1,
      gap: 4,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      lineHeight: 20,
    },
    itemSeller: {
      fontSize: 13,
      color: isDark ? "#8E8E93" : "#6E6E73",
    },
    itemPrice: {
      fontSize: 16,
      fontWeight: "700",
      color: TEAL,
      marginTop: 4,
    },

    // Adresă
    addAddressBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: TEAL,
      borderRadius: 10,
      borderStyle: "dashed",
      justifyContent: "center",
    },
    addAddressText: {
      fontSize: 14,
      fontWeight: "500",
      color: TEAL,
    },
    addressCard: {
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
      borderRadius: 10,
      padding: 12,
    },
    addressCardInner: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    addressName: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 2,
    },
    addressLine: {
      fontSize: 13,
      color: isDark ? "#AEAEB2" : "#6E6E73",
      lineHeight: 18,
    },
    addressPhone: {
      fontSize: 13,
      color: isDark ? "#AEAEB2" : "#6E6E73",
      marginTop: 4,
    },
    defaultBadge: {
      backgroundColor: TEAL_LIGHT,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: "flex-start",
    },
    defaultBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: TEAL_DARK,
    },

    // Info curier
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: isDark ? "#1C2B26" : TEAL_LIGHT,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? "#9FE1CB" : TEAL_DARK,
      lineHeight: 18,
    },

    // Preț
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    feeLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    priceLabel: {
      fontSize: 14,
      color: isDark ? "#AEAEB2" : "#6E6E73",
    },
    priceValue: {
      fontSize: 14,
      fontWeight: "500",
      color: isDark ? "#FFFFFF" : "#000000",
    },
    freeBadge: {
      backgroundColor: isDark ? "#0F3D2E" : "#D1FAE5",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    freeBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: isDark ? "#34D399" : "#065F46",
      letterSpacing: 0.3,
    },
    divider: {
      height: 0.5,
      backgroundColor: isDark ? "#3A3A3C" : "#E5E5E5",
      marginVertical: 10,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#FFFFFF" : "#000000",
    },
    totalValue: {
      fontSize: 18,
      fontWeight: "700",
      color: TEAL,
    },

    // Escrow info
    escrowCard: {
      backgroundColor: isDark ? "#1C2B26" : TEAL_LIGHT,
      gap: 10,
    },
    escrowHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    escrowTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: isDark ? "#9FE1CB" : TEAL_DARK,
    },
    escrowText: {
      fontSize: 13,
      color: isDark ? "#9FE1CB" : TEAL_DARK,
      lineHeight: 19,
    },
    escrowBold: {
      fontWeight: "700",
    },

    // Footer + buton plată
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
    payBtn: {
      backgroundColor: TEAL,
      borderRadius: 14,
      height: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    payBtnDisabled: {
      opacity: 0.5,
    },
    payBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
