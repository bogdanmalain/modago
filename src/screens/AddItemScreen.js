// src/screens/AddItemScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { supabase } from "../supabaseClient";
import { createItem } from "../services/itemsService";
import { ROUTES } from "../navigation/routes";

const STORAGE_BUCKET = "items";
const MAX_IMAGES = 6;

function makeFilePath(userId) {
  const rand = Math.random().toString(36).slice(2);
  const ts = Date.now();
  return `${userId}/${ts}_${rand}.jpg`; // ✅ mereu jpg (după conversie)
}

function base64ToUint8Array(base64) {
  const binary = global.atob ? global.atob(base64) : atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * ✅ CHEIA:
 * Pe MOBILE convertim MEREU în JPEG real.
 * Așa eliminăm complet problema: URI fără extensie / HEIC mascat / etc.
 */
async function normalizeToJpegMobile(uri) {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  if (!result?.uri) {
    throw new Error("Nu am putut converti poza în JPEG.");
  }
  return result.uri;
}

async function uploadImageToSupabase({ uri, userId }) {
  if (!uri) throw new Error("Lipsește uri pentru upload.");
  if (!userId) throw new Error("Lipsește userId pentru upload.");

  const path = makeFilePath(userId);

  // ✅ WEB: blob direct (ok)
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

  // ✅ MOBILE: convertim întotdeauna la JPEG real
  const jpegUri = await normalizeToJpegMobile(uri);

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  const [localImages, setLocalImages] = useState([]); // [{ uri }]
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
      const next = assets.map((a) => ({ uri: a?.uri })).filter((x) => !!x.uri);

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

      // 1) upload poze -> publicUrls
      const urls = [];
      for (const img of localImages) {
        const url = await uploadImageToSupabase({ uri: img.uri, userId });
        urls.push(url);
      }

      // 2) insert item
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: normalizedPrice,
        category: category.trim(),
        images: urls,
        user_id: userId,
      };

      await createItem(payload);

      Alert.alert("Publicat", "Produsul a fost publicat cu succes.");
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setLocalImages([]);

      navigation.navigate(ROUTES.Home);
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
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Adaugă un produs</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Titlu"
        style={styles.input}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Descriere"
        style={[styles.input, styles.textarea]}
        multiline
      />
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Preț (ex: 120)"
        style={styles.input}
        keyboardType="numeric"
      />
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Categorie (ex: Femei)"
        style={styles.input}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={pickImages}
        style={styles.pickBtn}
        disabled={loading}
      >
        <Text style={styles.pickText}>
          Alege imagini ({localImages.length}/{MAX_IMAGES})
        </Text>
      </TouchableOpacity>

      {localImages.length > 0 && (
        <View style={styles.imagesRow}>
          {localImages.map((img, idx) => (
            <View key={`${img.uri}-${idx}`} style={styles.thumbWrap}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <TouchableOpacity
                onPress={() => removeImage(idx)}
                style={styles.removeBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!!errorMsg && <Text style={styles.err}>{errorMsg}</Text>}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={publish}
        style={[styles.pubBtn, loading && { opacity: 0.7 }]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.pubText}>Publică produsul</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingTop: 26, backgroundColor: "#fff" },
  h1: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 16,
    color: "#111",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  textarea: { minHeight: 110, textAlignVertical: "top" },
  pickBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#dbe3ff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  pickText: { fontWeight: "900", fontSize: 16, color: "#2b4cff" },
  imagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#eee",
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
  removeText: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: -1 },
  err: { marginTop: 10, color: "#ef4444", fontWeight: "900", fontSize: 14 },
  pubBtn: {
    marginTop: 14,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#0B69FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pubText: { color: "#fff", fontWeight: "900", fontSize: 18 },
});
