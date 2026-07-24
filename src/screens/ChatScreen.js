// src/screens/ChatScreen.js
// Ecran chat individual cu mesaje realtime
// + sunet la mesaj nou primit
// + refresh badge unread
// + soft delete mesaje proprii (long press)
// + filtru anti-bypass (detectare tranzacții în afara app)

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
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToMessages,
  deleteMessage,
} from "../services/chatService";
import { playMessageSound, unloadSound } from "../services/notificationService";
import { useUnread } from "../context/UnreadContext";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";
import HeaderBackButton from "../components/HeaderBackButton";

// ─────────────────────────────────────────────
// FILTRU ANTI-BYPASS
// Detectează încercări de a face tranzacții în afara app-ului
// ─────────────────────────────────────────────
const BYPASS_PATTERNS = [
  // Numere de telefon moldovenești
  /(\+373[\s\-]?\d{7,8}|\b0[67]\d{7}\b|\b\d{8}\b)/i,
  // IBAN
  /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/,
  // Număr de card (4x4 cifre)
  /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/,
  // Cuvinte cheie
  /\b(cash|numerar|revolut|whatsapp|telegram|viber|paypal|western\s*union|transfer\s*(pe\s*)?card|cont\s*bancar|iban|maib|mobiasbancă|mobiasbanca|moldindconbank|victoriabank|energbank|micb)\b/i,
  // Expresii comune de bypass
  /\b(platesc\s*direct|platim\s*direct|trimite\s*(mi\s*)?(banii|suma)|pe\s*card\s*direct|fara\s*aplicat|in\s*afara|in afara\s*app)\b/i,
];

function checkBypassAttempt(text) {
  if (!text) return false;
  return BYPASS_PATTERNS.some((pattern) => pattern.test(text));
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Azi";
  if (isYesterday) return "Ieri";

  return d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function groupMessagesByDate(messages) {
  const groups = [];
  let lastDate = "";

  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      groups.push({ type: "date", date: msg.created_at, id: `date-${d}` });
      lastDate = d;
    }
    groups.push({ type: "message", ...msg });
  }

  return groups;
}

// ─────────────────────────────────────────────
// COMPONENT BANNER AVERTIZARE
// ─────────────────────────────────────────────
function BypassWarningBanner({ visible, onDismiss }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        bannerStyles.container,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Ionicons
        name="warning"
        size={18}
        color="#92400E"
        style={{ marginTop: 1 }}
      />
      <View style={bannerStyles.textWrap}>
        <Text style={bannerStyles.title}>Atenție la siguranța ta</Text>
        <Text style={bannerStyles.body}>
          Tranzacțiile în afara ModaGo nu sunt protejate. Dacă plătești direct,
          nu putem garanta că vei primi articolul sau banii înapoi.
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color="#92400E" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    margin: 10,
    marginBottom: 0,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    fontWeight: "500",
    color: "#92400E",
    lineHeight: 17,
  },
});

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function ChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);
  const { refreshUnread } = useUnread();

  const conversation = route?.params?.conversation;
  const userId = route?.params?.userId;
  const conversationId = conversation?.id;

  const isBuyer = String(conversation?.buyer_id) === String(userId);
  const otherUser = isBuyer ? conversation?.seller : conversation?.buyer;
  const itemData = conversation?.item;

  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Banner anti-bypass
  const [showBypassWarning, setShowBypassWarning] = useState(false);
  // Previne spam-ul de banner (o singură dată per sesiune)
  const bypassShownRef = useRef(false);

  // ── Load messages ──
  useEffect(() => {
    if (!conversationId) return;

    (async () => {
      try {
        const msgs = await fetchMessages(conversationId);
        setMessages(msgs);
        await markMessagesAsRead(conversationId, userId);
        refreshUnread();
      } catch (e) {
        console.log("❌ loadMessages:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [conversationId, userId, refreshUnread]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!conversationId) return;

    const channel = subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (String(newMsg.sender_id) !== String(userId)) {
        playMessageSound();
        markMessagesAsRead(conversationId, userId);
        refreshUnread();

        // Verifică bypass în mesajele primite
        if (!bypassShownRef.current && checkBypassAttempt(newMsg.content)) {
          setShowBypassWarning(true);
          bypassShownRef.current = true;
        }
      }
    });

    return () => {
      channel?.unsubscribe?.();
      unloadSound();
    };
  }, [conversationId, userId, refreshUnread]);

  // ── Scroll la ultimul mesaj ──
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const groupedMessages = useMemo(
    () => groupMessagesByDate(messages),
    [messages],
  );

  // ── Trimite mesaj ──
  const onSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !conversationId || !userId || sending) return;

    // Verifică bypass în mesajele trimise
    if (!bypassShownRef.current && checkBypassAttempt(text)) {
      setShowBypassWarning(true);
      bypassShownRef.current = true;
      // Nu blocăm trimiterea — doar avertizăm (ca Vinted)
    }

    setSending(true);
    setInputText("");

    try {
      const sent = await sendMessage({
        conversationId,
        senderId: userId,
        content: text,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    } catch (e) {
      console.log("❌ sendMessage:", e);
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, conversationId, userId, sending]);

  // ── Soft delete mesaj ──
  const handleLongPress = useCallback(
    (message) => {
      // Doar mesajele proprii, neșterse
      if (String(message.sender_id) !== String(userId)) return;
      if (message.deleted_at) return;

      Alert.alert(
        "Șterge mesajul",
        'Mesajul va apărea ca "Mesaj șters" pentru ambii utilizatori.',
        [
          { text: "Anulează", style: "cancel" },
          {
            text: "Șterge",
            style: "destructive",
            onPress: async () => {
              const result = await deleteMessage(message.id, userId);
              if (result.success) {
                // Actualizează local imediat (fără să aștepte realtime)
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === message.id
                      ? { ...m, deleted_at: new Date().toISOString() }
                      : m,
                  ),
                );
              } else {
                Alert.alert(
                  "Eroare",
                  "Nu am putut șterge mesajul. Încearcă din nou.",
                );
              }
            },
          },
        ],
      );
    },
    [userId],
  );

  // ── Render item ──
  const renderItem = useCallback(
    ({ item }) => {
      // Separator de dată
      if (item.type === "date") {
        return (
          <View style={S.dateSeparator}>
            <Text style={S.dateSeparatorText}>
              {formatDateSeparator(item.date)}
            </Text>
          </View>
        );
      }

      const isMine = String(item.sender_id) === String(userId);
      const isDeleted = !!item.deleted_at;

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={400}
          disabled={!isMine} // Doar mesajele proprii au long press
        >
          <View style={[S.msgRow, isMine ? S.msgRowRight : S.msgRowLeft]}>
            <View
              style={[
                S.msgBubble,
                isMine ? S.msgBubbleMine : S.msgBubbleOther,
                isDeleted && S.msgBubbleDeleted,
              ]}
            >
              {isDeleted ? (
                <Text style={S.msgTextDeleted}>🚫 Mesaj șters</Text>
              ) : (
                <Text
                  style={[S.msgText, isMine ? S.msgTextMine : S.msgTextOther]}
                >
                  {item.content}
                </Text>
              )}
              {!isDeleted && (
                <Text
                  style={[S.msgTime, isMine ? S.msgTimeMine : S.msgTimeOther]}
                >
                  {formatMsgTime(item.created_at)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [S, userId, handleLongPress],
  );

  const keyExtractor = useCallback(
    (item) => item.id || `date-${item.date}`,
    [],
  );

  const goBack = useCallback(() => {
    refreshUnread();
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate(ROUTES.Inbox);
  }, [navigation, refreshUnread]);

  const openItem = useCallback(() => {
    if (!itemData) return;
    navigation.navigate(ROUTES.ItemDetails, { item: itemData });
  }, [navigation, itemData]);

  return (
    <KeyboardAvoidingView
      style={S.screen}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <HeaderBackButton onPress={goBack} absolute={false} size={40} />

        <TouchableOpacity
          activeOpacity={0.85}
          style={S.headerCenter}
          onPress={openItem}
        >
          <View style={S.headerInfo}>
            <Text style={S.headerUsername} numberOfLines={1}>
              {otherUser?.username || "Utilizator"}
            </Text>
            {itemData?.title && (
              <Text style={S.headerItemTitle} numberOfLines={1}>
                {itemData.title}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {itemData?.images?.[0] && (
          <TouchableOpacity activeOpacity={0.85} onPress={openItem}>
            <Image source={{ uri: itemData.images[0] }} style={S.headerThumb} />
          </TouchableOpacity>
        )}
      </View>

      {/* Banner anti-bypass */}
      <BypassWarningBanner
        visible={showBypassWarning}
        onDismiss={() => setShowBypassWarning(false)}
      />

      {/* Messages */}
      {loading ? (
        <View style={S.loadingCenter}>
          <ActivityIndicator size="large" color={S.__primaryColor} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={S.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd?.({ animated: false })
          }
        />
      )}

      {/* Input bar */}
      <View
        style={[S.inputBar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}
      >
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Scrie un mesaj..."
          placeholderTextColor={S.__mutedColor}
          style={S.textInput}
          multiline
          maxLength={1000}
          editable={!sending}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            S.sendBtn,
            (!inputText.trim() || sending) && S.sendBtnDisabled,
          ]}
          onPress={onSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  const isDark = tokens?.scheme === "dark";

  const bubbleMine = primary;
  const bubbleOther = isDark ? "rgba(255,255,255,0.08)" : "#F0F0F0";

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: border,
      backgroundColor: bg,
      gap: 10,
    },
    headerCenter: { flex: 1 },
    headerInfo: { gap: 2 },
    headerUsername: { fontSize: 16, fontWeight: "900", color: text },
    headerItemTitle: { fontSize: 13, fontWeight: "600", color: muted },
    headerThumb: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: border,
    },

    loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

    messagesList: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexGrow: 1,
    },

    dateSeparator: { alignItems: "center", paddingVertical: 12 },
    dateSeparatorText: {
      fontSize: 12,
      fontWeight: "700",
      color: muted,
      backgroundColor: bg,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 10,
      overflow: "hidden",
    },

    msgRow: { marginBottom: 6, maxWidth: "78%" },
    msgRowRight: { alignSelf: "flex-end" },
    msgRowLeft: { alignSelf: "flex-start" },

    msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    msgBubbleMine: { backgroundColor: bubbleMine, borderBottomRightRadius: 4 },
    msgBubbleOther: { backgroundColor: bubbleOther, borderBottomLeftRadius: 4 },

    // Stiluri pentru mesaj șters
    msgBubbleDeleted: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
    },
    msgTextDeleted: {
      fontSize: 13,
      fontStyle: "italic",
      fontWeight: "500",
      color: muted,
    },

    msgText: { fontSize: 15, lineHeight: 21, fontWeight: "500" },
    msgTextMine: { color: onPrimary },
    msgTextOther: { color: text },

    msgTime: {
      fontSize: 11,
      fontWeight: "600",
      marginTop: 4,
      alignSelf: "flex-end",
    },
    msgTimeMine: { color: "rgba(255,255,255,0.65)" },
    msgTimeOther: { color: muted },

    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: border,
      backgroundColor: bg,
      gap: 10,
    },
    textInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      borderRadius: 20,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      fontWeight: "600",
      color: text,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.4 },

    __primaryColor: primary,
    __mutedColor: muted,
  });
}
