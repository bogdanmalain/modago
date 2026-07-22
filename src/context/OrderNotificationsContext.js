// src/context/OrderNotificationsContext.js
// Notificări de comandă (comandă nouă, AWB adăugat, fonduri eliberate etc.)
// afișate ca banner la login / la intrarea în aplicație.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { supabase } from "../supabaseClient";
import {
  getUnreadNotifications,
  markNotificationRead,
  subscribeToNotifications,
} from "../services/orderService";

const OrderNotificationsContext = createContext({
  banner: null,
  dismissBanner: () => {},
});

export function useOrderNotifications() {
  return useContext(OrderNotificationsContext);
}

export function OrderNotificationsProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [queue, setQueue] = useState([]);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data?.session?.user?.id || null);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUserId(sess?.user?.id || null);
    });

    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  const loadUnread = useCallback(async () => {
    if (!userId) {
      setQueue([]);
      return;
    }
    try {
      const items = await getUnreadNotifications();
      setQueue(items);
    } catch (e) {
      console.log("⚠️ loadUnread notifications:", e);
    }
  }, [userId]);

  // La login / schimbare user
  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  // La revenirea aplicației din background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        loadUnread();
      }
      appState.current = nextState;
    });

    return () => sub?.remove?.();
  }, [loadUnread]);

  // Realtime: notificare nouă în timp ce aplicația e deschisă
  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToNotifications(userId, (notification) => {
      setQueue((prev) => [notification, ...prev]);
    });

    return () => {
      channel?.unsubscribe?.();
    };
  }, [userId]);

  const dismissBanner = useCallback(() => {
    setQueue((prev) => {
      const [current, ...rest] = prev;
      if (current) {
        markNotificationRead(current.id).catch((e) =>
          console.log("⚠️ markNotificationRead:", e),
        );
      }
      return rest;
    });
  }, []);

  const banner = queue.length > 0 ? queue[0] : null;

  return (
    <OrderNotificationsContext.Provider value={{ banner, dismissBanner }}>
      {children}
    </OrderNotificationsContext.Provider>
  );
}
