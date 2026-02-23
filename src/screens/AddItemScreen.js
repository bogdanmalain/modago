// src/screens/AddItemScreen.js
// ============================================
// MODIFICARE:
// - După publicare: trimitem către Home createdItem + createdAt (trigger)
//   ca Home să insereze local anunțul nou (fără logout/login).
// - Dacă avem doar ID: trimitem createdItemId + createdAt (trigger).
// NU se modifică:
// - JPEG real pe mobile, max 1600px long side, theme-aware tokens.
// ============================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { createItem } from "../services/itemsService";
import { ROUTES } from "../navigation/routes";
import { ThemeContext } from "../theme/ThemeProvider";

const STORAGE_BUCKET = "items";
const MAX_IMAGES = 6;

const MAX_LONG_SIDE = 1600;
const JPEG_QUALITY = 0.85;

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function makeFilePath(userId) {
  const rand = Math.random().toString(36).slice(2);
  const ts = Date.now();
  return `${userId}/${ts}_${rand}.jpg`;
}

function base64ToUint8Array(base64) {
  const binary = global.atob ? global.atob(base64) : atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function normalizeToJpegMobile(uri, meta) {
  const w = Number(meta?.width) || null;
  const h = Number(meta?.height) || null;

  const actions = [];

  if (w && h) {
    const longSide = Math.max(w, h);
    if (longSide > MAX_LONG_SIDE) {
      if (w >= h) actions.push({ resize: { width: MAX_LONG_SIDE } });
      else actions.push({ resize: { height: MAX_LONG_SIDE } });
    }
  } else {
    actions.push({ resize: { width: MAX_LONG_SIDE } });
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  if (!result?.uri) {
    throw new Error("Nu am putut normaliza poza (JPEG/resize).");
  }
  return result.uri;
}

async function uploadImageToSupabase({ uri, userId, meta }) {
  if (!uri) throw new Error("Lipsește uri pentru upload.");
  if (!userId) throw new Error("Lipsește userId pentru upload.");

  const path = makeFilePath(userId);

  if (Platform.OS === "web") {
    const res = await fetch(uri);
    if (!res.ok) throw new Error("Nu pot citi poza (fetch a eșuat).");
    const blob = await res.blob();

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl || "";
    if (!publicUrl) throw new Error("Nu am primit publicUrl pentru poză.");
    return publicUrl;
  }

  const jpegUri = await normalizeToJpegMobile(uri, meta);

  const info = await FileSystem.getInfoAsync(jpegUri);
  if (!info?.exists) throw new Error("Fișierul JPEG nu există pe device.");

  const base64 = await FileSystem.readAsStringAsync(jpegUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64) throw new Error("Nu pot citi poza (base64 gol).");

  const bytes = base64ToUint8Array(base64);

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl || "";
  if (!publicUrl) throw new Error("Nu am primit publicUrl pentru poză.");
  return publicUrl;
}

export default function AddItemScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);
  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  const [localImages, setLocalImages] = useState([]); // [{ uri, width?, height? }]
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canPickMore = localImages.length < MAX_IMAGES;

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") console.log("Media permissions not granted.");
    })();
  }, []);

  const pickImages = useCallback(async () => {
    setErrorMsg("");

    if (!canPickMore) {
      Alert.alert("Limită poze", `Maxim ${MAX_IMAGES} poze.`);
      return;
    }

    try {
      const remaining = MAX_IMAGES - localImages.length;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });

      if (result.canceled) return;

      const assets = Array.isArray(result.assets) ? result.assets : [];
      const next = assets
        .map((a) => ({
          uri: a?.uri,
          width: a?.width,
          height: a?.height,
        }))
        .filter((x) => !!x.uri);

      setLocalImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
    } catch (e) {
      Alert.alert("Eroare", e?.message || "Nu pot alege imagini.");
    }
  }, [canPickMore, localImages.length]);

  const removeImage = useCallback((idx) => {
    setLocalImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const normalizedPrice = useMemo(() => {
    const s = String(price || "")
      .trim()
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }, [price]);

  const publish = useCallback(async () => {
    setErrorMsg("");

    if (!title.trim()) return setErrorMsg("Titlul e obligatoriu.");
    if (!description.trim()) return setErrorMsg("Descrierea e obligatorie.");
    if (normalizedPrice == null) return setErrorMsg("Preț invalid.");
    if (!category.trim()) return setErrorMsg("Categoria e obligatorie.");
    if (localImages.length === 0) return setErrorMsg("Alege cel puțin o poză.");

    try {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id;

      if (!userId) {
        Alert.alert(
          "Login necesar",
          "Trebuie să fii autentificat ca să publici.",
        );
        navigation.navigate(ROUTES.Login);
        return;
      }

      const urls = [];
      for (const img of localImages) {
        const url = await uploadImageToSupabase({
          uri: img.uri,
          userId,
          meta: img,
        });
        urls.push(url);
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: normalizedPrice,
        category: category.trim(),
        images: urls,
        user_id: userId,
      };

      const created = await createItem(payload);

      Alert.alert("Publicat", "Produsul a fost publicat cu succes.");

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setLocalImages([]);

      const createdRow =
        created && typeof created === "object" ? created : null;
      const createdId = createdRow?.id != null ? String(createdRow.id) : null;

      const createdAt = Date.now(); // ✅ trigger pentru Home

      if (createdRow?.id) {
        navigation.navigate(ROUTES.Home, {
          createdItem: createdRow,
          createdAt,
        });
      } else if (createdId) {
        navigation.navigate(ROUTES.Home, {
          createdItemId: createdId,
          createdAt,
        });
      } else {
        navigation.navigate(ROUTES.Home, { createdAt });
      }
    } catch (e) {
      console.log("❌ publish error:", e);
      const msg = e?.message || "Eroare la publicare.";
      setErrorMsg(msg);
      Alert.alert("Eroare", msg);
    } finally {
      setLoading(false);
    }
  }, [title, description, normalizedPrice, category, localImages, navigation]);

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={[
        S.page,
        {
          paddingTop: Math.max(insets.top, 12) + 16,
          paddingBottom: Math.max(insets.bottom, 16) + 18,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={S.h1}>Adaugă un produs</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Titlu"
        placeholderTextColor={S.placeholder.color}
        style={S.input}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Descriere"
        placeholderTextColor={S.placeholder.color}
        style={[S.input, S.textarea]}
        multiline
      />
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Preț (ex: 120)"
        placeholderTextColor={S.placeholder.color}
        style={S.input}
        keyboardType="numeric"
      />
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Categorie (ex: Femei)"
        placeholderTextColor={S.placeholder.color}
        style={S.input}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={pickImages}
        style={S.pickBtn}
        disabled={loading}
      >
        <Text style={S.pickText}>
          Alege imagini ({localImages.length}/{MAX_IMAGES})
        </Text>
      </TouchableOpacity>

      {localImages.length > 0 && (
        <View style={S.imagesRow}>
          {localImages.map((img, idx) => (
            <View key={`${img.uri}-${idx}`} style={S.thumbWrap}>
              <Image source={{ uri: img.uri }} style={S.thumb} />
              <TouchableOpacity
                onPress={() => removeImage(idx)}
                style={S.removeBtn}
                activeOpacity={0.85}
              >
                <Text style={S.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!!errorMsg && <Text style={S.err}>{errorMsg}</Text>}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={publish}
        style={[S.pubBtn, loading && { opacity: 0.7 }]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={S.onPrimary.color} />
        ) : (
          <Text style={S.pubText}>Publică produsul</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 6 }} />
    </ScrollView>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.12)");
  const primary = pickTok(
    tokens,
    "primary",
    pickTok(tokens, "accent", "#2563EB"),
  );
  const primarySoft = pickTok(tokens, "primarySoft", "rgba(37,99,235,0.10)");
  const danger = pickTok(tokens, "danger", "#EF4444");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },
    page: { flexGrow: 1, paddingHorizontal: 16, backgroundColor: bg },

    h1: {
      fontSize: 28,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 16,
      color: text,
    },

    placeholder: { color: muted },

    input: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontWeight: "700",
      backgroundColor: card,
      color: text,
      marginBottom: 12,
    },

    textarea: { minHeight: 110, textAlignVertical: "top" },

    pickBtn: {
      height: 52,
      borderRadius: 14,
      backgroundColor: primarySoft,
      borderWidth: 1,
      borderColor: border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },

    pickText: { fontWeight: "900", fontSize: 16, color: primary },

    imagesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
    },

    thumbWrap: {
      width: 92,
      height: 92,
      borderRadius: 14,
      overflow: "hidden",
      position: "relative",
      backgroundColor: "rgba(0,0,0,0.06)",
      borderWidth: 1,
      borderColor: border,
    },

    thumb: { width: "100%", height: "100%" },

    removeBtn: {
      position: "absolute",
      right: 6,
      top: 6,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },

    removeText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "900",
      marginTop: -1,
    },

    err: { marginTop: 10, color: danger, fontWeight: "900", fontSize: 14 },

    pubBtn: {
      marginTop: 14,
      height: 56,
      borderRadius: 14,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },

    onPrimary: { color: onPrimary },
    pubText: { color: onPrimary, fontWeight: "900", fontSize: 18 },
  });
}
