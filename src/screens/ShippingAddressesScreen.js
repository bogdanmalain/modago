// ================================================================
// ModaGo – ShippingAddressesScreen.js
// Fișier: src/screens/ShippingAddressesScreen.js
//
// Folosit în două moduri:
//   1. Din CheckoutScreen (cu onSelect callback) → selectare adresă
//   2. Din ProfileScreen → gestionare adrese
// ================================================================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { useContext } from "react";
import { ThemeContext } from "../theme/ThemeProvider";
import {
  getMyAddresses,
  saveAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../services/orderService";

export default function ShippingAddressesScreen({ route, navigation }) {
  const onSelect = route.params?.onSelect;
  const isSelector = !!onSelect;

  const { tokens } = useContext(ThemeContext);
  const isDark = tokens?.scheme === "dark";
  const TEAL = tokens?.primary ?? "#2CA6A4";
  const TEAL_LIGHT = isDark ? "rgba(44,166,164,0.15)" : "rgba(44,166,164,0.10)";
  const TEAL_DARK = "#1A7A78";
  const s = styles(isDark, TEAL, TEAL_LIGHT, TEAL_DARK);
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getMyAddresses();
      setAddresses(data);
    } catch {
      Alert.alert("Eroare", "Nu am putut încărca adresele.");
    } finally {
      setLoading(false);
    }
  }

  function emptyForm() {
    return {
      label: "Acasă",
      full_name: "",
      phone: "",
      city: "",
      address: "",
      postal_code: "",
      is_default: false,
    };
  }

  async function handleSave() {
    if (!form.full_name || !form.phone || !form.city || !form.address) {
      Alert.alert(
        "Câmpuri obligatorii",
        "Completează: nume, telefon, oraș, adresă.",
      );
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { label, full_name, phone, city, address, postal_code } = form;
        const updated = await updateAddress(editingId, {
          label,
          full_name,
          phone,
          city,
          address,
          postal_code,
        });
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a)),
        );
      } else {
        const newAddr = await saveAddress(form);
        setAddresses((prev) => {
          const rest = form.is_default
            ? prev.map((a) => ({ ...a, is_default: false }))
            : prev;
          return [newAddr, ...rest];
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    } catch {
      Alert.alert("Eroare", "Nu am putut salva adresa.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(addr) {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? "Acasă",
      full_name: addr.full_name ?? "",
      phone: addr.phone ?? "",
      city: addr.city ?? "",
      address: addr.address ?? "",
      postal_code: addr.postal_code ?? "",
      is_default: !!addr.is_default,
    });
    setShowForm(true);
  }

  async function handleDelete(id) {
    Alert.alert("Șterge adresa", "Ești sigur?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAddress(id);
            setAddresses((prev) => prev.filter((a) => a.id !== id));
          } catch {
            Alert.alert("Eroare", "Nu am putut șterge adresa.");
          }
        },
      },
    ]);
  }

  async function handleSetDefault(id) {
    try {
      await setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id })),
      );
    } catch {
      Alert.alert("Eroare", "Nu am putut seta adresa implicită.");
    }
  }

  function handleSelect(addr) {
    if (onSelect) {
      onSelect(addr);
      navigation.goBack();
    }
  }

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isSelector ? "Selectează adresa" : "Adresele mele"}
        </Text>
        <TouchableOpacity style={s.addBtn} onPress={openNewForm}>
          <Ionicons name="add" size={24} color={TEAL} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          {addresses.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons
                name="location-outline"
                size={48}
                color={isDark ? "#555" : "#CCC"}
              />
              <Text style={s.emptyTitle}>Nicio adresă salvată</Text>
              <Text style={s.emptySubtitle}>Adaugă o adresă de livrare</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={openNewForm}
              >
                <Text style={s.emptyBtnText}>Adaugă adresă</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((addr) => (
              <Swipeable
                key={addr.id}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={s.swipeDeleteBtn}
                    onPress={() => handleDelete(addr.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={s.swipeDeleteText}>Șterge</Text>
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  style={[s.card, isSelector && s.cardSelectable]}
                  onPress={() => (isSelector ? handleSelect(addr) : null)}
                  activeOpacity={isSelector ? 0.7 : 1}
                >
                  <View style={s.cardTop}>
                    <View style={s.labelRow}>
                      <Ionicons name="location" size={16} color={TEAL} />
                      <Text style={s.labelText}>{addr.label}</Text>
                      {addr.is_default && (
                        <View style={s.defaultBadge}>
                          <Text style={s.defaultText}>Implicit</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleEdit(addr)}>
                      <Ionicons
                        name="create-outline"
                        size={19}
                        color={isDark ? "#AEAEB2" : "#6E6E73"}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={s.addrName}>{addr.full_name}</Text>
                  <Text style={s.addrLine}>{addr.address}</Text>
                  <Text style={s.addrLine}>
                    {addr.city}
                    {addr.postal_code ? `, ${addr.postal_code}` : ""}
                  </Text>
                  <Text style={s.addrPhone}>{addr.phone}</Text>

                  {!isSelector && !addr.is_default && (
                    <TouchableOpacity
                      style={s.setDefaultBtn}
                      onPress={() => handleSetDefault(addr.id)}
                    >
                      <Text style={s.setDefaultText}>Setează ca implicit</Text>
                    </TouchableOpacity>
                  )}

                  {isSelector && (
                    <View style={s.selectIndicator}>
                      <Ionicons name="chevron-forward" size={16} color={TEAL} />
                    </View>
                  )}
                </TouchableOpacity>
              </Swipeable>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Modal formular adresă nouă ── */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={s.modalCancel}>Anulează</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {editingId ? "Editează adresă" : "Adresă nouă"}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={TEAL} />
              ) : (
                <Text style={s.modalSave}>Salvează</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.formContent}>
            <FormField
              label="Etichetă"
              value={form.label}
              isDark={isDark}
              onChange={(v) => setForm((f) => ({ ...f, label: v }))}
              placeholder="Acasă, Birou..."
              s={s}
            />
            <FormField
              label="Nume complet *"
              value={form.full_name}
              isDark={isDark}
              onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
              placeholder="Ion Popescu"
              s={s}
            />
            <FormField
              label="Telefon *"
              value={form.phone}
              isDark={isDark}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              placeholder="+373 69 000 000"
              keyboardType="phone-pad"
              s={s}
            />
            <FormField
              label="Oraș *"
              value={form.city}
              isDark={isDark}
              onChange={(v) => setForm((f) => ({ ...f, city: v }))}
              placeholder="Chișinău"
              s={s}
            />
            <FormField
              label="Adresă (stradă, nr., apart.) *"
              value={form.address}
              isDark={isDark}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              placeholder="Str. Ștefan cel Mare 100, ap. 5"
              multiline
              s={s}
            />
            <FormField
              label="Cod poștal"
              value={form.postal_code}
              isDark={isDark}
              onChange={(v) => setForm((f) => ({ ...f, postal_code: v }))}
              placeholder="MD-2001"
              keyboardType="number-pad"
              s={s}
            />

            {/* Toggle default */}
            <TouchableOpacity
              style={s.defaultToggle}
              onPress={() =>
                setForm((f) => ({ ...f, is_default: !f.is_default }))
              }
            >
              <View style={[s.checkbox, form.is_default && s.checkboxActive]}>
                {form.is_default && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={s.defaultToggleText}>
                Setează ca adresă implicită
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
  s,
  isDark,
}) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && s.fieldInputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#555" : "#AAA"}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        autoCapitalize="sentences"
      />
    </View>
  );
}

const styles = (isDark, TEAL, TEAL_LIGHT, TEAL_DARK) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#000" : "#F5F5F5" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? "#1C1C1E" : "#FFF",
      borderBottomWidth: 0.5,
      borderBottomColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: isDark ? "#FFF" : "#000",
    },
    content: { padding: 16, gap: 12 },

    card: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFF",
      borderRadius: 14,
      padding: 16,
      gap: 4,
    },
    swipeDeleteBtn: {
      backgroundColor: isDark ? "#FF453A" : "#FF3B30",
      justifyContent: "center",
      alignItems: "center",
      width: 76,
      borderRadius: 14,
      marginLeft: 8,
    },
    swipeDeleteText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
      marginTop: 4,
    },
    cardSelectable: {
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    labelText: { fontSize: 13, fontWeight: "600", color: TEAL },
    defaultBadge: {
      backgroundColor: TEAL_LIGHT,
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    defaultText: { fontSize: 11, fontWeight: "600", color: TEAL_DARK },
    addrName: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#FFF" : "#000",
    },
    addrLine: {
      fontSize: 13,
      color: isDark ? "#AEAEB2" : "#6E6E73",
      lineHeight: 18,
    },
    addrPhone: {
      fontSize: 13,
      color: isDark ? "#AEAEB2" : "#6E6E73",
      marginTop: 2,
    },
    setDefaultBtn: { marginTop: 10 },
    setDefaultText: { fontSize: 13, fontWeight: "600", color: TEAL },
    selectIndicator: { position: "absolute", right: 16, top: "50%" },

    emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: isDark ? "#FFF" : "#000",
    },
    emptySubtitle: { fontSize: 14, color: isDark ? "#8E8E93" : "#6E6E73" },
    emptyBtn: {
      marginTop: 8,
      backgroundColor: TEAL,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    emptyBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },

    // Modal
    modalSafe: { flex: 1, backgroundColor: isDark ? "#000" : "#F5F5F5" },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: isDark ? "#1C1C1E" : "#FFF",
      borderBottomWidth: 0.5,
      borderBottomColor: isDark ? "#3A3A3C" : "#E5E5E5",
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: isDark ? "#FFF" : "#000",
    },
    modalCancel: { fontSize: 16, color: isDark ? "#8E8E93" : "#6E6E73" },
    modalSave: { fontSize: 16, fontWeight: "600", color: TEAL },
    formContent: { padding: 16, gap: 4 },

    fieldGroup: { marginBottom: 16 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#8E8E93" : "#6E6E73",
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    fieldInput: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFF",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? "#3A3A3C" : "#E5E5E5",
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: isDark ? "#FFF" : "#000",
    },
    fieldInputMulti: { minHeight: 80, textAlignVertical: "top" },

    defaultToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 8,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: isDark ? "#555" : "#CCC",
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxActive: { backgroundColor: TEAL, borderColor: TEAL },
    defaultToggleText: { fontSize: 14, color: isDark ? "#FFF" : "#000" },
  });
