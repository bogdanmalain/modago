// src/screens/OrdersScreen.js
// ================================
// ORDERSSCREEN
// ================================
// Lista comenzilor utilizatorului curent (cumpărate / vândute),
// cu navigare spre OrderStatusScreen pentru fiecare comandă.

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";
import { getMyOrders } from "../services/orderService";
import { ORDER_STATUS_LABELS } from "../types/escrow";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

export default function OrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [tab, setTab] = useState("asBuyer");
  const [orders, setOrders] = useState({ asBuyer: [], asSeller: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (e) {
      // ecranul rămâne pe empty state dacă preluarea eșuează
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
  }, [navigation]);

  const list = orders[tab];

  const renderItem = useCallback(
    ({ item: order }) => (
      <TouchableOpacity
        style={S.orderCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate(ROUTES.OrderStatus, {
            orderId: order.id,
            itemTitle: order.item?.title,
          })
        }
      >
        <Image
          source={{ uri: order.item?.images?.[0] ?? "https://via.placeholder.com/64" }}
          style={S.orderImage}
        />
        <View style={S.orderInfo}>
          <Text style={S.orderTitle} numberOfLines={1}>
            {order.item?.title ?? "Produs"}
          </Text>
          <Text style={S.orderStatus}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </Text>
        </View>
        <Text style={S.orderPrice}>{order.price_mdl} MDL</Text>
        <Ionicons name="chevron-forward" size={18} color={S.__colors.muted} />
      </TouchableOpacity>
    ),
    [S, navigation],
  );

  return (
    <View style={S.screen}>
      <View style={[S.content, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={S.header}>
          <TouchableOpacity style={S.backBtn} activeOpacity={0.9} onPress={goBackSafe}>
            <Ionicons name="chevron-back" size={22} color={S.__colors.text} />
          </TouchableOpacity>

          <Text style={S.title}>Comenzile mele</Text>

          <View style={S.headerSpacer} />
        </View>

        <View style={S.tabs}>
          <TouchableOpacity
            style={[S.tabBtn, tab === "asBuyer" && S.tabBtnActive]}
            onPress={() => setTab("asBuyer")}
          >
            <Text style={[S.tabText, tab === "asBuyer" && S.tabTextActive]}>
              Cumpărate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.tabBtn, tab === "asSeller" && S.tabBtnActive]}
            onPress={() => setTab("asSeller")}
          >
            <Text style={[S.tabText, tab === "asSeller" && S.tabTextActive]}>
              Vândute
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            color={S.__colors.primary}
            style={{ marginTop: 32 }}
          />
        ) : list.length === 0 ? (
          <View style={S.emptyCard}>
            <View style={S.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={28} color={S.__colors.primary} />
            </View>
            <Text style={S.emptyTitle}>Nu ai comenzi încă</Text>
            <Text style={S.emptyText}>
              {tab === "asBuyer"
                ? "Comenzile pe care le plasezi vor apărea aici."
                : "Comenzile primite de la cumpărători vor apărea aici."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(o) => o.id}
            renderItem={renderItem}
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#0B1220");
  const card = pickTok(tokens, "card", "#111A2E");
  const text = pickTok(tokens, "text", "#E5E7EB");
  const muted = pickTok(tokens, "muted", "#9CA3AF");
  const border = pickTok(tokens, "border", "rgba(255,255,255,0.10)");
  const primary = pickTok(tokens, "primary", "#2EC4B6");

  return StyleSheet.create({
    __colors: { text, primary, muted },

    screen: {
      flex: 1,
      backgroundColor: bg,
    },

    content: {
      flex: 1,
      paddingHorizontal: 16,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
    },

    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "900",
      color: text,
    },

    headerSpacer: {
      width: 44,
    },

    tabs: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
    },
    tabBtnActive: {
      backgroundColor: primary,
      borderColor: primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "700",
      color: muted,
    },
    tabTextActive: {
      color: "#FFFFFF",
    },

    orderCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
    },
    orderImage: {
      width: 52,
      height: 52,
      borderRadius: 10,
      backgroundColor: bg,
    },
    orderInfo: {
      flex: 1,
      gap: 3,
    },
    orderTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: text,
    },
    orderStatus: {
      fontSize: 12,
      color: muted,
    },
    orderPrice: {
      fontSize: 14,
      fontWeight: "700",
      color: primary,
    },

    emptyCard: {
      borderRadius: 24,
      padding: 22,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      alignItems: "center",
    },

    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(46,196,182,0.12)",
      borderWidth: 1,
      borderColor: "rgba(46,196,182,0.18)",
      marginBottom: 16,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: text,
      textAlign: "center",
    },

    emptyText: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      color: muted,
      fontWeight: "600",
      textAlign: "center",
    },
  });
}
