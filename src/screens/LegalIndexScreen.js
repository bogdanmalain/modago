// src/screens/LegalIndexScreen.js
//
// Lista documentelor legale — o singura intrare "Informatii juridice" in
// Setari deschide ecranul asta, in loc sa umple meniul cu trei randuri.
// Continutul vine din src/constants/legal.js.

import React, { useCallback, useContext, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import HeaderBackButton, {
  HEADER_BACK_SIZE,
} from "../components/HeaderBackButton";
import { ThemeContext } from "../theme/ThemeProvider";
import { ROUTES } from "../navigation/routes";
import { LEGAL_DOCUMENT_LIST, LEGAL_DRAFT } from "../constants/legal";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

const FLOATING_TABBAR_SAFE_SPACE = 110;

const DOC_ICONS = {
  terms: "document-text-outline",
  privacy: "lock-closed-outline",
  returns: "refresh-outline",
};

export default function LegalIndexScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  const onBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.Settings);
  }, [navigation]);

  const openDoc = useCallback(
    (documentId) => {
      navigation.navigate(ROUTES.LegalDocument, { documentId });
    },
    [navigation],
  );

  return (
    <View style={S.screen}>
      <HeaderBackButton onPress={onBack} top={insets.top + 10} />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={S.title}>Informații juridice</Text>
        <Text style={S.subtitle}>
          Documentele care reglementează utilizarea ModaGo.
        </Text>

        <View style={S.card}>
          {LEGAL_DOCUMENT_LIST.map((doc, i) => (
            <React.Fragment key={doc.id}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openDoc(doc.id)}
                style={S.row}
              >
                <View style={S.rowLeft}>
                  <View style={S.rowIconWrap}>
                    <Ionicons
                      name={DOC_ICONS[doc.id] || "document-outline"}
                      size={21}
                      color={S.__colors.icon}
                    />
                  </View>
                  <View style={S.rowTextWrap}>
                    <Text style={S.rowTitle}>{doc.title}</Text>
                    <Text style={S.rowMeta}>
                      Versiunea {doc.version} · {doc.updatedAt}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={S.__colors.chevron}
                />
              </TouchableOpacity>

              {i < LEGAL_DOCUMENT_LIST.length - 1 ? (
                <View style={S.divider} />
              ) : null}
            </React.Fragment>
          ))}
        </View>

        {LEGAL_DRAFT && (
          <Text style={S.note}>
            Documentele sunt în lucru și nu au fost încă validate juridic.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(tokens, insets) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const divider = pickTok(tokens, "divider", border);
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));
  const shadowColor = pickTok(tokens, "shadowColor", "#000");

  const topPad = insets.top + 10 + HEADER_BACK_SIZE + 20;

  return StyleSheet.create({
    __colors: { icon: text, chevron: muted },

    screen: { flex: 1, backgroundColor: bg },
    scroll: { flex: 1, backgroundColor: bg },

    content: {
      paddingTop: topPad,
      paddingBottom: Math.max(insets.bottom, 16) + FLOATING_TABBAR_SAFE_SPACE,
      paddingHorizontal: 16,
    },

    title: {
      fontSize: 28,
      fontWeight: "900",
      color: text,
      paddingHorizontal: 2,
    },

    subtitle: {
      marginTop: 6,
      marginBottom: 18,
      fontSize: 14,
      fontWeight: "600",
      color: muted,
      paddingHorizontal: 2,
    },

    card: {
      backgroundColor: card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: border,
      overflow: "hidden",
      shadowColor,
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },

    row: {
      minHeight: 68,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 0,
    },

    rowIconWrap: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    rowTextWrap: { flex: 1, minWidth: 0 },

    rowTitle: { fontSize: 16, fontWeight: "800", color: text },

    rowMeta: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "600",
      color: muted,
    },

    divider: { height: 1, marginLeft: 56, backgroundColor: divider },

    note: {
      marginTop: 14,
      paddingHorizontal: 4,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "600",
      color: muted,
    },
  });
}
