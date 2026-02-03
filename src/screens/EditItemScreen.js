// src/screens/EditItemScreen.js (iOS / Android)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { updateItem, deleteItemById } from "../services/itemsService";

const STORAGE_BUCKET = "items"; // ✅ bucket-ul tău real
const MAX_IMAGES = 6;

function getExt(uri = "") {
  const clean = String(uri).split("?")[0];
  const dot = clean.lastIndexOf(".");
  if (dot === -1) return "jpg";
  return clean.slice(dot + 1).toLowerCase();
}

function guessContentType(ext) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  // după conversie nu mai urcăm heic/heif, dar păstrăm fallback:
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

function makeFilePath(userId, ext) {
  const rand = Math.random().toString(36).slice(2);
  const ts = Date.now();
  return `${userId}/${ts}_${rand}.${ext}`;
}

// base64 -> Uint8Array (safe pentru supabase upload pe mobile)
function base64ToUint8Array(base64) {
  const binary = global.atob ? global.atob(base64) : atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ✅ Convert HEIC/HEIF -> JPG (ca să fie afișabil sigur)
async function ensureJpegIfHeic(uri) {
  const ext = getExt(uri);
  if (ext !== "heic" && ext !== "heif") return { uri, ext };

  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return { uri: result.uri, ext: "jpg" };
}

async function uploadImageToSupabase({ uri, userId }) {
  if (!uri) throw new Error("Lipsește uri pentru upload.");
  if (!userId) throw new Error("Lipsește userId pentru upload.");

  // ✅ normalize (HEIC->JPG)
  const normalized = await ensureJpegIfHeic(uri);

  const ext = normalized.ext;
  const contentType = guessContentType(ext);
  const path = makeFilePath(userId, ext);

  // ✅ WEB: blob merge
  if (Platform.OS === "web") {
    const res = await fetch(normalized.uri);
    if (!res.ok) throw new Error("Nu pot citi poza (fetch a eșuat).");

    const blob = await res.blob();

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType, upsert: false });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl || "";
    if (!publicUrl) throw new Error("Nu am primit publicUrl pentru poză.");
    return publicUrl;
  }

  // ✅ MOBILE: FileSystem base64 -> Uint8Array (identic cu AddItem)
  const info = await FileSystem.getInfoAsync(normalized.uri);
  if (!info?.exists) {
    throw new Error("Fișierul nu există pe device (getInfoAsync).");
  }

  const base64 = await FileSystem.readAsStringAsync(normalized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!base64) {
    throw new Error("Nu pot citi poza (base64 gol).");
  }

  const bytes = base64ToUint8Array(base64);

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl || "";
  if (!publicUrl) throw new Error("Nu am primit publicUrl pentru poză.");
  return publicUrl;
}

export default function EditItemScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const passedItem = route?.params?.item || null;

  const [session, setSession] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState(passedItem?.title || "");
  const [description, setDescription] = useState(passedItem?.description || "");
  const [price, setPrice] = useState(
    passedItem?.price !== undefined && passedItem?.price !== null
      ? String(passedItem.price)
      : "",
  );
  const [category, setCategory] = useState(passedItem?.category || "");
  const [images, setImages] = useState(() => {
    const arr = passedItem?.images || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  });

  const itemId = useMemo(
    () => (passedItem?.id ? String(passedItem.id) : null),
    [passedItem],
  );
  const userId = session?.user?.id || null;

  useEffect(() => {
    let sub;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);

      const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
        setSession(sess ?? null);
      });

      sub = listener?.subscription;
    })();

    return () => sub?.unsubscribe?.();
  }, []);

  const goBackSafe = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate(ROUTES.Home);
  }, [navigation]);

  const askMediaPermission = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm?.granted) {
      Alert.alert("Permisiune necesară", "Trebuie să permiți accesul la poze.");
      return false;
    }
    return true;
  }, []);

  const pickAndAddImages = useCallback(async () => {
    if (uploading) return;

    const ok = await askMediaPermission();
    if (!ok) return;

    if (!userId) {
      Alert.alert("Login", "Trebuie să fii logat ca să adaugi poze.");
      navigation.navigate(ROUTES.Login);
      return;
    }

    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limită poze", `Poți pune maxim ${MAX_IMAGES} poze.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.85,
    });

    if (result.canceled) return;

    const assets = Array.isArray(result.assets) ? result.assets : [];
    if (assets.length === 0) return;

    setUploading(true);
    try {
      const newUrls = [];
      for (const a of assets) {
        if (!a?.uri) continue;

        const url = await uploadImageToSupabase({ uri: a.uri, userId });
        newUrls.push(url);
      }

      if (newUrls.length > 0) {
        setImages((prev) => [...prev, ...newUrls].slice(0, MAX_IMAGES));
      }
    } catch (e) {
      console.log("❌ upload error:", e);
      Alert.alert("Eroare upload", e?.message || "Nu am putut urca poza.");
    } finally {
      setUploading(false);
    }
  }, [askMediaPermission, uploading, images.length, navigation, userId]);

  const moveUp = useCallback((idx) => {
    setImages((prev) => {
      if (idx <= 0) return prev;
      const copy = [...prev];
      const t = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = t;
      return copy;
    });
  }, []);

  const moveDown = useCallback((idx) => {
    setImages((prev) => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const t = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = t;
      return copy;
    });
  }, []);

  const removeAt = useCallback((idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const onSave = useCallback(async () => {
    if (!itemId) {
      Alert.alert("Eroare", "Nu am itemId.");
      return;
    }

    const t = String(title || "").trim();
    if (!t) {
      Alert.alert("Titlu", "Scrie un titlu.");
      return;
    }

    const p = String(price || "").trim();
    const priceNum = p === "" ? null : Number(p);
    if (p !== "" && Number.isNaN(priceNum)) {
      Alert.alert("Preț", "Prețul trebuie să fie număr.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: t,
        description: String(description || ""),
        price: priceNum,
        category: String(category || ""),
        images: images, // ✅ array de URL-uri
      };

      await updateItem(itemId, payload);

      Alert.alert("Salvat", "Anunțul a fost actualizat.");
      goBackSafe();
    } catch (e) {
      console.log("❌ updateItem error:", e);
      Alert.alert("Eroare", e?.message || "Nu am putut salva.");
    } finally {
      setSaving(false);
    }
  }, [itemId, title, description, price, category, images, goBackSafe]);

  const onDeleteItem = useCallback(() => {
    if (!itemId) return;

    Alert.alert("Șterge anunțul?", "Sigur vrei să-l ștergi?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await deleteItemById(itemId);
            Alert.alert("Șters", "Anunțul a fost șters.");
            goBackSafe();
          } catch (e) {
            console.log("❌ deleteItem error:", e);
            Alert.alert("Eroare", e?.message || "Nu am putut șterge anunțul.");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [itemId, goBackSafe]);

  if (!passedItem) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={goBackSafe}
          style={[styles.backBtn, { top: insets.top + 10 }]}
          hitSlop={12}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <View style={styles.center}>
          <Text style={styles.h1}>Nu am primit anunțul.</Text>
          <Text style={styles.muted}>Întoarce-te și deschide din listă.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={goBackSafe}
        style={[styles.backBtn, { top: insets.top + 10 }]}
        hitSlop={12}
      >
        <Text style={styles.backText}>←</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titlu"
          placeholderTextColor="#9aa4b2"
          style={styles.input}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descriere"
          placeholderTextColor="#9aa4b2"
          style={[styles.input, styles.textArea]}
          multiline
        />

        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="Preț"
          placeholderTextColor="#9aa4b2"
          style={styles.input}
          keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
        />

        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Categorie"
          placeholderTextColor="#9aa4b2"
          style={styles.input}
        />

        <TouchableOpacity
          onPress={pickAndAddImages}
          activeOpacity={0.9}
          style={[styles.addPhotosBtn, uploading && { opacity: 0.7 }]}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.addPhotosText}>
              Adaugă poze ({images.length}/{MAX_IMAGES})
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.grid}>
          {images.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.tile}>
              <Image
                source={{ uri }}
                style={styles.tileImg}
                resizeMode="cover"
              />

              <View style={styles.tileActions}>
                <TouchableOpacity
                  onPress={() => moveUp(idx)}
                  style={[styles.actionBtn, idx === 0 && styles.actionDisabled]}
                  disabled={idx === 0}
                  activeOpacity={0.9}
                >
                  <Text style={styles.actionText}>↑</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => moveDown(idx)}
                  style={[
                    styles.actionBtn,
                    idx === images.length - 1 && styles.actionDisabled,
                  ]}
                  disabled={idx === images.length - 1}
                  activeOpacity={0.9}
                >
                  <Text style={styles.actionText}>↓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => removeAt(idx)}
                  style={[styles.actionBtn, styles.actionDelete]}
                  activeOpacity={0.9}
                >
                  <Text style={styles.actionText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={onSave}
          activeOpacity={0.9}
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Salvează</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDeleteItem}
          activeOpacity={0.9}
          style={[styles.deleteBtn, saving && { opacity: 0.7 }]}
          disabled={saving}
        >
          <Text style={styles.deleteText}>Șterge anunțul</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  backBtn: {
    position: "absolute",
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 10,
  },
  backText: { fontSize: 22, fontWeight: "900", color: "#111" },

  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: "top",
  },

  addPhotosBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  addPhotosText: { fontSize: 18, fontWeight: "900", color: "#1D4ED8" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  tile: {
    width: "31%",
    minWidth: 110,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "#f3f4f6",
  },
  tileImg: { width: "100%", height: 120, backgroundColor: "#e5e7eb" },

  tileActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    gap: 8,
    backgroundColor: "#eef2f7",
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: { opacity: 0.35 },
  actionDelete: { backgroundColor: "#7f1d1d" },
  actionText: { color: "#fff", fontSize: 18, fontWeight: "900" },

  primaryBtn: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#0B69FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 20 },

  deleteBtn: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#7f1d1d",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  deleteText: { color: "#fff", fontWeight: "900", fontSize: 18 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  h1: { fontSize: 18, fontWeight: "900", color: "#111" },
  muted: {
    marginTop: 8,
    color: "#6b7280",
    fontWeight: "700",
    textAlign: "center",
  },
});
