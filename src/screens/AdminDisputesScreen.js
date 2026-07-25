// ================================================================
// ModaGo – AdminDisputesScreen.js
// Fișier: src/screens/AdminDisputesScreen.js
//
// Listă cu disputele deschise (status 'open'/'under_review'), doar
// pentru conturi cu profiles.is_admin = true (RLS: disputes_select_admin).
// Tap pe un rând → DisputeScreen (care are, pentru admin, și butoanele
// de rezolvare).
// ================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useContext } from "react";
import { ThemeContext } from "../theme/ThemeProvider";
import { getOpenDisputes } from "../services/orderService";
import { DISPUTE_STATUS_LABELS } from "../types/escrow";
import { ROUTES } from "../navigation/routes";

export default function AdminDisputesScreen({ navigation }) {
  const { tokens } = useContext(ThemeContext);
  const isDark = tokens?.scheme === "dark";
  const TEAL = tokens?.primary ?? "#2CA6A4";
  const s = styles(isDark, TEAL);
  const insets = useSafeAreaInsets();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOpenDisputes();
      setDisputes(data);
    } catch (e) {
      // RLS blochează non-admin — lista rămâne goală, nu e nevoie de alertă.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={s.row}
        onPress={() =>
          navigation.navigate(ROUTES.AdminDisputeDetail, {
            orderId: item.order.id,
            itemTitle: item.order.item?.title,
          })
        }
      >
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle} numberOfLines={1}>
            {item.order.item?.title ?? "Produs"} · {item.order.price_mdl} MDL
          </Text>
          <Text style={s.rowReason} numberOfLines={2}>
            {item.reason}
          </Text>
          <Text style={s.rowStatus}>
            {DISPUTE_STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={isDark ? "#8E8E93" : "#6E6E73"} />
      </TouchableOpacity>
    ),
    [navigation, s, isDark],
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={goBackSafe} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dispute deschise</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.centerFill}>
          <ActivityIndicator color={TEAL} size="large" />
        </View>
      ) : disputes.length === 0 ? (
        <View style={s.centerFill}>
          <Text style={s.emptyText}>Nu există dispute deschise.</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = (isDark, TEAL) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#000" : "#F5F5F5" },
    centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { fontSize: 15, color: isDark ? "#8E8E93" : "#6E6E73" },

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

    list: { padding: 16, gap: 10 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 14,
      padding: 16,
      gap: 10,
    },
    rowTitle: { fontSize: 15, fontWeight: "600", color: isDark ? "#FFFFFF" : "#000000" },
    rowReason: {
      fontSize: 13,
      color: isDark ? "#AEAEB2" : "#6E6E73",
      marginTop: 4,
    },
    rowStatus: { fontSize: 12, fontWeight: "600", color: "#B00020", marginTop: 6 },
  });
