// src/screens/EditItemScreen.web.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

export default function EditItemScreenWeb() {
  const route = useRoute();
  const navigation = useNavigation();

  const itemId =
    route?.params?.itemId ||
    route?.params?.id ||
    route?.params?.item?.id ||
    null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sessionUserId, setSessionUserId] = useState(null);
  const [item, setItem] = useState(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // Images (public urls)
  const [images, setImages] = useState([]);

  // Upload state (web)
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ✅ IMPORTANT: forțează remount la <input type="file"> ca să fireze onChange
  // chiar și când alegi aceeași poză de mai multe ori (bug/behavior comun pe web)
  const [fileInputKey, setFileInputKey] = useState(0);

  const maxImages = 6;

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || null;
      if (mounted) setSessionUserId(uid);

      if (!itemId) {
        if (mounted) {
          setItem(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (!mounted) return;

      if (error) {
        console.error("EditItem WEB fetch error:", error);
        setItem(null);
        setLoading(false);
        return;
      }

      setItem(data || null);

      setTitle(data?.title || "");
      setPrice(data?.price != null ? String(data.price) : "");
      setDescription(data?.description || "");
      setCategory(data?.category || "");

      const arr =
        data?.images ||
        data?.image_urls ||
        data?.photos ||
        data?.pictures ||
        [];
      const normalized = (Array.isArray(arr) ? arr : [])
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .filter((u) => !u.startsWith("blob:"));

      setImages(normalized);

      setLoading(false);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [itemId]);

  const ownerId = useMemo(
    () => item?.user_id || item?.owner_id || null,
    [item],
  );

  const isOwner = useMemo(
    () => Boolean(sessionUserId && ownerId && sessionUserId === ownerId),
    [sessionUserId, ownerId],
  );

  const canRenderEditor = useMemo(
    () => Boolean(item && isOwner),
    [item, isOwner],
  );

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

  const deleteImage = useCallback((index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const validate = useCallback(() => {
    const t = title.trim();
    if (!t) return "Titlul este obligatoriu.";
    const p = price.trim();
    if (!p) return "Prețul este obligatoriu.";
    const parsed = Number(p.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return "Preț invalid.";
    return null;
  }, [title, price]);

  const handleSave = useCallback(async () => {
    if (!itemId) return;

    if (uploading) {
      Alert.alert(
        "Așteaptă puțin",
        "Se încarcă pozele. Încearcă din nou după.",
      );
      return;
    }

    const errMsg = validate();
    if (errMsg) {
      Alert.alert("Eroare", errMsg);
      return;
    }

    setSaving(true);

    try {
      const parsedPrice = Number(price.trim().replace(",", "."));

      const hasImagesColumn = Object.prototype.hasOwnProperty.call(
        item || {},
        "images",
      );
      const hasImageUrlsColumn = Object.prototype.hasOwnProperty.call(
        item || {},
        "image_urls",
      );

      const payload = {
        title: title.trim(),
        price: parsedPrice,
        description: description.trim(),
        category: category.trim(),
      };

      if (hasImagesColumn) payload.images = images;
      else if (hasImageUrlsColumn) payload.image_urls = images;
      else payload.images = images;

      const { data, error } = await supabase
        .from("items")
        .update(payload)
        .eq("id", itemId)
        .select("*")
        .single();

      if (error) {
        console.error("EditItem WEB update error:", error);
        Alert.alert(
          "Eroare",
          error.message || "Nu am putut salva modificările.",
        );
        setSaving(false);
        return;
      }

      Alert.alert("Succes", "Anunțul a fost actualizat.");

      navigation.replace(ROUTES.ItemDetails, {
        itemId: data.id,
        item: data,
      });
    } catch (e) {
      console.error("EditItem WEB save exception:", e);
      Alert.alert("Eroare", "A apărut o problemă la salvare.");
    } finally {
      setSaving(false);
    }
  }, [
    itemId,
    uploading,
    validate,
    title,
    price,
    description,
    category,
    images,
    item,
    navigation,
  ]);

  const handleCancel = useCallback(() => {
    if (uploading) {
      Alert.alert(
        "Așteaptă puțin",
        "Se încarcă pozele. Încearcă din nou după.",
      );
      return;
    }

    if (itemId) {
      navigation.replace(ROUTES.ItemDetails, {
        itemId,
        item,
      });
    } else {
      navigation.navigate(ROUTES.Home);
    }
  }, [navigation, itemId, item, uploading]);

  // ----------------------------
  // WEB: Add photos (file input + upload)
  // ----------------------------
  const guessExtFromNameOrType = useCallback((file) => {
    const name = String(file?.name || "");
    const type = String(file?.type || "").toLowerCase();

    const fromName = name.includes(".") ? name.split(".").pop() : "";
    const ext = String(fromName || "").toLowerCase();

    if (ext === "png" || ext === "webp" || ext === "jpg" || ext === "jpeg")
      return ext === "jpeg" ? "jpg" : ext;

    if (type.includes("png")) return "png";
    if (type.includes("webp")) return "webp";
    return "jpg";
  }, []);

  const guessContentType = useCallback((file, ext) => {
    const type = String(file?.type || "").toLowerCase();
    if (type.startsWith("image/")) return type;

    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    return "image/jpeg";
  }, []);

  const openFilePicker = useCallback(() => {
    if (saving || uploading) return;
    if (Platform.OS !== "web") return;

    const remain = maxImages - images.length;
    if (remain <= 0) {
      Alert.alert("Limită atinsă", `Poți avea maxim ${maxImages} imagini.`);
      return;
    }

    try {
      // ✅ reset value înainte de click (altfel onChange poate să nu fireze)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      fileInputRef.current?.click?.();
    } catch (e) {
      console.log("openFilePicker error:", e);
    }
  }, [saving, uploading, images.length]);

  const uploadFilesWeb = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      const remain = maxImages - images.length;
      const picked = Array.from(files).slice(0, Math.max(0, remain));

      if (picked.length === 0) {
        Alert.alert("Limită atinsă", `Poți avea maxim ${maxImages} imagini.`);
        return;
      }

      setUploading(true);

      try {
        const uploaded = [];

        for (let i = 0; i < picked.length; i++) {
          const file = picked[i];

          const ab = await file.arrayBuffer();
          const bytes = new Uint8Array(ab);

          if (!bytes || bytes.length === 0) {
            throw new Error("O imagine are 0 bytes (nu s-a putut citi).");
          }

          const ext = guessExtFromNameOrType(file);
          const contentType = guessContentType(file, ext);

          const safeExt = String(ext).replace(/[^a-z0-9]/gi, "") || "jpg";
          const storagePath = `edit_${itemId}_${Date.now()}_${i}.${safeExt}`;

          const { error: uploadErr } = await supabase.storage
            .from("items")
            .upload(storagePath, bytes, {
              contentType,
              upsert: false,
            });

          if (uploadErr) throw uploadErr;

          const { data } = supabase.storage
            .from("items")
            .getPublicUrl(storagePath);
          if (data?.publicUrl) uploaded.push(data.publicUrl);
        }

        if (uploaded.length > 0) {
          setImages((prev) => [...prev, ...uploaded].slice(0, maxImages));
        }
      } catch (e) {
        console.error("EditItem WEB upload error:", e);
        Alert.alert("Eroare", e?.message || "Nu am putut încărca pozele.");
      } finally {
        setUploading(false);
      }
    },
    [images.length, itemId, guessExtFromNameOrType, guessContentType],
  );

  const onFileInputChange = useCallback(
    async (e) => {
      const files = e?.target?.files;

      // ✅ forțează remount (rezolvă cazurile când browserul nu mai declanșează onChange)
      setFileInputKey((k) => k + 1);

      await uploadFilesWeb(files);
    },
    [uploadFilesWeb],
  );

  if (loading) {
    return (
      <View style={styles.page}>
        <View style={styles.container80}>
          <Text style={styles.loadingText}>Se încarcă editorul…</Text>
        </View>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.page}>
        <View style={styles.container80}>
          <Text style={styles.errorText}>Anunțul nu a fost găsit.</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate(ROUTES.Home)}
          >
            <Text style={styles.secondaryBtnText}>Înapoi</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!canRenderEditor) {
    return (
      <View style={styles.page}>
        <View style={styles.container80}>
          <Text style={styles.errorText}>
            Nu ai dreptul să editezi acest anunț.
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={handleCancel}>
            <Text style={styles.secondaryBtnText}>Înapoi la anunț</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {/* Hidden file input for WEB */}
      {Platform.OS === "web" ? (
        <input
          key={fileInputKey} // ✅ remount când crește key-ul
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
          <View style={styles.headerRow}>
            <Text style={styles.h1}>Editează anunț</Text>

            <View style={styles.headerActions}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={handleCancel}
                disabled={saving || uploading}
              >
                <Text style={styles.secondaryBtnText}>
                  {uploading ? "Se încarcă…" : "Renunță"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.primaryBtn}
                onPress={handleSave}
                disabled={saving || uploading}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? "Se salvează…" : "Salvează"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Titlu</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titlu"
              placeholderTextColor="rgba(17,17,17,0.45)"
              style={styles.input}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Preț</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  placeholderTextColor="rgba(17,17,17,0.45)"
                  style={styles.input}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Categorie</Text>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="ex: Îmbrăcăminte"
                  placeholderTextColor="rgba(17,17,17,0.45)"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Descriere</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Descriere"
              placeholderTextColor="rgba(17,17,17,0.45)"
              style={[styles.input, styles.textarea]}
              multiline
            />
          </View>

          <View style={styles.card}>
            <View style={styles.imagesHeaderRow}>
              <View style={{ gap: 6 }}>
                <Text style={styles.h2}>Imagini</Text>
                <Text style={styles.smallNote}>
                  Reordonează cu ◀ ▶ sau șterge. Poți adăuga până la {maxImages}
                  .
                </Text>
              </View>

              <Pressable
                style={[
                  styles.addPhotosBtn,
                  (saving || uploading || images.length >= maxImages) &&
                    styles.addPhotosBtnDisabled,
                ]}
                onPress={openFilePicker}
                disabled={saving || uploading || images.length >= maxImages}
              >
                <Text style={styles.addPhotosBtnText}>
                  {uploading
                    ? "Se încarcă…"
                    : `Adaugă poze (${images.length}/${maxImages})`}
                </Text>
              </Pressable>
            </View>

            {images.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Nu există imagini în anunț. Apasă „Adaugă poze”.
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

          <View style={styles.bottomRow}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={handleCancel}
              disabled={saving || uploading}
            >
              <Text style={styles.secondaryBtnText}>Înapoi</Text>
            </Pressable>
            <Pressable
              style={styles.primaryBtn}
              onPress={handleSave}
              disabled={saving || uploading}
            >
              <Text style={styles.primaryBtnText}>
                {saving ? "Se salvează…" : "Salvează"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Light background ca Home web
  page: { flex: 1, backgroundColor: "#f5f7fb" },
  container80: {
    width: "80%",
    maxWidth: 1240,
    alignSelf: "center",
    paddingTop: 18,
  },

  loadingText: { color: "#111", fontSize: 14, fontWeight: "700" },
  errorText: {
    color: "#b00020",
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "800",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  headerActions: { flexDirection: "row", gap: 10 },

  h1: { color: "#111", fontSize: 22, fontWeight: "900" },
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
  textarea: { height: 110, paddingTop: 12, textAlignVertical: "top" },

  row2: { flexDirection: "row", gap: 12 },

  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#0B69FF",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
  },
  secondaryBtnText: { color: "#111", fontWeight: "900" },

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

  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 2,
  },
});
