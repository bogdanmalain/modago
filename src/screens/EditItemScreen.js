// src/screens/EditItemScreen.js
// COMPONENTĂ: EditItemScreen
// MODIFICARE:
// - după delete nu mai mergem în Home
// - revenim în MyItemsScreen cu params: deletedItemId, deletedAt, deletedSuccessMessage
// - MyItemsScreen va afișa popup-ul de succes și va scoate anunțul local din listă
// - păstrat delete-ul strict din Supabase Storage și curățarea favorites

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
import { updateItem } from "../services/itemsService";
import { removeFavoritesByItem } from "../services/favoritesService";
import { ThemeContext } from "../theme/ThemeProvider";
import HeaderBackButton, {
  HEADER_BACK_SIZE,
} from "../components/HeaderBackButton";

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

function extractStoragePathFromUrl(url, bucket = STORAGE_BUCKET) {
  const value = String(url || "").trim();
  if (!value) return null;

  if (
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.includes("/storage/v1/object/")
  ) {
    return value.split("?")[0] || null;
  }

  try {
    const decoded = decodeURIComponent(value);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/render/image/public/${bucket}/`,
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
    ];

    for (const marker of markers) {
      const idx = decoded.indexOf(marker);
      if (idx >= 0) {
        return decoded.slice(idx + marker.length).split("?")[0] || null;
      }
    }

    const urlObj = new URL(value);
    const pathname = decodeURIComponent(urlObj.pathname);
    const bucketMarker = `/${bucket}/`;
    const idx = pathname.indexOf(bucketMarker);

    if (idx >= 0) {
      return pathname.slice(idx + bucketMarker.length) || null;
    }

    return null;
  } catch {
    return null;
  }
}

function getStoragePathsFromImages(images, bucket = STORAGE_BUCKET) {
  const arr = Array.isArray(images) ? images : [];

  const paths = arr
    .map((entry) => {
      if (typeof entry === "string") {
        return extractStoragePathFromUrl(entry, bucket);
      }
      if (entry?.url) return extractStoragePathFromUrl(entry.url, bucket);
      if (entry?.uri) return extractStoragePathFromUrl(entry.uri, bucket);
      return null;
    })
    .filter(Boolean);

  return Array.from(new Set(paths));
}

async function removeStoragePathsStrict(paths, bucket = STORAGE_BUCKET) {
  const cleanPaths = Array.from(
    new Set((Array.isArray(paths) ? paths : []).filter(Boolean)),
  );

  if (!cleanPaths.length) return true;

  const { error } = await supabase.storage.from(bucket).remove(cleanPaths);

  if (!error) return true;

  const failures = [];

  for (const path of cleanPaths) {
    const { error: singleError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (singleError) {
      failures.push({ path, error: singleError });
    }
  }

  if (failures.length > 0) {
    const first = failures[0]?.error;
    throw new Error(
      first?.message ||
        "Nu am putut șterge una sau mai multe imagini din Storage.",
    );
  }

  return true;
}

async function deleteItemWithImages(item, bucket = STORAGE_BUCKET) {
  if (!item?.id) throw new Error("Lipsește id-ul anunțului.");

  const paths = getStoragePathsFromImages(item?.images, bucket);

  if (paths.length > 0) {
    await removeStoragePathsStrict(paths, bucket);
  }

  await removeFavoritesByItem(String(item.id));

  const { error: dbErr } = await supabase
    .from("items")
    .delete()
    .eq("id", item.id);

  if (dbErr) throw dbErr;
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

export default function EditItemScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const passedItem = route?.params?.item || null;

  const initialImages = useMemo(() => {
    const arr = passedItem?.images || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }, [passedItem]);

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
  const [images, setImages] = useState(initialImages);

  const itemId = useMemo(
    () => (passedItem?.id ? String(passedItem.id) : null),
    [passedItem],
  );
  const userId = session?.user?.id || null;

  const S = useMemo(() => makeStyles(tokens), [tokens]);
  const onPrimaryColor = pickTok(tokens, "onPrimary", "#FFFFFF");

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
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    if (passedItem) {
      navigation.navigate(ROUTES.ItemDetails, { item: passedItem });
      return;
    }

    navigation.navigate(ROUTES.MyItems || "MyItems");
  }, [navigation, passedItem]);

  const goToMyItemsWithUpdate = useCallback(
    (params) => {
      navigation.navigate(ROUTES.MyItems || "MyItems", params);
    },
    [navigation],
  );

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
      quality: 1,
    });

    if (result.canceled) return;

    const assets = Array.isArray(result.assets) ? result.assets : [];
    if (assets.length === 0) return;

    setUploading(true);
    try {
      const newUrls = [];

      for (const a of assets) {
        if (!a?.uri) continue;

        const url = await uploadImageToSupabase({
          uri: a.uri,
          userId,
          meta: { width: a?.width, height: a?.height },
        });

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

    const p = String(price || "")
      .trim()
      .replace(",", ".");
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
        images,
      };

      const removedImages = initialImages.filter(
        (oldUrl) => !images.includes(oldUrl),
      );
      const removedPaths = getStoragePathsFromImages(
        removedImages,
        STORAGE_BUCKET,
      );

      const updated = await updateItem(itemId, payload);

      if (removedPaths.length > 0) {
        await removeStoragePathsStrict(removedPaths, STORAGE_BUCKET);
      }

      const updatedRow =
        updated && typeof updated === "object"
          ? updated
          : {
              ...(passedItem || {}),
              ...payload,
              id: passedItem?.id ?? itemId,
            };

      Alert.alert("Salvat", "Anunțul a fost actualizat.", [
        {
          text: "OK",
          onPress: () => {
            goToMyItemsWithUpdate({
              updatedItem: updatedRow,
              updatedAt: Date.now(),
            });
          },
        },
      ]);
    } catch (e) {
      console.log("❌ updateItem error:", e);
      Alert.alert("Eroare", e?.message || "Nu am putut salva.");
    } finally {
      setSaving(false);
    }
  }, [
    itemId,
    title,
    description,
    price,
    category,
    images,
    initialImages,
    passedItem,
    goToMyItemsWithUpdate,
  ]);

  const onDeleteItem = useCallback(() => {
    if (!itemId || !passedItem) return;

    Alert.alert("Șterge anunțul?", "Sigur vrei să-l ștergi?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);

            await deleteItemWithImages(
              {
                ...passedItem,
                images,
                id: passedItem.id,
              },
              STORAGE_BUCKET,
            );

            goToMyItemsWithUpdate({
              deletedItemId: String(itemId),
              deletedAt: Date.now(),
              deletedSuccessMessage: "Anunțul a fost șters.",
            });
          } catch (e) {
            console.log("❌ deleteItem error:", e);
            Alert.alert("Eroare", e?.message || "Nu am putut șterge anunțul.");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [itemId, passedItem, images, goToMyItemsWithUpdate]);

  if (!passedItem) {
    return (
      <View style={[S.screen, { paddingTop: insets.top + 12 }]}>
        <HeaderBackButton onPress={goBackSafe} top={insets.top + 10} />

        <View style={S.center}>
          <Text style={S.h1}>Nu am primit anunțul.</Text>
          <Text style={S.mutedText}>Întoarce-te și deschide din listă.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={S.screen}>
      <HeaderBackButton onPress={goBackSafe} top={insets.top + 10} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10 + HEADER_BACK_SIZE + 18,
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
          placeholderTextColor={S.placeholder.color}
          style={S.input}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descriere"
          placeholderTextColor={S.placeholder.color}
          style={[S.input, S.textArea]}
          multiline
        />

        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="Preț"
          placeholderTextColor={S.placeholder.color}
          style={S.input}
          keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
        />

        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Categorie"
          placeholderTextColor={S.placeholder.color}
          style={S.input}
        />

        <TouchableOpacity
          onPress={pickAndAddImages}
          activeOpacity={0.9}
          style={[S.addPhotosBtn, uploading && { opacity: 0.7 }]}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={onPrimaryColor} />
          ) : (
            <Text style={S.addPhotosText}>
              Adaugă poze ({images.length}/{MAX_IMAGES})
            </Text>
          )}
        </TouchableOpacity>

        <View style={S.grid}>
          {images.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={S.tile}>
              <Image source={{ uri }} style={S.tileImg} resizeMode="cover" />

              <View style={S.tileActions}>
                <TouchableOpacity
                  onPress={() => moveUp(idx)}
                  style={[S.actionBtn, idx === 0 && S.actionDisabled]}
                  disabled={idx === 0}
                  activeOpacity={0.9}
                >
                  <Text style={S.actionText}>↑</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => moveDown(idx)}
                  style={[
                    S.actionBtn,
                    idx === images.length - 1 && S.actionDisabled,
                  ]}
                  disabled={idx === images.length - 1}
                  activeOpacity={0.9}
                >
                  <Text style={S.actionText}>↓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => removeAt(idx)}
                  style={[S.actionBtn, S.actionDelete]}
                  activeOpacity={0.9}
                >
                  <Text style={S.actionText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={onSave}
          activeOpacity={0.9}
          style={[S.primaryBtn, saving && { opacity: 0.7 }]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={onPrimaryColor} />
          ) : (
            <Text style={S.primaryText}>Salvează</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDeleteItem}
          activeOpacity={0.9}
          style={[S.deleteBtn, saving && { opacity: 0.7 }]}
          disabled={saving}
        >
          <Text style={S.deleteText}>Șterge anunțul</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const primary = pickTok(
    tokens,
    "primary",
    pickTok(tokens, "accent", "#2563EB"),
  );
  const danger = pickTok(tokens, "danger", "#EF4444");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },

    placeholder: { color: muted },

    input: {
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 14,
      fontSize: 16,
      fontWeight: "700",
      color: text,
      marginBottom: 14,
      backgroundColor: card,
    },

    textArea: {
      height: 120,
      paddingTop: 14,
      textAlignVertical: "top",
    },

    addPhotosBtn: {
      height: 56,
      borderRadius: 16,
      backgroundColor: card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: border,
    },

    addPhotosText: {
      fontSize: 18,
      fontWeight: "900",
      color: primary,
    },

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
      borderColor: border,
      backgroundColor: card,
    },

    tileImg: {
      width: "100%",
      height: 120,
      backgroundColor: bg,
    },

    tileActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 8,
      gap: 8,
      backgroundColor: card,
      borderTopWidth: 1,
      borderTopColor: border,
    },

    actionBtn: {
      flex: 1,
      height: 38,
      borderRadius: 12,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },

    actionDisabled: { opacity: 0.35 },
    actionDelete: { backgroundColor: danger },

    actionText: {
      color: onPrimary,
      fontSize: 18,
      fontWeight: "900",
    },

    primaryBtn: {
      height: 58,
      borderRadius: 16,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },

    primaryText: {
      color: onPrimary,
      fontWeight: "900",
      fontSize: 20,
    },

    deleteBtn: {
      height: 58,
      borderRadius: 16,
      backgroundColor: danger,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },

    deleteText: {
      color: onPrimary,
      fontWeight: "900",
      fontSize: 18,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },

    h1: {
      fontSize: 18,
      fontWeight: "900",
      color: text,
    },

    mutedText: {
      marginTop: 8,
      color: muted,
      fontWeight: "700",
      textAlign: "center",
    },
  });
}
