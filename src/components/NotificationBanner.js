// src/components/NotificationBanner.js
// Banner care apare la login / la intrarea în aplicație (sau live, dacă
// aplicația e deschisă) pentru evenimente de comandă: comandă nouă,
// AWB adăugat, fonduri eliberate etc.

import React, { useContext, useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../theme/ThemeProvider";
import { useOrderNotifications } from "../context/OrderNotificationsContext";
import { ROUTES } from "../navigation/routes";

const AUTO_DISMISS_MS = 5000;

const EVENT_ICON = {
  new_order: "bag-check-outline",
  order_shipped: "cube-outline",
  order_completed: "checkmark-done-circle-outline",
  funds_released: "cash-outline",
  refund_processed: "cash-outline",
  refund_issued: "cash-outline",
  dispute_resolved: "shield-checkmark-outline",
};

export default function NotificationBanner({ navRef }) {
  const { banner, dismissBanner } = useOrderNotifications();
  const { tokens: colors } = useContext(ThemeContext) ?? {};
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-140)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!banner) return;

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 9,
    }).start();

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?.id]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 200,
      useNativeDriver: true,
    }).start(() => dismissBanner());
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const orderId = banner?.order_id;
    if (orderId && navRef?.current?.isReady?.()) {
      navRef.current.navigate(ROUTES.OrderStatus, { orderId });
    }
    handleDismiss();
  };

  if (!banner) return null;

  const iconName = EVENT_ICON[banner.type] || "notifications-outline";
  const bg = colors?.card ?? "#1c1c1e";
  const textColor = colors?.text ?? "#fff";
  const subTextColor = colors?.subtext ?? "rgba(255,255,255,0.7)";
  const accent = colors?.primary ?? "#00BFA5";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingTop: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={[styles.card, { backgroundColor: bg }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
          <Ionicons name={iconName} size={22} color={accent} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text
            style={[styles.body, { color: subTextColor }]}
            numberOfLines={2}
          >
            {banner.body}
          </Text>
        </View>
        <Pressable onPress={handleDismiss} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={subTextColor} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
