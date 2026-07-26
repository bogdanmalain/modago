// src/screens/InboxScreen.js
// Ecran inbox: lista de conversații + refresh badge unread
// + long press → meniu opțiuni (ascunde conversație)

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { fetchConversations, hideConversation } from "../services/chatService";
import { getBlockedIds } from "../services/moderationService";
import { useUnread } from "../context/UnreadContext";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function getOtherUser(conversation, myId) {
  if (!conversation || !myId) return null;
  const isBuyer = String(conversation.buyer_id) === String(myId);
  return isBuyer ? conversation.seller : conversation.buyer;
}

function getItemThumb(conversation) {
  const images = conversation?.item?.images;
  if (Array.isArray(images) && images.length > 0) return images[0];
  return null;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "acum";
  if (mins < 60) return `${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}z`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}săpt`;

  const months = Math.floor(days / 30);
  return `${months}l`;
}

// ── Meniu opțiuni (modal bottom sheet simplu) ──
function ConvoOptionsMenu({
  visible,
  conversation,
  userId,
  onClose,
  onHide,
  tokens,
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible && !conversation) return null;

  const bg = pickTok(tokens, "card", "#FFFFFF");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", "#6B7280");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const isDark = tokens?.scheme === "dark";

  const other = conversation ? getOtherUser(conversation, userId) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={menuStyles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            menuStyles.sheet,
            {
              backgroundColor: bg,
              paddingBottom: Math.max(insets.bottom, 16),
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Handle */}
          <View style={[menuStyles.handle, { backgroundColor: muted }]} />

          {/* Header conversație */}
          {conversation && (
            <View
              style={[menuStyles.convoHeader, { borderBottomColor: border }]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={muted}
              />
              <Text
                style={[menuStyles.convoHeaderText, { color: muted }]}
                numberOfLines={1}
              >
                {other?.username || "Utilizator"} ·{" "}
                {conversation.item?.title || ""}
              </Text>
            </View>
          )}

          {/* Opțiune: Șterge conversația */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={menuStyles.option}
            onPress={onHide}
          >
            <View style={menuStyles.optionIconWrap}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </View>
            <View style={menuStyles.optionTextWrap}>
              <Text style={[menuStyles.optionTitle, { color: "#EF4444" }]}>
                Șterge conversația
              </Text>
              <Text style={[menuStyles.optionSub, { color: muted }]}>
                Dispare doar pentru tine. Celălalt utilizator nu e afectat.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Opțiune: Raportează */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              menuStyles.option,
              { borderTopWidth: 1, borderTopColor: border },
            ]}
            onPress={onClose}
          >
            <View style={menuStyles.optionIconWrap}>
              <Ionicons name="flag-outline" size={22} color={muted} />
            </View>
            <View style={menuStyles.optionTextWrap}>
              <Text style={[menuStyles.optionTitle, { color: text }]}>
                Raportează utilizatorul
              </Text>
              <Text style={[menuStyles.optionSub, { color: muted }]}>
                Trimite un raport echipei ModaGo
              </Text>
            </View>
          </TouchableOpacity>

          {/* Anulează */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[menuStyles.cancelBtn, { borderTopColor: border }]}
            onPress={onClose}
          >
            <Text style={[menuStyles.cancelText, { color: muted }]}>
              Anulează
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
    opacity: 0.3,
  },
  convoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  convoHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  optionIconWrap: {
    width: 36,
    alignItems: "center",
  },
  optionTextWrap: { flex: 1 },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionSub: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 18,
  },
  cancelBtn: {
    borderTopWidth: 1,
    paddingVertical: 18,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function InboxScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);
  const { refreshUnread } = useUnread();

  const [userId, setUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Meniu opțiuni
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState(null);

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

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const [data, blockedIds] = await Promise.all([
        fetchConversations(userId),
        getBlockedIds(),
      ]);

      const visible =
        blockedIds.size === 0
          ? data
          : data.filter((c) => {
              const otherId =
                String(c.buyer_id) === String(userId)
                  ? c.seller_id
                  : c.buyer_id;
              return !blockedIds.has(otherId);
            });

      setConversations(visible);
      refreshUnread();
    } catch (e) {
      console.log("❌ loadConversations:", e);
    } finally {
      setLoading(false);
    }
  }, [userId, refreshUnread]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      if (userId) loadConversations();
    }, [userId, loadConversations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const openChat = useCallback(
    (conversation) => {
      navigation.navigate(ROUTES.Chat, { conversation, userId });
    },
    [navigation, userId],
  );

  // Long press → deschide meniu
  const handleLongPress = useCallback((convo) => {
    setSelectedConvo(convo);
    setMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
    setTimeout(() => setSelectedConvo(null), 300);
  }, []);

  // Ascunde conversația pentru userul curent
  const handleHideConversation = useCallback(async () => {
    if (!selectedConvo || !userId) return;
    closeMenu();

    // Optimistic update — scoate imediat din listă
    setConversations((prev) => prev.filter((c) => c.id !== selectedConvo.id));

    const result = await hideConversation(selectedConvo.id, userId);
    if (!result.success) {
      // Revert dacă a eșuat
      loadConversations();
    } else {
      refreshUnread();
    }
  }, [selectedConvo, userId, closeMenu, loadConversations, refreshUnread]);

  const renderItem = useCallback(
    ({ item: convo }) => {
      const other = getOtherUser(convo, userId);
      const thumb = getItemThumb(convo);
      const lastMsg = convo.lastMessage;
      const unread = convo.unreadCount > 0;

      const previewText = lastMsg?.content
        ? lastMsg.content.length > 60
          ? lastMsg.content.slice(0, 60) + "…"
          : lastMsg.content
        : "Niciun mesaj încă";

      const isMine = lastMsg && String(lastMsg.sender_id) === String(userId);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={S.convoRow}
          onPress={() => openChat(convo)}
          onLongPress={() => handleLongPress(convo)}
          delayLongPress={400}
        >
          <View style={S.avatarWrap}>
            {other?.avatar_url ? (
              <Image source={{ uri: other.avatar_url }} style={S.avatar} />
            ) : (
              <View style={[S.avatar, S.avatarPlaceholder]}>
                <Text style={S.avatarLetter}>
                  {(other?.username || "?")[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            {unread && <View style={S.unreadDot} />}
          </View>

          <View style={S.convoTextWrap}>
            <View style={S.convoTopRow}>
              <Text
                style={[S.convoUsername, unread && S.convoUsernameBold]}
                numberOfLines={1}
              >
                {other?.username || "Utilizator"}
              </Text>
              <Text style={S.convoTime}>
                {formatTimeAgo(lastMsg?.created_at || convo.updated_at)}
              </Text>
            </View>

            <Text style={S.convoItemTitle} numberOfLines={1}>
              {convo.item?.title || ""}
            </Text>

            <Text
              style={[S.convoPreview, unread && S.convoPreviewBold]}
              numberOfLines={1}
            >
              {isMine ? `Tu: ${previewText}` : previewText}
            </Text>
          </View>

          {thumb && (
            <View style={S.thumbWrap}>
              <Image source={{ uri: thumb }} style={S.thumb} />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [S, userId, openChat, handleLongPress],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  if (!userId && !loading) {
    return (
      <View style={[S.screen, { paddingTop: insets.top }]}>
        <Text style={S.headerTitle}>Mesaje</Text>
        <View style={S.emptyCenter}>
          <Ionicons
            name="chatbubbles-outline"
            size={56}
            color={S.__mutedColor}
          />
          <Text style={S.emptyTitle}>Conectează-te</Text>
          <Text style={S.emptyText}>
            Trebuie să fii autentificat pentru a vedea mesajele.
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={S.loginBtn}
            onPress={() => navigation.navigate(ROUTES.Login)}
          >
            <Text style={S.loginBtnText}>Autentifică-te</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      <Text style={S.headerTitle}>Mesaje</Text>

      {loading ? (
        <View style={S.emptyCenter}>
          <ActivityIndicator size="large" color={S.__primaryColor} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={S.emptyCenter}>
          <Ionicons
            name="chatbubbles-outline"
            size={56}
            color={S.__mutedColor}
          />
          <Text style={S.emptyTitle}>Nicio conversație</Text>
          <Text style={S.emptyText}>
            Când trimiți sau primești un mesaj, conversația va apărea aici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + 80,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={S.__primaryColor}
            />
          }
        />
      )}

      {/* Meniu opțiuni long press */}
      <ConvoOptionsMenu
        visible={menuVisible}
        conversation={selectedConvo}
        userId={userId}
        onClose={closeMenu}
        onHide={handleHideConversation}
        tokens={tokens}
      />
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", "#6B7280");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const primary = pickTok(tokens, "primary", "#2CA6A4");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");
  const danger = pickTok(tokens, "danger", "#EF4444");

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },
    headerTitle: {
      fontSize: 28,
      fontWeight: "900",
      color: text,
      textAlign: "center",
      paddingVertical: 16,
    },
    convoRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: border,
      gap: 12,
    },
    avatarWrap: { position: "relative" },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarPlaceholder: {
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: { color: onPrimary, fontSize: 20, fontWeight: "900" },
    unreadDot: {
      position: "absolute",
      top: 0,
      right: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: danger,
      borderWidth: 2,
      borderColor: bg,
    },
    convoTextWrap: { flex: 1 },
    convoTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    convoUsername: { flex: 1, fontSize: 15, fontWeight: "700", color: text },
    convoUsernameBold: { fontWeight: "900" },
    convoTime: { fontSize: 12, fontWeight: "600", color: muted },
    convoItemTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: muted,
      marginTop: 2,
    },
    convoPreview: {
      fontSize: 14,
      fontWeight: "500",
      color: muted,
      marginTop: 2,
    },
    convoPreviewBold: { fontWeight: "800", color: text },
    thumbWrap: {
      width: 48,
      height: 48,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: border,
    },
    thumb: { width: "100%", height: "100%" },
    emptyCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 10,
    },
    emptyTitle: { fontSize: 20, fontWeight: "900", color: text, marginTop: 8 },
    emptyText: {
      fontSize: 15,
      fontWeight: "600",
      color: muted,
      textAlign: "center",
      lineHeight: 22,
    },
    loginBtn: {
      marginTop: 12,
      height: 48,
      paddingHorizontal: 28,
      borderRadius: 14,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },
    loginBtnText: { color: onPrimary, fontSize: 16, fontWeight: "900" },
    __primaryColor: primary,
    __mutedColor: muted,
  });
}
