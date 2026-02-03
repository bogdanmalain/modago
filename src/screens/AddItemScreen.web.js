// src/screens/AddItemScreen.web.js
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { supabase } from "../supabaseClient";
import { createItem } from "../services/itemsService";
import { ROUTES } from "../navigation/routes";

const STORAGE_BUCKET = "items";
const MAX_IMAGES = 6;

function guessExtFromNameOrType(file) {
  const name = String(file?.name || "");
  const type = String(file?.type || "").toLowerCase();

  const fromName = name.includes(".") ? name.split(".").pop() : "";
  const ext = String(fromName || "").toLowerCase();

  if (ext === "png" || ext === "webp" || ext === "jpg" || ext === "jpeg") {
    return ext === "jpeg" ? "jpg" : ext;
  }

  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

function guessContentType(file, ext) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) return type;

  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function makeFilePath(userId, ext) {
  const rand = Math.random().toString(36).slice(2);
  const ts = Date.now();
  return `${userId}/${ts}_${rand}.${ext}`;
}

export default function AddItemScreenWeb({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  // pe web ținem direct public URLs
  const [images, setImages] = useState([]); // string[]
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const normalizedPrice = useMemo(() => {
    const s = String(price || "")
      .trim()
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }, [price]);

  const openFilePicker = useCallback(() => {
    if (saving || uploading) return;

    const remain = MAX_IMAGES - images.length;
    if (remain <= 0) {
      Alert.alert("Limită atinsă", `Poți avea maxim ${MAX_IMAGES} imagini.`);
      return;
    }

    try {
      // reset value înainte de click ca să permită re-select aceeași poză
      if (fileInputRef.current) fileInputRef.current.value = "";
      fileInputRef.current?.click?.();
    } catch (e) {
      console.log("openFilePicker error:", e);
    }
  }, [saving, uploading, images.length]);

  const uploadFilesWeb = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      const remain = MAX_IMAGES - images.length;
      const picked = Array.from(files).slice(0, Math.max(0, remain));
      if (picked.length === 0) {
        Alert.alert("Limită atinsă", `Poți avea maxim ${MAX_IMAGES} imagini.`);
        return;
      }

      setUploading(true);
      setErrorMsg("");

      try {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess?.session?.user?.id;

        if (!userId) {
          Alert.alert(
            "Login necesar",
            "Trebuie să fii autentificat ca să adaugi poze.",
          );
          navigation.navigate(ROUTES.Login);
          return;
        }

        const uploadedUrls = [];

        for (let i = 0; i < picked.length; i++) {
          const file = picked[i];

          const ab = await file.arrayBuffer();
          const bytes = new Uint8Array(ab);

          if (!bytes || bytes.length === 0) {
            throw new Error("O imagine are 0 bytes (nu s-a putut citi).");
          }

          const ext = guessExtFromNameOrType(file);
          const contentType = guessContentType(file, ext);
          const path = makeFilePath(userId, ext);

          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, bytes, { contentType, upsert: false });

          if (upErr) throw upErr;

          const { data } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          if (data?.publicUrl) uploadedUrls.push(data.publicUrl);
        }

        if (uploadedUrls.length > 0) {
          setImages((prev) => [...prev, ...uploadedUrls].slice(0, MAX_IMAGES));
        }
      } catch (e) {
        console.error("AddItem WEB upload error:", e);
        Alert.alert("Eroare", e?.message || "Nu am putut încărca pozele.");
      } finally {
        setUploading(false);
      }
    },
    [images.length, navigation],
  );

  const onFileInputChange = useCallback(
    async (e) => {
      const files = e?.target?.files;
      // remount input (rezolvă cazuri când browserul nu mai declanșează onChange)
      setFileInputKey((k) => k + 1);
      await uploadFilesWeb(files);
    },
    [uploadFilesWeb],
  );

  const deleteImage = useCallback((idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const moveImage = useCallback((from, to) => {
    setImages((prev) => {
      if (from < 0 || from >= prev.length) return prev;
      if (to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [picked] = next.splice(from, 1);
      next.splice(to, 0, picked);
      return next;
    });
  }, []);

  const publish = useCallback(async () => {
    setErrorMsg("");

    if (!title.trim()) return setErrorMsg("Titlul e obligatoriu.");
    if (!description.trim()) return setErrorMsg("Descrierea e obligatorie.");
    if (normalizedPrice == null) return setErrorMsg("Preț invalid.");
    if (!category.trim()) return setErrorMsg("Categoria e obligatorie.");
    if (images.length === 0) return setErrorMsg("Alege cel puțin o poză.");
    if (uploading)
      return setErrorMsg("Așteaptă să se termine încărcarea pozelor.");

    try {
      setSaving(true);

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

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: normalizedPrice,
        category: category.trim(),
        images,
        user_id: userId,
      };

      await createItem(payload);

      Alert.alert("Publicat", "Produsul a fost publicat cu succes.");

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImages([]);

      navigation.navigate(ROUTES.Home);
    } catch (e) {
      console.log("❌ publish error:", e);
      const msg = e?.message || "Eroare la publicare.";
      setErrorMsg(msg);
      Alert.alert("Eroare", msg);
    } finally {
      setSaving(false);
    }
  }, [
    title,
    description,
    normalizedPrice,
    category,
    images,
    uploading,
    navigation,
  ]);

  return (
    <View style={styles.page}>
      {/* Hidden file input (WEB) */}
      {Platform.OS === "web" ? (
        <input
          key={fileInputKey}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFileInputChange}
          style={{ display: "none" }}
        />
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.container80}>
          <Text style={styles.h1}>Adaugă un produs</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Titlu</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titlu"
              placeholderTextColor="rgba(17,17,17,0.45)"
              style={styles.input}
            />

            <Text style={styles.label}>Descriere</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Descriere"
              placeholderTextColor="rgba(17,17,17,0.45)"
              style={[styles.input, styles.textarea]}
              multiline
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Preț</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="ex: 120"
                  placeholderTextColor="rgba(17,17,17,0.45)"
                  style={styles.input}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Categorie</Text>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="ex: Femei"
                  placeholderTextColor="rgba(17,17,17,0.45)"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.imagesHeaderRow}>
              <View style={{ gap: 6 }}>
                <Text style={styles.h2}>Imagini</Text>
                <Text style={styles.smallNote}>
                  Poți adăuga până la {MAX_IMAGES}. Reordonează cu ◀ ▶ sau
                  șterge.
                </Text>
              </View>

              <Pressable
                style={[
                  styles.addPhotosBtn,
                  (saving || uploading || images.length >= MAX_IMAGES) &&
                    styles.addPhotosBtnDisabled,
                ]}
                onPress={openFilePicker}
                disabled={saving || uploading || images.length >= MAX_IMAGES}
              >
                <Text style={styles.addPhotosBtnText}>
                  {uploading
                    ? "Se încarcă…"
                    : `Adaugă poze (${images.length}/${MAX_IMAGES})`}
                </Text>
              </Pressable>
            </View>

            {images.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Nu ai imagini încă. Apasă „Adaugă poze”.
                </Text>
              </View>
            ) : (
              <View style={styles.imagesList}>
                {images.map((uri, idx) => (
                  <View key={`${uri}-${idx}`} style={styles.imageRow}>
                    <Image
                      source={{ uri }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />

                    <View style={styles.imageRowInfo}>
                      <Text style={styles.imageIndex}>#{idx + 1}</Text>
                      <Text style={styles.imageUrl} numberOfLines={1}>
                        {uri}
                      </Text>

                      <View style={styles.imageActions}>
                        <Pressable
                          onPress={() => moveImage(idx, idx - 1)}
                          disabled={idx === 0 || saving || uploading}
                          style={({ hovered }) => [
                            styles.iconBtn,
                            hovered && styles.iconBtnHover,
                            (idx === 0 || saving || uploading) &&
                              styles.iconBtnDisabled,
                          ]}
                        >
                          <Text style={styles.iconBtnText}>◀</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => moveImage(idx, idx + 1)}
                          disabled={
                            idx === images.length - 1 || saving || uploading
                          }
                          style={({ hovered }) => [
                            styles.iconBtn,
                            hovered && styles.iconBtnHover,
                            (idx === images.length - 1 ||
                              saving ||
                              uploading) &&
                              styles.iconBtnDisabled,
                          ]}
                        >
                          <Text style={styles.iconBtnText}>▶</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => deleteImage(idx)}
                          disabled={saving || uploading}
                          style={({ hovered }) => [
                            styles.dangerBtn,
                            hovered && styles.dangerBtnHover,
                            (saving || uploading) && styles.iconBtnDisabled,
                          ]}
                        >
                          <Text style={styles.dangerBtnText}>Șterge</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {!!errorMsg && <Text style={styles.err}>{errorMsg}</Text>}

          <Pressable
            onPress={publish}
            disabled={saving || uploading}
            style={[styles.pubBtn, (saving || uploading) && { opacity: 0.7 }]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.pubText}>Publică produsul</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fb" },

  container80: {
    width: "80%",
    maxWidth: 1240,
    alignSelf: "center",
    paddingTop: 18,
  },

  h1: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    marginVertical: 18,
    color: "#111",
  },

  h2: { color: "#111", fontSize: 16, fontWeight: "900" },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },

  label: {
    color: "rgba(17,17,17,0.6)",
    fontSize: 12,
    marginBottom: 6,
    marginTop: 10,
    fontWeight: "800",
  },

  input: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    color: "#111",
    fontWeight: "700",
    outlineStyle: "none",
  },

  textarea: { height: 120, paddingTop: 12, textAlignVertical: "top" },

  row2: { flexDirection: "row", gap: 12 },

  imagesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  smallNote: { color: "rgba(17,17,17,0.6)", fontSize: 12, fontWeight: "700" },

  addPhotosBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#dbe3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotosBtnDisabled: { opacity: 0.55 },
  addPhotosBtnText: { fontWeight: "900", color: "#2b4cff", fontSize: 13 },

  emptyBox: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    backgroundColor: "#fff",
  },
  emptyText: { color: "rgba(17,17,17,0.7)", fontWeight: "700" },

  imagesList: { gap: 10 },

  imageRow: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    backgroundColor: "#fff",
    alignItems: "center",
  },

  thumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: "#eee",
  },

  imageRowInfo: { flex: 1, gap: 6 },
  imageIndex: { color: "#111", fontSize: 12, fontWeight: "900" },
  imageUrl: { color: "rgba(17,17,17,0.6)", fontSize: 12, maxWidth: "100%" },

  imageActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    alignItems: "center",
  },

  iconBtn: {
    width: 42,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    alignItems: "center",
    justifyContent: "center",
    transitionDuration: "150ms",
  },
  iconBtnHover: {
    borderColor: "rgba(17,17,17,0.22)",
    transform: [{ translateY: -1 }],
  },
  iconBtnDisabled: { opacity: 0.45 },
  iconBtnText: { color: "#111", fontSize: 14, fontWeight: "900" },

  dangerBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,59,48,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    transitionDuration: "150ms",
  },
  dangerBtnHover: {
    backgroundColor: "rgba(255,59,48,0.14)",
    borderColor: "rgba(255,59,48,0.35)",
  },
  dangerBtnText: { color: "#b00020", fontWeight: "900" },

  err: {
    marginTop: 10,
    color: "#ef4444",
    fontWeight: "900",
    fontSize: 14,
  },

  pubBtn: {
    marginTop: 10,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#0B69FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pubText: { color: "#fff", fontWeight: "900", fontSize: 18 },
});
