// src/screens/AddItemScreen.js
// Ce este: ecranul de publicare produs pentru ModaGo.
// Ce s-a modificat:
// - am păstrat eliminarea emoji-urilor fallback urâte pentru subcategoriile fără asset
// - am mutat subcategoriile fără icon mai la stânga, cu o spațiere mică și curată
// - când nu există imagine, nu mai rezervăm slotul mare de icon, ci un spacer mic
// - restul flow-ului de publicare, atribute, upload și category picker rămâne neschimbat

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
  Keyboard,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../supabaseClient";
import { createItem } from "../services/itemsService";
import { ROUTES } from "../navigation/routes";
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
  isCustomOptionValue,
} from "../constants/categoryAttributes";
import { getCategoryImageByPath } from "../constants/categoryVisuals";

const STORAGE_BUCKET = "items";
const MAX_IMAGES = 6;
const MAX_LONG_SIDE = 1080;
const JPEG_QUALITY = 0.72;

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

async function normalizeToJpegWeb(uri) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error("Nu pot citi poza (fetch a eșuat).");

  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;
  const longSide = Math.max(bitmap.width, bitmap.height);

  if (longSide > MAX_LONG_SIDE) {
    const scale = MAX_LONG_SIDE / longSide;
    targetWidth = Math.round(bitmap.width * scale);
    targetHeight = Math.round(bitmap.height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Nu pot procesa poza pe web.");

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const jpegBlob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
  });

  if (!jpegBlob) throw new Error("Nu am putut converti poza în JPEG pe web.");
  return jpegBlob;
}

async function uploadImageToSupabase({ uri, userId, meta }) {
  if (!uri) throw new Error("Lipsește uri pentru upload.");
  if (!userId) throw new Error("Lipsește userId pentru upload.");

  const path = makeFilePath(userId);

  if (Platform.OS === "web") {
    const jpegBlob = await normalizeToJpegWeb(uri);

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, jpegBlob, { contentType: "image/jpeg", upsert: false });

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

export default function AddItemScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens), [tokens]);
  const onPrimaryColor = pickTok(tokens, "onPrimary", "#FFFFFF");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [categoryPath, setCategoryPath] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const [activeAttribute, setActiveAttribute] = useState(null);
  const [attributeValues, setAttributeValues] = useState({});
  const [customOptionText, setCustomOptionText] = useState("");
  const [showCustomOptionInput, setShowCustomOptionInput] = useState(false);

  const [localImages, setLocalImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canPickMore = localImages.length < MAX_IMAGES;

  const goBackSafe = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate(ROUTES.Home);
  }, [navigation]);

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
        setCategoryPickerVisible(false);
        setCategorySearch("");
        setAttributeValues({});
        return nextPath;
      }

      return nextPath;
    });
  }, []);

  const onPressSearchResult = useCallback((item) => {
    if (!item?.pathKeys?.length) return;
    setCategoryPath(item.pathKeys);
    setCategoryPickerVisible(false);
    setCategorySearch("");
    setAttributeValues({});
  }, []);

  const openAttributePicker = useCallback(
    (attribute) => {
      const currentValue = attributeValues[attribute.key] || "";
      const isKnownOption = (attribute.options || []).some(
        (o) => o.value === currentValue,
      );
      const isCustom = !!currentValue && !isKnownOption;

      setShowCustomOptionInput(isCustom);
      setCustomOptionText(isCustom ? currentValue : "");
      setActiveAttribute(attribute);
    },
    [attributeValues],
  );

  const closeAttributePicker = useCallback(() => {
    setActiveAttribute(null);
    setShowCustomOptionInput(false);
    setCustomOptionText("");
  }, []);

  const selectAttributeOption = useCallback((attributeKey, value) => {
    setAttributeValues((prev) => ({
      ...prev,
      [attributeKey]: value,
    }));
    setActiveAttribute(null);
    setShowCustomOptionInput(false);
    setCustomOptionText("");
  }, []);

  const onPressAttributeOption = useCallback(
    (attribute, option) => {
      if (isCustomOptionValue(option.value)) {
        setShowCustomOptionInput(true);
        setCustomOptionText("");
        return;
      }
      selectAttributeOption(attribute.key, option.value);
    },
    [selectAttributeOption],
  );

  const saveCustomOptionText = useCallback(() => {
    const text = customOptionText.trim();
    if (!text || !activeAttribute) return;
    selectAttributeOption(activeAttribute.key, text);
  }, [customOptionText, activeAttribute, selectAttributeOption]);

  const publish = useCallback(async () => {
    setErrorMsg("");

    if (!title.trim()) return setErrorMsg("Titlul e obligatoriu.");
    if (!description.trim()) return setErrorMsg("Descrierea e obligatorie.");
    if (normalizedPrice == null) return setErrorMsg("Preț invalid.");
    if (!categoryLabel.trim()) return setErrorMsg("Categoria e obligatorie.");
    if (localImages.length === 0) return setErrorMsg("Alege cel puțin o poză.");

    for (const attribute of dynamicAttributes) {
      if (!attributeValues[attribute.key]) {
        return setErrorMsg(`Câmp obligatoriu: ${attribute.label}.`);
      }
    }

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
        category: categoryLabel.trim(),
        category_key: categoryLeafKey || null,
        category_path: categoryPath,
        attributes: attributeValues,
        images: urls,
        user_id: userId,
      };

      const created = await createItem(payload);

      Alert.alert("Publicat", "Produsul a fost publicat cu succes.");

      setTitle("");
      setDescription("");
      setPrice("");
      setCategoryPath([]);
      setAttributeValues({});
      setLocalImages([]);

      const createdRow =
        created && typeof created === "object" ? created : null;
      const createdId = createdRow?.id != null ? String(createdRow.id) : null;
      const createdAt = Date.now();

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
  }, [
    title,
    description,
    normalizedPrice,
    categoryLabel,
    categoryLeafKey,
    categoryPath,
    dynamicAttributes,
    attributeValues,
    localImages,
    navigation,
  ]);

  const bottomSafeSpace =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 18) + 120
      : Math.max(insets.bottom, 16) + 100;

  return (
    <View style={S.screen}>
      <HeaderBackButton onPress={goBackSafe} top={insets.top + 10} />

      <ScrollView
        contentContainerStyle={[
          S.page,
          {
            paddingTop: insets.top + 10 + HEADER_BACK_SIZE + 18,
            paddingBottom: bottomSafeSpace,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <Text style={S.h1}>Adaugă un produs</Text>

        <TextInput
          value={title}
          onChangeText={(t) => setTitle(t.slice(0, 50))}
          placeholder="Titlu"
          placeholderTextColor={S.placeholder.color}
          style={S.input}
          maxLength={50}
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
            disabled={loading}
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
              const displayValue = getOptionLabel(attribute.options, value) || value;

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
            <ActivityIndicator color={onPrimaryColor} />
          ) : (
            <Text style={S.pubText}>Publică produsul</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 6 }} />
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
              const selected =
                activeAttributeValue === option.value ||
                (isCustomOptionValue(option.value) && showCustomOptionInput);

              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.88}
                  onPress={() => onPressAttributeOption(activeAttribute, option)}
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

            {showCustomOptionInput && (
              <View style={S.customOptionBox}>
                <TextInput
                  value={customOptionText}
                  onChangeText={setCustomOptionText}
                  placeholder="Scrie aici..."
                  placeholderTextColor={S.placeholder.color}
                  style={S.customOptionInput}
                  autoFocus
                  onSubmitEditing={saveCustomOptionText}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={saveCustomOptionText}
                  style={S.customOptionSaveBtn}
                  disabled={!customOptionText.trim()}
                >
                  <Text style={S.customOptionSaveText}>Salvează</Text>
                </TouchableOpacity>
              </View>
            )}
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
      backgroundColor: cardMuted,
      borderWidth: 1,
      borderColor: border,
    },

    thumb: {
      width: "100%",
      height: "100%",
    },

    removeBtn: {
      position: "absolute",
      right: 6,
      top: 6,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: dim,
      alignItems: "center",
      justifyContent: "center",
    },

    removeText: {
      color: onPrimary,
      fontSize: 18,
      fontWeight: "900",
      marginTop: -1,
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

    customOptionBox: {
      marginTop: 4,
      marginBottom: 10,
    },

    customOptionInput: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 16,
      fontWeight: "700",
      backgroundColor: card,
      color: text,
      marginBottom: 10,
    },

    customOptionSaveBtn: {
      height: 50,
      borderRadius: 16,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
    },

    customOptionSaveText: {
      color: "#FFFFFF",
      fontSize: 16,
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
