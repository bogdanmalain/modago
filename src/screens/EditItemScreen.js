// src/screens/EditItemScreen.js
// Ce este: ecranul de editare produs pentru ModaGo.
// Ce s-a modificat:
// - am înlocuit categoria text liber cu selector real bazat pe CATEGORY_TREE, aliniat cu AddItemScreen
// - am adăugat atribute dinamice bazate pe categoryAttributes, cu picker dedicat pentru fiecare atribut
// - la salvare trimit și category, category_key, category_path și attributes
// - am păstrat flow-ul existent de update, delete, upload și reorder pentru poze

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
  Keyboard,
  Modal,
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
import {
  CATEGORY_TREE,
  getNodesByPath,
  getPathLabel,
  getPathLabels,
  getNodeByPath,
  isLeafNode,
  findPathByQuery,
} from "../constants/categoryTree";
import {
  getCategoryAttributes,
  getOptionLabel,
} from "../constants/categoryAttributes";
import { getCategoryImageByPath } from "../constants/categoryVisuals";

const STORAGE_BUCKET = "items";
const MAX_IMAGES = 6;
const MAX_LONG_SIDE = 1600;
const JPEG_QUALITY = 0.85;

const HIDDEN_TOP_CATEGORY_KEYS = new Set(["entertainment", "hobby", "sports"]);
const HIDDEN_TOP_CATEGORY_LABELS = new Set([
  "divertisment",
  "hobbyuri și colecții",
  "hobbyuri si colectii",
  "sporturi",
]);

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

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeTextValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return "";
  return text;
}

function shouldHideTopCategoryByNode(node) {
  const key = normalizeLabel(node?.key);
  const label = normalizeLabel(node?.label);
  return (
    HIDDEN_TOP_CATEGORY_KEYS.has(key) || HIDDEN_TOP_CATEGORY_LABELS.has(label)
  );
}

function shouldHideTopCategoryByPathKeys(pathKeys = [], pathLabel = "") {
  const firstKey = normalizeLabel(pathKeys?.[0]);
  const firstLabel = normalizeLabel(
    String(pathLabel || "")
      .split(">")
      .map((x) => x.trim())[0] || "",
  );

  return (
    HIDDEN_TOP_CATEGORY_KEYS.has(firstKey) ||
    HIDDEN_TOP_CATEGORY_LABELS.has(firstLabel)
  );
}

function getDisplayCategoryLabel(rawLabel, pathLabels = [], nextPath = []) {
  const normalized = normalizeLabel(rawLabel);
  const topLabel = normalizeLabel(pathLabels?.[0] || "");
  const depth = Array.isArray(nextPath) ? nextPath.length : 0;

  if (depth === 2) {
    if (topLabel === "femei") {
      if (normalized === "îmbrăcăminte" || normalized === "imbracaminte") {
        return "Haine";
      }
      if (normalized === "încălțăminte" || normalized === "incaltaminte") {
        return "Pantofi";
      }
    }

    if (topLabel === "bărbați" || topLabel === "barbati") {
      if (normalized === "îmbrăcăminte" || normalized === "imbracaminte") {
        return "Haine";
      }
      if (normalized === "încălțăminte" || normalized === "incaltaminte") {
        return "Pantofi";
      }
    }

    if (topLabel === "copii") {
      if (
        normalized === "îmbrăcăminte fete" ||
        normalized === "imbracaminte fete"
      ) {
        return "Haine fete";
      }
      if (
        normalized === "îmbrăcăminte băieți" ||
        normalized === "imbracaminte băieți" ||
        normalized === "îmbrăcăminte baieti" ||
        normalized === "imbracaminte baieti"
      ) {
        return "Haine băieți";
      }
      if (normalized === "încălțăminte" || normalized === "incaltaminte") {
        return "Pantofi";
      }
      if (normalized === "accesorii") {
        return "Accesorii";
      }
    }
  }

  if (depth === 3 && topLabel === "copii") {
    const parentLabel = normalizeLabel(pathLabels?.[1] || "");

    if (parentLabel === "încălțăminte" || parentLabel === "incaltaminte") {
      if (normalized === "fete") return "Pantofi fete";
      if (normalized === "băieți" || normalized === "baieti") {
        return "Pantofi băieți";
      }
    }
  }

  return rawLabel || "";
}

function getCategoryEmoji(label, pathLabels = [], nextPath = []) {
  const displayLabel = normalizeLabel(
    getDisplayCategoryLabel(label, pathLabels, nextPath),
  );
  const topLabel = normalizeLabel(pathLabels?.[0] || "");
  const depth = Array.isArray(nextPath) ? nextPath.length : 0;

  if (depth === 1) {
    if (displayLabel === "femei") return "👗";
    if (displayLabel === "bărbați" || displayLabel === "barbati") return "👔";
    if (displayLabel === "copii") return "🧒";
  }

  if (topLabel === "femei" && depth === 2) {
    if (displayLabel === "haine") return "👗";
    if (displayLabel === "pantofi") return "👠";
    if (displayLabel === "genți" || displayLabel === "genti") return "👜";
    if (displayLabel === "accesorii") return "💍";
  }

  if ((topLabel === "bărbați" || topLabel === "barbati") && depth === 2) {
    if (displayLabel === "haine") return "👕";
    if (displayLabel === "pantofi") return "👞";
    if (displayLabel === "accesorii") return "⌚";
  }

  if (topLabel === "copii" && depth === 2) {
    if (
      displayLabel === "haine fete" ||
      displayLabel === "haine băieți" ||
      displayLabel === "haine baieti"
    ) {
      return "🧥";
    }
    if (displayLabel === "pantofi") return "👟";
    if (displayLabel === "accesorii") return "🎒";
  }

  if (topLabel === "copii" && depth === 3) {
    if (displayLabel === "pantofi fete") return "👟";
    if (
      displayLabel === "pantofi băieți" ||
      displayLabel === "pantofi baieti"
    ) {
      return "👟";
    }
  }

  if (displayLabel.includes("roch")) return "👗";
  if (displayLabel.includes("haine")) return "👕";
  if (displayLabel.includes("pantofi")) return "👟";
  if (displayLabel.includes("încăl") || displayLabel.includes("incal")) {
    return "👟";
  }
  if (displayLabel.includes("geant")) return "👜";
  if (displayLabel.includes("accesor")) return "🎒";
  if (displayLabel.includes("ceas")) return "⌚";
  if (displayLabel.includes("jachet")) return "🧥";
  if (displayLabel.includes("cop")) return "🧒";
  if (displayLabel.includes("ghioz") || displayLabel.includes("rucsac")) {
    return "🎒";
  }
  if (displayLabel.includes("ochel")) return "🕶️";
  if (displayLabel.includes("mănu") || displayLabel.includes("manu")) {
    return "🧤";
  }
  if (displayLabel.includes("fular") || displayLabel.includes("eșarf")) {
    return "🧣";
  }
  if (displayLabel.includes("șep") || displayLabel.includes("sep")) {
    return "🧢";
  }

  return "✨";
}

function isFashionSecondLevel(pathLabels = [], nextPath = []) {
  const topLabel = normalizeLabel(pathLabels?.[0] || "");
  const depth = Array.isArray(nextPath) ? nextPath.length : 0;

  return (
    depth === 2 &&
    (topLabel === "femei" ||
      topLabel === "bărbați" ||
      topLabel === "barbati" ||
      topLabel === "copii")
  );
}

function shouldSuppressEmojiFallback(pathLabels = [], nextPath = []) {
  const topLabel = normalizeLabel(pathLabels?.[0] || "");
  const depth = Array.isArray(nextPath) ? nextPath.length : 0;

  return (
    (topLabel === "femei" ||
      topLabel === "bărbați" ||
      topLabel === "barbati" ||
      topLabel === "copii") &&
    depth >= 2
  );
}

function CategoryLeadingVisual({
  label,
  pathLabels = [],
  nextPath = [],
  stylesObj,
}) {
  const imageSource = getCategoryImageByPath(nextPath);
  const useUnifiedFashionSize = isFashionSecondLevel(pathLabels, nextPath);
  const suppressEmoji = shouldSuppressEmojiFallback(pathLabels, nextPath);

  if (imageSource) {
    return (
      <View style={stylesObj.optionLeadingSlot}>
        <View
          style={[
            stylesObj.optionImageWrap,
            useUnifiedFashionSize && stylesObj.optionImageWrapFashionUnified,
          ]}
        >
          <Image
            source={imageSource}
            style={[
              stylesObj.optionImage,
              useUnifiedFashionSize && stylesObj.optionImageFashionUnified,
            ]}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  if (suppressEmoji) {
    return <View style={stylesObj.optionLeadingSpacer} />;
  }

  return (
    <View style={stylesObj.optionLeadingSlot}>
      <Text style={stylesObj.optionEmoji}>
        {getCategoryEmoji(label, pathLabels, nextPath)}
      </Text>
    </View>
  );
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

function AttributeSelectField({
  label,
  value,
  displayValue,
  placeholder,
  onPress,
  stylesObj,
}) {
  return (
    <View style={stylesObj.attrBlock}>
      <Text style={stylesObj.attrLabel}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={stylesObj.selectInput}
      >
        <View style={stylesObj.selectInputContent}>
          <Text
            style={[
              stylesObj.selectInputValue,
              !value && stylesObj.selectInputPlaceholder,
            ]}
            numberOfLines={2}
          >
            {displayValue || placeholder}
          </Text>

          <Text style={stylesObj.selectChevron}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function deriveInitialCategoryPath(item) {
  if (Array.isArray(item?.category_path) && item.category_path.length > 0) {
    return item.category_path.filter(Boolean);
  }

  if (item?.category_key) {
    const found = findPathByQuery(CATEGORY_TREE, String(item.category_key));
    const exact = found.find((x) => x?.node?.key === item.category_key);
    if (exact?.pathKeys?.length) return exact.pathKeys;
  }

  const categoryLabel = String(item?.category || "").trim();
  if (!categoryLabel) return [];

  const exactLabel = findPathByQuery(CATEGORY_TREE, categoryLabel).find(
    (x) => String(x?.pathLabel || "").trim() === categoryLabel,
  );
  if (exactLabel?.pathKeys?.length) return exactLabel.pathKeys;

  const byLastNode = findPathByQuery(CATEGORY_TREE, categoryLabel).find(
    (x) =>
      String(x?.node?.label || "")
        .trim()
        .toLowerCase() === categoryLabel.toLowerCase(),
  );
  if (byLastNode?.pathKeys?.length) return byLastNode.pathKeys;

  return [];
}

function getInitialAttributeValues(item) {
  const attrs =
    item?.attributes && typeof item.attributes === "object"
      ? item.attributes
      : {};
  return { ...attrs };
}

export default function EditItemScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const passedItem = route?.params?.item || null;

  const initialImages = useMemo(() => {
    const arr = passedItem?.images || [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }, [passedItem]);

  const initialCategoryPath = useMemo(
    () => deriveInitialCategoryPath(passedItem),
    [passedItem],
  );

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

  const [categoryPath, setCategoryPath] = useState(initialCategoryPath);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const [activeAttribute, setActiveAttribute] = useState(null);
  const [attributeValues, setAttributeValues] = useState(() =>
    getInitialAttributeValues(passedItem),
  );

  const [localImages, setLocalImages] = useState(initialImages);

  const [errorMsg, setErrorMsg] = useState("");

  const canPickMore = localImages.length < MAX_IMAGES;

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

  const pickImages = useCallback(async () => {
    setErrorMsg("");

    if (!canPickMore) {
      Alert.alert("Limită poze", `Maxim ${MAX_IMAGES} poze.`);
      return;
    }

    if (!userId) {
      Alert.alert("Login", "Trebuie să fii logat ca să adaugi poze.");
      navigation.navigate(ROUTES.Login);
      return;
    }

    const ok = await askMediaPermission();
    if (!ok) return;

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

      setUploading(true);

      const uploadedUrls = [];
      for (const img of next) {
        const url = await uploadImageToSupabase({
          uri: img.uri,
          userId,
          meta: img,
        });
        uploadedUrls.push(url);
      }

      setLocalImages((prev) => [...prev, ...uploadedUrls].slice(0, MAX_IMAGES));
    } catch (e) {
      console.log("❌ pick/upload error:", e);
      Alert.alert("Eroare", e?.message || "Nu pot adăuga imagini.");
    } finally {
      setUploading(false);
    }
  }, [askMediaPermission, canPickMore, localImages.length, navigation, userId]);

  const moveUp = useCallback((idx) => {
    setLocalImages((prev) => {
      if (idx <= 0) return prev;
      const copy = [...prev];
      const t = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = t;
      return copy;
    });
  }, []);

  const moveDown = useCallback((idx) => {
    setLocalImages((prev) => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const t = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = t;
      return copy;
    });
  }, []);

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

  const categoryLabel = useMemo(() => {
    return categoryPath.length ? getPathLabel(CATEGORY_TREE, categoryPath) : "";
  }, [categoryPath]);

  const categoryLabels = useMemo(() => {
    return getPathLabels(CATEGORY_TREE, categoryPath);
  }, [categoryPath]);

  const categoryLeafNode = useMemo(() => {
    return getNodeByPath(CATEGORY_TREE, categoryPath);
  }, [categoryPath]);

  const categoryLeafKey = categoryLeafNode?.key || "";

  const shortCategoryLabel = useMemo(() => {
    if (!categoryLabels.length) return "";
    return categoryLabels[categoryLabels.length - 1];
  }, [categoryLabels]);

  const currentCategoryNodes = useMemo(() => {
    const nodes = getNodesByPath(CATEGORY_TREE, categoryPath);

    if (!categoryPath.length) {
      return nodes.filter((node) => !shouldHideTopCategoryByNode(node));
    }

    return nodes;
  }, [categoryPath]);

  const isSearching = String(categorySearch || "").trim().length > 0;

  const searchResults = useMemo(() => {
    return findPathByQuery(CATEGORY_TREE, categorySearch)
      .filter(
        (item) =>
          !shouldHideTopCategoryByPathKeys(item?.pathKeys, item?.pathLabel),
      )
      .slice(0, 50);
  }, [categorySearch]);

  const dynamicAttributes = useMemo(() => {
    const candidates = [
      categoryLeafKey,
      ...(Array.isArray(categoryPath) ? [...categoryPath].reverse() : []),
    ].filter(Boolean);

    for (const key of candidates) {
      const attrs = getCategoryAttributes(key);
      if (Array.isArray(attrs) && attrs.length > 0) {
        return attrs;
      }
    }

    return [];
  }, [categoryLeafKey, categoryPath]);

  const activeAttributeOptions = useMemo(() => {
    if (!activeAttribute) return [];
    return activeAttribute.options || [];
  }, [activeAttribute]);

  const activeAttributeValue = activeAttribute
    ? attributeValues[activeAttribute.key] || ""
    : "";

  const currentCategoryTitle = useMemo(() => {
    if (!categoryLabels.length) return "Categorie";
    return categoryLabels[categoryLabels.length - 1];
  }, [categoryLabels]);

  const openCategoryPicker = useCallback(() => {
    setCategoryPickerVisible(true);
  }, []);

  const closeCategoryPicker = useCallback(() => {
    setCategoryPickerVisible(false);
    setCategorySearch("");
  }, []);

  const goLevelBack = useCallback(() => {
    if (isSearching) {
      setCategorySearch("");
      return;
    }

    setCategoryPath((prev) => {
      if (!prev.length) {
        closeCategoryPicker();
        return prev;
      }
      return prev.slice(0, -1);
    });
  }, [isSearching, closeCategoryPicker]);

  const resetCategorySelection = useCallback(() => {
    setCategoryPath([]);
    setCategorySearch("");
    setAttributeValues({});
  }, []);

  const onPressCategoryNode = useCallback((node) => {
    if (!node?.key) return;

    setCategoryPath((prev) => {
      const nextPath = [...prev, node.key];

      if (isLeafNode(CATEGORY_TREE, nextPath)) {
        const currentLeaf = prev.join("|");
        const nextLeaf = nextPath.join("|");

        setCategoryPickerVisible(false);
        setCategorySearch("");

        if (currentLeaf !== nextLeaf) {
          setAttributeValues({});
        }

        return nextPath;
      }

      return nextPath;
    });
  }, []);

  const onPressSearchResult = useCallback(
    (item) => {
      if (!item?.pathKeys?.length) return;

      const currentLeaf = categoryPath.join("|");
      const nextLeaf = item.pathKeys.join("|");

      setCategoryPath(item.pathKeys);
      setCategoryPickerVisible(false);
      setCategorySearch("");

      if (currentLeaf !== nextLeaf) {
        setAttributeValues({});
      }
    },
    [categoryPath],
  );

  const openAttributePicker = useCallback((attribute) => {
    setActiveAttribute(attribute);
  }, []);

  const closeAttributePicker = useCallback(() => {
    setActiveAttribute(null);
  }, []);

  const selectAttributeOption = useCallback((attributeKey, value) => {
    setAttributeValues((prev) => ({
      ...prev,
      [attributeKey]: value,
    }));
    setActiveAttribute(null);
  }, []);

  const onSave = useCallback(async () => {
    setErrorMsg("");

    if (!itemId) {
      Alert.alert("Eroare", "Nu am itemId.");
      return;
    }

    if (!title.trim()) {
      setErrorMsg("Titlul e obligatoriu.");
      return;
    }

    if (!description.trim()) {
      setErrorMsg("Descrierea e obligatorie.");
      return;
    }

    if (normalizedPrice == null) {
      setErrorMsg("Preț invalid.");
      return;
    }

    if (!categoryLabel.trim()) {
      setErrorMsg("Categoria e obligatorie.");
      return;
    }

    for (const attribute of dynamicAttributes) {
      if (!attributeValues[attribute.key]) {
        setErrorMsg(`Câmp obligatoriu: ${attribute.label}.`);
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: normalizedPrice,
        category: categoryLabel.trim(),
        category_key: categoryLeafKey || null,
        category_path: categoryPath,
        attributes: attributeValues,
        images: localImages,
      };

      const removedImages = initialImages.filter(
        (oldUrl) => !localImages.includes(oldUrl),
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
    normalizedPrice,
    categoryLabel,
    categoryLeafKey,
    categoryPath,
    dynamicAttributes,
    attributeValues,
    localImages,
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
                images: localImages,
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
  }, [itemId, passedItem, localImages, goToMyItemsWithUpdate]);

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
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
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

        <View style={S.attrBlock}>
          <Text style={S.attrLabel}>Categorie</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openCategoryPicker}
            style={S.selectInput}
            disabled={saving || uploading}
          >
            <View style={S.selectInputContent}>
              <Text
                style={[
                  S.selectInputValue,
                  !shortCategoryLabel && S.selectInputPlaceholder,
                ]}
                numberOfLines={2}
              >
                {shortCategoryLabel || "Alege categoria"}
              </Text>
              <Text style={S.selectChevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {dynamicAttributes.length > 0 && (
          <View style={S.dynamicSection}>
            <Text style={S.dynamicSectionTitle}>Detalii categorie</Text>

            {dynamicAttributes.map((attribute) => {
              const value = attributeValues[attribute.key] || "";
              const displayValue = getOptionLabel(attribute.options, value);

              return (
                <AttributeSelectField
                  key={attribute.key}
                  label={attribute.label}
                  value={value}
                  displayValue={displayValue}
                  placeholder={attribute.placeholder}
                  onPress={() => openAttributePicker(attribute)}
                  stylesObj={S}
                />
              );
            })}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={pickImages}
          style={[S.pickBtn, (saving || uploading) && { opacity: 0.7 }]}
          disabled={saving || uploading}
        >
          {uploading ? (
            <ActivityIndicator color={onPrimaryColor} />
          ) : (
            <Text style={S.pickText}>
              Alege imagini ({localImages.length}/{MAX_IMAGES})
            </Text>
          )}
        </TouchableOpacity>

        {localImages.length > 0 && (
          <View style={S.imagesGrid}>
            {localImages.map((uri, idx) => (
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
                      idx === localImages.length - 1 && S.actionDisabled,
                    ]}
                    disabled={idx === localImages.length - 1}
                    activeOpacity={0.9}
                  >
                    <Text style={S.actionText}>↓</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => removeImage(idx)}
                    style={[S.actionBtn, S.actionDelete]}
                    activeOpacity={0.9}
                  >
                    <Text style={S.actionText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {!!errorMsg && <Text style={S.err}>{errorMsg}</Text>}

        <TouchableOpacity
          onPress={onSave}
          activeOpacity={0.9}
          style={[S.pubBtn, saving && { opacity: 0.7 }]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={onPrimaryColor} />
          ) : (
            <Text style={S.pubText}>Salvează</Text>
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

      <Modal
        visible={categoryPickerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeCategoryPicker}
      >
        <View style={S.fullscreenModal}>
          <HeaderBackButton onPress={goLevelBack} top={insets.top + 10} />

          <ScrollView
            contentContainerStyle={[
              S.fullscreenContent,
              {
                paddingTop: insets.top + 10 + HEADER_BACK_SIZE + 18,
                paddingBottom: Math.max(insets.bottom, 16) + 24,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={S.fullscreenTitle}>{currentCategoryTitle}</Text>

            <TextInput
              value={categorySearch}
              onChangeText={setCategorySearch}
              placeholder="Găsește o categorie"
              placeholderTextColor={S.placeholder.color}
              style={S.searchInput}
            />

            {isSearching ? (
              searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const pathLabels = String(item?.pathLabel || "")
                    .split(">")
                    .map((x) => x.trim())
                    .filter(Boolean);

                  const displayLabel = getDisplayCategoryLabel(
                    item.node?.label,
                    pathLabels,
                    item?.pathKeys || [],
                  );

                  return (
                    <TouchableOpacity
                      key={item.pathLabel}
                      activeOpacity={0.88}
                      onPress={() => onPressSearchResult(item)}
                      style={S.optionRow}
                    >
                      <CategoryLeadingVisual
                        label={item.node?.label}
                        pathLabels={pathLabels}
                        nextPath={item?.pathKeys || []}
                        stylesObj={S}
                      />

                      <View style={S.optionTextWrap}>
                        <Text style={S.optionText}>{displayLabel}</Text>
                        <Text style={S.optionSubtext}>{item.pathLabel}</Text>
                      </View>

                      <Text style={S.optionChevron}>›</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={S.emptyState}>
                  <Text style={S.emptyStateTitle}>Nicio categorie găsită</Text>
                  <Text style={S.emptyStateText}>
                    Încearcă un termen mai scurt sau navighează manual.
                  </Text>
                </View>
              )
            ) : currentCategoryNodes.length > 0 ? (
              currentCategoryNodes.map((node) => {
                const nextPath = [...categoryPath, node.key];
                const nextPathLabels = getPathLabels(CATEGORY_TREE, nextPath);
                const displayLabel = getDisplayCategoryLabel(
                  node.label,
                  nextPathLabels,
                  nextPath,
                );

                return (
                  <TouchableOpacity
                    key={node.key}
                    activeOpacity={0.88}
                    onPress={() => onPressCategoryNode(node)}
                    style={S.optionRow}
                  >
                    <CategoryLeadingVisual
                      label={node.label}
                      pathLabels={nextPathLabels}
                      nextPath={nextPath}
                      stylesObj={S}
                    />

                    <View style={S.optionTextWrap}>
                      <Text style={S.optionText}>{displayLabel}</Text>
                    </View>

                    <Text style={S.optionChevron}>›</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={S.emptyState}>
                <Text style={S.emptyStateTitle}>Nivel final atins</Text>
                <Text style={S.emptyStateText}>
                  Categoria selectată este gata.
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={resetCategorySelection}
              style={S.resetBtn}
            >
              <Text style={S.resetBtnText}>Resetează selecția</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={!!activeAttribute}
        animationType="slide"
        transparent={false}
        onRequestClose={closeAttributePicker}
      >
        <View style={S.fullscreenModal}>
          <HeaderBackButton
            onPress={closeAttributePicker}
            top={insets.top + 10}
          />

          <ScrollView
            contentContainerStyle={[
              S.fullscreenContent,
              {
                paddingTop: insets.top + 10 + HEADER_BACK_SIZE + 18,
                paddingBottom: Math.max(insets.bottom, 16) + 24,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={S.fullscreenTitle}>
              {activeAttribute?.label || "Selectează"}
            </Text>

            {activeAttributeOptions.map((option) => {
              const selected = activeAttributeValue === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.88}
                  onPress={() =>
                    selectAttributeOption(activeAttribute.key, option.value)
                  }
                  style={S.optionRow}
                >
                  <View style={S.optionTextWrap}>
                    <Text style={S.optionText}>{option.label}</Text>
                  </View>
                  <Text style={[S.optionChevron, selected && S.optionSelected]}>
                    {selected ? "✓" : "›"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  const cardMuted = pickTok(tokens, "cardMuted", primarySoft);
  const dim = pickTok(tokens, "dim", "rgba(0,0,0,0.55)");

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },

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

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
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

    textarea: {
      minHeight: 110,
      textAlignVertical: "top",
    },

    attrBlock: {
      marginBottom: 12,
    },

    attrLabel: {
      color: text,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 8,
      paddingHorizontal: 2,
    },

    selectInput: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 14,
      backgroundColor: card,
    },

    selectInputContent: {
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    selectInputValue: {
      flex: 1,
      fontSize: 16,
      fontWeight: "800",
      color: text,
    },

    selectInputPlaceholder: {
      color: muted,
      fontWeight: "700",
    },

    selectChevron: {
      fontSize: 26,
      lineHeight: 26,
      color: muted,
      marginTop: -1,
    },

    dynamicSection: {
      marginBottom: 6,
    },

    dynamicSectionTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: text,
      marginBottom: 10,
      marginTop: 2,
    },

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

    pickText: {
      fontWeight: "900",
      fontSize: 16,
      color: primary,
    },

    imagesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 12,
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

    err: {
      marginTop: 10,
      color: danger,
      fontWeight: "900",
      fontSize: 14,
    },

    pubBtn: {
      marginTop: 14,
      height: 56,
      borderRadius: 14,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },

    pubText: {
      color: onPrimary,
      fontWeight: "900",
      fontSize: 18,
    },

    deleteBtn: {
      height: 56,
      borderRadius: 14,
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

    fullscreenModal: {
      flex: 1,
      backgroundColor: bg,
    },

    fullscreenContent: {
      paddingHorizontal: 16,
      backgroundColor: bg,
    },

    fullscreenTitle: {
      fontSize: 28,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 16,
      color: text,
    },

    searchInput: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 16,
      fontWeight: "700",
      backgroundColor: card,
      color: text,
      marginBottom: 12,
    },

    optionRow: {
      minHeight: 73,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 18,
      backgroundColor: card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 16,
      marginBottom: 10,
    },

    optionLeadingSlot: {
      width: 86,
      minWidth: 86,
      alignItems: "center",
      justifyContent: "center",
    },

    optionLeadingSpacer: {
      width: 14,
      minWidth: 14,
    },

    optionEmoji: {
      fontSize: 24,
      lineHeight: 28,
      width: 32,
      textAlign: "center",
    },

    optionImageWrap: {
      width: 58,
      height: 58,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: 14,
    },

    optionImage: {
      width: 58,
      height: 58,
    },

    optionImageWrapFashionUnified: {
      width: 40,
      height: 40,
    },

    optionImageFashionUnified: {
      width: 40,
      height: 40,
    },

    optionTextWrap: {
      flex: 1,
      paddingVertical: 14,
      justifyContent: "center",
    },

    optionText: {
      color: text,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "700",
    },

    optionSubtext: {
      color: muted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      marginTop: 4,
    },

    optionChevron: {
      fontSize: 28,
      lineHeight: 28,
      color: muted,
      marginTop: -2,
    },

    optionSelected: {
      color: primary,
      fontSize: 22,
      fontWeight: "900",
    },

    emptyState: {
      paddingTop: 26,
      paddingHorizontal: 4,
    },

    emptyStateTitle: {
      color: text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
    },

    emptyStateText: {
      color: muted,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
    },

    resetBtn: {
      marginTop: 10,
      height: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      alignItems: "center",
      justifyContent: "center",
    },

    resetBtnText: {
      color: primary,
      fontSize: 16,
      fontWeight: "900",
    },
  });
}
