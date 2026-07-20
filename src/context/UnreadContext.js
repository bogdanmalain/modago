// src/context/UnreadContext.js

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
  fetchUnreadCount,
  playMessageSound,
} from "../services/notificationService"; // ✅ adaugă playMessageSound

const UnreadContext = createContext({
  unreadCount: 0,
  refreshUnread: () => {},
});

export function useUnread() {
  return useContext(UnreadContext);
}

export function UnreadProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState(null);
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

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    const count = await fetchUnreadCount(userId);
    setUnreadCount(count);
  }, [userId]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        refreshUnread();
      }
      appState.current = nextState;
    });

    return () => sub?.remove?.();
  }, [refreshUnread]);

  // ✅ Realtime cu sunet
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("global-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload?.new?.sender_id !== userId) {
            refreshUnread();
            playMessageSound(); // ✅ ASTA lipsea
          }
        },
      )
      .subscribe();

    return () => {
      channel?.unsubscribe?.();
    };
  }, [userId, refreshUnread]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}
