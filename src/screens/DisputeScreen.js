// ================================================================
// ModaGo – DisputeScreen.js
// Fișier: src/screens/DisputeScreen.js
//
// Flow:
//   OrderStatusScreen → DisputeScreen
//
// Doar pentru participanți (buyer/seller) — admin rezolvă din
// AdminDisputeDetailScreen (ecran separat, nu de aici).
//
// Cumpărătorul poate deschide o dispută (doar din status 'shipped').
// Odată deschisă, ambele părți pot adăuga dovezi (poze / notă text) cât
// timp disputa e 'open'/'under_review'. Cumpărătorul poate propune un
// procent de rambursare; vânzătorul poate accepta (rezolvare automată,
// fără admin) sau respinge (escaladează la admin — 'under_review').
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useContext } from "react";
import * as ImagePicker from "expo-image-picker";
import { ThemeContext } from "../theme/ThemeProvider";
import { supabase } from "../supabaseClient";
import {
  getOrderById,
  openDispute,
  getDisputeForOrder,
  getDisputeEvidence,
  addDisputeEvidence,
  uploadDisputeImage,
  getDisputeEvidenceSignedUrl,
  proposeRefundOffer,
  rejectRefundOffer,
  acceptRefundOffer,
  getDisputeMessages,
  sendDisputeMessage,
  submitReturnShipment,
  confirmReturnReceived,
} from "../services/orderService";
import { DISPUTE_STATUS_LABELS } from "../types/escrow";

const DISPUTE_REASONS = [
  "Coletul nu a sosit",
  "Produsul nu corespunde descrierii",
  "Produsul a ajuns deteriorat",
  "Alt motiv",
];

const OFFER_PRESETS = [25, 50, 75, 100];

export default function DisputeScreen({ route, navigation }) {
  const { orderId, itemTitle } = route.params ?? {};

  const { tokens } = useContext(ThemeContext);
  const isDark = tokens?.scheme === "dark";
  const TEAL = tokens?.primary ?? "#2CA6A4";
  const s = styles(isDark, TEAL);
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState(null);
  const [order, setOrder] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [evidenceUrls, setEvidenceUrls] = useState({});
  const [loading, setLoading] = useState(true);

  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [pickedImages, setPickedImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [addingEvidence, setAddingEvidence] = useState(false);

  const [offerPct, setOfferPct] = useState(OFFER_PRESETS[1]);
  const [proposingOffer, setProposingOffer] = useState(false);
  const [respondingOffer, setRespondingOffer] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const [returnTracking, setReturnTracking] = useState("");
  const [returnCost, setReturnCost] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
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
        setMessages(await getDisputeMessages(disputeData.id));
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

  const pickEvidenceImages = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uris = (result.assets ?? []).map((a) => a.uri).filter(Boolean);
      setPickedImages((prev) => [...prev, ...uris].slice(0, 5));
    } catch (e) {
      Alert.alert("Eroare", e?.message || "Nu pot alege imagini.");
    }
  }, []);

  const handleOpenDispute = useCallback(async () => {
    const finalReason =
      reason === "Alt motiv" ? customReason.trim() : reason;

    if (!finalReason) {
      Alert.alert("Motiv lipsă", "Descrie pe scurt problema.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await openDispute({ order_id: orderId, reason: finalReason });

      for (const uri of pickedImages) {
        const path = await uploadDisputeImage(created.id, uri);
        await addDisputeEvidence(created.id, "image", path);
      }

      await load();
    } catch (e) {
      Alert.alert("Eroare", e.message ?? "Nu am putut deschide disputa.");
    } finally {
      setSubmitting(false);
    }
  }, [orderId, reason, customReason, pickedImages, load]);

  const handleAddEvidence = useCallback(async () => {
    if (!dispute) return;
    setAddingEvidence(true);
    try {
      if (noteText.trim()) {
        await addDisputeEvidence(dispute.id, "text_note", noteText.trim());
        setNoteText("");
      }
      for (const uri of pickedImages) {
        const path = await uploadDisputeImage(dispute.id, uri);
        await addDisputeEvidence(dispute.id, "image", path);
      }
      setPickedImages([]);
      await load();
    } catch (e) {
      Alert.alert("Eroare", e.message ?? "Nu am putut adăuga dovada.");
    } finally {
      setAddingEvidence(false);
    }
  }, [dispute, noteText, pickedImages, load]);

  const handleProposeOffer = useCallback(async () => {
    if (!dispute) return;
    setProposingOffer(true);
    try {
      await proposeRefundOffer(dispute.id, offerPct);
      await load();
    } catch (e) {
      Alert.alert("Eroare", e.message ?? "Nu am putut trimite oferta.");
    } finally {
      setProposingOffer(false);
    }
  }, [dispute, offerPct, load]);

  const handleAcceptOffer = useCallback(() => {
    if (!order || !dispute) return;
    Alert.alert(
      "Confirmă",
      `Accepți să rambursezi ${dispute.buyer_offer_pct}% cumpărătorului?`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setRespondingOffer(true);
            try {
              await acceptRefundOffer(order.id);
              await load();
            } catch (e) {
              Alert.alert("Eroare", e.message ?? "Nu am putut accepta oferta.");
            } finally {
              setRespondingOffer(false);
            }
          },
        },
      ],
    );
  }, [order, dispute, load]);

  const handleRejectOffer = useCallback(() => {
    if (!dispute) return;
    Alert.alert(
      "Respinge oferta",
      "Disputa va fi trimisă echipei ModaGo pentru o decizie finală. Continui?",
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Respinge",
          style: "destructive",
          onPress: async () => {
            setRespondingOffer(true);
            try {
              await rejectRefundOffer(dispute.id, order.id);
              await load();
            } catch (e) {
              Alert.alert("Eroare", e.message ?? "Nu am putut respinge oferta.");
            } finally {
              setRespondingOffer(false);
            }
          },
        },
      ],
    );
  }, [dispute, order, load]);

  const handleSendChat = useCallback(async () => {
    const text = chatText.trim();
    if (!text || !dispute) return;
    setSendingChat(true);
    try {
      await sendDisputeMessage(dispute.id, text);
      setChatText("");
      setMessages(await getDisputeMessages(dispute.id));
    } catch (e) {
      Alert.alert("Eroare", e.message ?? "Nu am putut trimite mesajul.");
    } finally {
      setSendingChat(false);
    }
  }, [chatText, dispute]);

  const handleSubmitReturn = useCallback(async () => {
    if (!dispute) return;
    const tracking = returnTracking.trim();
    const cleanedCost = returnCost.replace(",", ".").replace(/[^0-9.]/g, "");
    const cost = Number(cleanedCost);
    if (!tracking) {
      Alert.alert("AWB lipsă", "Introdu numărul de tracking al returului.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      Alert.alert("Cost invalid", "Introdu costul plătit pentru AWB (în MDL).");
      return;
    }
    setSubmittingReturn(true);
    try {
      await submitReturnShipment(dispute.id, tracking, cost);
      await load();
    } catch (e) {
      Alert.alert("Eroare", e.message ?? "Nu am putut trimite datele returului.");
    } finally {
      setSubmittingReturn(false);
    }
  }, [dispute, returnTracking, returnCost, load]);

  const handleConfirmReturn = useCallback(() => {
    if (!order || !dispute) return;
    Alert.alert(
      "Confirmă primirea",
      `Confirmi că ai primit produsul înapoi (AWB ${dispute.return_tracking_number})? Se va declanșa rambursarea completă către cumpărător.`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setConfirmingReturn(true);
            try {
              await confirmReturnReceived(order.id);
              await load();
            } catch (e) {
              Alert.alert("Eroare", e.message ?? "Nu am putut confirma primirea.");
            } finally {
              setConfirmingReturn(false);
            }
          },
        },
      ],
    );
  }, [order, dispute, load]);

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

  const isBuyer = !!userId && order.buyer_id === userId;
  const isSeller = !!userId && order.seller_id === userId;
  const isParticipant = isBuyer || isSeller;
  const canOpenDispute = isBuyer && !dispute && order.status === "shipped";
  const canAddEvidence =
    isParticipant &&
    dispute &&
    ["open", "under_review"].includes(dispute.status);
  const isResolved =
    dispute && ["resolved_release", "resolved_refund", "resolved_split", "closed"].includes(
      dispute.status,
    );
  const isEscalated = dispute?.status === "under_review";
  const canProposeOffer =
    isBuyer && dispute?.status === "open" && dispute.offer_status === "none";
  const canRespondOffer = isSeller && dispute?.offer_status === "pending";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={goBackSafe} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dispută</Text>
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

        {!isParticipant && (
          <View style={s.card}>
            <Text style={s.errorText}>
              Nu ai acces la disputa acestei comenzi.
            </Text>
          </View>
        )}

        {dispute && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Status dispută</Text>
            <Text style={[s.statusBadge, isResolved && s.statusBadgeResolved]}>
              {DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
            </Text>
            <Text style={s.reasonLabel}>Motiv</Text>
            <Text style={s.reasonText}>{dispute.reason}</Text>
          </View>
        )}

        {canOpenDispute && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Deschide o dispută</Text>
            <Text style={s.helperText}>
              Folosește asta doar dacă ai o problemă reală cu comanda —
              coletul nu a sosit, produsul e diferit de descriere sau a
              ajuns deteriorat.
            </Text>

            <View style={s.reasonChips}>
              {DISPUTE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.reasonChip, reason === r && s.reasonChipActive]}
                  onPress={() => setReason(r)}
                >
                  <Text
                    style={[
                      s.reasonChipText,
                      reason === r && s.reasonChipTextActive,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {reason === "Alt motiv" && (
              <TextInput
                style={s.textInput}
                placeholder="Descrie problema..."
                placeholderTextColor={isDark ? "#8E8E93" : "#9CA3AF"}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
              />
            )}

            <TouchableOpacity style={s.attachBtn} onPress={pickEvidenceImages}>
              <Ionicons name="camera-outline" size={18} color={TEAL} />
              <Text style={s.attachBtnText}>
                Atașează poze dovadă ({pickedImages.length}/5)
              </Text>
            </TouchableOpacity>

            {pickedImages.length > 0 && (
              <View style={s.imageRow}>
                {pickedImages.map((uri) => (
                  <Image key={uri} source={{ uri }} style={s.thumb} />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[s.submitBtn, submitting && s.btnDisabled]}
              onPress={handleOpenDispute}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Deschide disputa</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {canProposeOffer && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Propune o soluție</Text>
            <Text style={s.helperText}>
              Ceri un procent din preț înapoi, păstrând produsul. Vânzătorul
              poate accepta sau respinge — dacă respinge, decide ModaGo.
            </Text>
            <View style={s.reasonChips}>
              {OFFER_PRESETS.map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[s.reasonChip, offerPct === pct && s.reasonChipActive]}
                  onPress={() => setOfferPct(pct)}
                >
                  <Text
                    style={[
                      s.reasonChipText,
                      offerPct === pct && s.reasonChipTextActive,
                    ]}
                  >
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[s.submitBtn, proposingOffer && s.btnDisabled]}
              onPress={handleProposeOffer}
              disabled={proposingOffer}
            >
              {proposingOffer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Trimite propunerea ({offerPct}%)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {dispute?.offer_status === "pending" && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Ofertă în așteptare</Text>
            <Text style={s.reasonText}>
              Cumpărătorul a cerut o rambursare de{" "}
              <Text style={{ fontWeight: "700" }}>{dispute.buyer_offer_pct}%</Text>{" "}
              din preț, păstrând produsul.
            </Text>
            {canRespondOffer && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[s.resolveBtn, s.resolveBtnRelease, { flex: 1 }, respondingOffer && s.btnDisabled]}
                  onPress={handleAcceptOffer}
                  disabled={respondingOffer}
                >
                  <Text style={s.resolveBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.resolveBtn, s.resolveBtnRefund, { flex: 1 }, respondingOffer && s.btnDisabled]}
                  onPress={handleRejectOffer}
                  disabled={respondingOffer}
                >
                  <Text style={s.resolveBtnText}>Respinge</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {isEscalated && (
          <View style={[s.card, s.escalatedCard]}>
            <Text style={s.escalatedText}>
              Disputa a fost trimisă echipei ModaGo pentru o decizie finală.
            </Text>
          </View>
        )}

        {isBuyer && dispute?.return_stage === "awaiting_return" && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Trimite produsul înapoi</Text>
            <Text style={s.helperText}>
              ModaGo a decis rambursare completă, dar mai întâi trebuie să
              trimiți produsul înapoi vânzătorului. Costul AWB-ului ți se
              rambursează separat — nu-l suporți tu.
            </Text>
            <TextInput
              style={s.textInput}
              placeholder="Număr AWB retur"
              placeholderTextColor={isDark ? "#8E8E93" : "#9CA3AF"}
              value={returnTracking}
              onChangeText={setReturnTracking}
            />
            <TextInput
              style={s.textInput}
              placeholder="Cost AWB plătit (MDL)"
              placeholderTextColor={isDark ? "#8E8E93" : "#9CA3AF"}
              value={returnCost}
              onChangeText={(text) => setReturnCost(text.replace(/[^0-9.,]/g, ""))}
              keyboardType="decimal-pad"
            />
            <Text style={s.helperText}>
              Atașează și o poză cu bonul AWB mai jos, la Dovezi.
            </Text>
            <TouchableOpacity
              style={[s.submitBtn, submittingReturn && s.btnDisabled]}
              onPress={handleSubmitReturn}
              disabled={submittingReturn}
            >
              {submittingReturn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Trimite datele returului</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isSeller && dispute?.return_stage === "shipped" && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Retur în drum spre tine</Text>
            <Text style={s.reasonText}>
              Cumpărătorul a trimis produsul înapoi. AWB:{" "}
              <Text style={{ fontWeight: "700" }}>{dispute.return_tracking_number}</Text>
            </Text>
            <Text style={s.helperText}>
              Confirmă doar după ce ai primit fizic coletul.
            </Text>
            <TouchableOpacity
              style={[s.submitBtn, confirmingReturn && s.btnDisabled]}
              onPress={handleConfirmReturn}
              disabled={confirmingReturn}
            >
              {confirmingReturn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Am primit coletul înapoi</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {dispute?.return_stage === "shipped" && isBuyer && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Retur trimis</Text>
            <Text style={s.reasonText}>
              AWB: {dispute.return_tracking_number} — aștepți confirmarea
              vânzătorului pentru rambursare.
            </Text>
          </View>
        )}

        {dispute && evidence.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Dovezi</Text>
            {evidence.map((e) => (
              <View key={e.id} style={s.evidenceItem}>
                <Text style={s.evidenceAuthor}>
                  {e.uploaded_by === userId ? "Tu" : "Cealaltă parte"}
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

        {canAddEvidence && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Adaugă o dovadă</Text>
            <TextInput
              style={s.textInput}
              placeholder="Notă text (opțional)"
              placeholderTextColor={isDark ? "#8E8E93" : "#9CA3AF"}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <TouchableOpacity style={s.attachBtn} onPress={pickEvidenceImages}>
              <Ionicons name="camera-outline" size={18} color={TEAL} />
              <Text style={s.attachBtnText}>
                Atașează poze ({pickedImages.length}/5)
              </Text>
            </TouchableOpacity>
            {pickedImages.length > 0 && (
              <View style={s.imageRow}>
                {pickedImages.map((uri) => (
                  <Image key={uri} source={{ uri }} style={s.thumb} />
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[s.submitBtn, addingEvidence && s.btnDisabled]}
              onPress={handleAddEvidence}
              disabled={addingEvidence}
            >
              {addingEvidence ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Trimite dovada</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {dispute && isParticipant && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Discuție</Text>
            {messages.length === 0 && (
              <Text style={s.helperText}>
                Niciun mesaj încă. Aici poate scrie și echipa ModaGo dacă are
                nevoie de detalii suplimentare.
              </Text>
            )}
            {messages.map((m) => {
              const isMe = m.sender_id === userId;
              const isFromAdmin = !isMe && m.sender_id !== order.buyer_id && m.sender_id !== order.seller_id;
              return (
                <View
                  key={m.id}
                  style={[s.chatBubble, isMe ? s.chatBubbleMe : s.chatBubbleOther]}
                >
                  <Text style={[s.chatWho, isMe && s.chatTextOnTeal]}>
                    {isMe ? "Tu" : isFromAdmin ? "ModaGo" : "Cealaltă parte"}
                  </Text>
                  <Text style={[s.chatBody, isMe && s.chatTextOnTeal]}>{m.body}</Text>
                </View>
              );
            })}
            {isResolved ? (
              <Text style={s.helperText}>
                Disputa a fost finalizată — discuția e închisă.
              </Text>
            ) : (
              <View style={s.chatInputRow}>
                <TextInput
                  style={s.chatInput}
                  placeholder="Scrie un mesaj..."
                  placeholderTextColor={isDark ? "#8E8E93" : "#9CA3AF"}
                  value={chatText}
                  onChangeText={setChatText}
                />
                <TouchableOpacity
                  style={[s.chatSendBtn, sendingChat && s.btnDisabled]}
                  onPress={handleSendChat}
                  disabled={sendingChat}
                >
                  {sendingChat ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================
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

    reasonChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    reasonChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    reasonChipActive: { backgroundColor: TEAL, borderColor: TEAL },
    reasonChipText: { fontSize: 13, color: isDark ? "#AEAEB2" : "#6E6E73" },
    reasonChipTextActive: { color: "#FFFFFF", fontWeight: "600" },

    textInput: {
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 10,
      minHeight: 44,
      textAlignVertical: "top",
    },

    attachBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      marginBottom: 10,
    },
    attachBtnText: { fontSize: 14, color: TEAL, fontWeight: "600" },

    imageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    thumb: { width: 64, height: 64, borderRadius: 8 },

    submitBtn: {
      backgroundColor: TEAL,
      borderRadius: 12,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    btnDisabled: { opacity: 0.5 },
    submitBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

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
    },
    resolveBtnRelease: { backgroundColor: TEAL },
    resolveBtnRefund: { backgroundColor: "#B00020" },
    resolveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

    escalatedCard: { backgroundColor: isDark ? "#2B2410" : "#FFF6E0" },
    escalatedText: { fontSize: 13, color: isDark ? "#E8C978" : "#8A6D00", lineHeight: 18 },

    chatBubble: { maxWidth: "85%", borderRadius: 12, padding: 10, marginBottom: 8 },
    chatBubbleMe: { alignSelf: "flex-end", backgroundColor: TEAL },
    chatBubbleOther: { alignSelf: "flex-start", backgroundColor: isDark ? "#2C2C2E" : "#EEEEEE" },
    chatWho: { fontSize: 11, fontWeight: "700", opacity: 0.7, marginBottom: 2, color: isDark ? "#FFFFFF" : "#000000" },
    chatBody: { fontSize: 14, color: isDark ? "#FFFFFF" : "#000000", lineHeight: 19 },
    chatTextOnTeal: { color: "#FFFFFF" },

    chatInputRow: { flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" },
    chatInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: isDark ? "#FFFFFF" : "#000000",
    },
    chatSendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: TEAL,
      alignItems: "center",
      justifyContent: "center",
    },
  });
