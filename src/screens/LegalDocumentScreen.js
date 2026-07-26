// src/screens/LegalDocumentScreen.js
//
// Afiseaza un document legal (termeni / confidentialitate / retur).
// Continutul vine din src/constants/legal.js, care e sursa unica si pentru
// paginile HTML publice cerute de Google Play.

import React, { useCallback, useContext, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import HeaderBackButton, {
  HEADER_BACK_SIZE,
} from "../components/HeaderBackButton";
import { ThemeContext } from "../theme/ThemeProvider";
import { getLegalDocument, LEGAL_DRAFT } from "../constants/legal";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

const FLOATING_TABBAR_SAFE_SPACE = 110;

function Section({ section, S }) {
  return (
    <View style={S.section}>
      <Text style={S.heading}>{section.heading}</Text>

      {(section.body || []).map((paragraph, i) => (
        <Text key={`b${i}`} style={S.paragraph}>
          {paragraph}
        </Text>
      ))}

      {(section.bullets || []).map((bullet, i) => (
        <View key={`l${i}`} style={S.bulletRow}>
          <Text style={S.bulletDot}>•</Text>
          <Text style={S.bulletText}>{bullet}</Text>
        </View>
      ))}

      {(section.after || []).map((paragraph, i) => (
        <Text key={`a${i}`} style={S.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

export default function LegalDocumentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { tokens } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  const docId = route?.params?.documentId || "terms";
  const doc = getLegalDocument(docId);

  const onBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  if (!doc) {
    return (
      <View style={S.screen}>
        <HeaderBackButton onPress={onBack} top={insets.top + 10} />
        <View style={S.content}>
          <Text style={S.title}>Document indisponibil</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={S.screen}>
      <HeaderBackButton onPress={onBack} top={insets.top + 10} />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={S.title}>{doc.title}</Text>
        <Text style={S.meta}>
          Versiunea {doc.version} · actualizat {doc.updatedAt}
        </Text>

        {LEGAL_DRAFT && (
          <View style={S.draftBox}>
            <Text style={S.draftText}>
              Document în lucru. Textul reflectă modul actual de funcționare al
              aplicației, dar nu a fost încă validat juridic.
            </Text>
          </View>
        )}

        {!!doc.intro && <Text style={S.intro}>{doc.intro}</Text>}

        {doc.sections.map((section, i) => (
          <Section key={i} section={section} S={S} />
        ))}

        <View style={S.footerSpace} />
      </ScrollView>
    </View>
  );
}

function makeStyles(tokens, insets) {
  const bg = pickTok(tokens, "bg", "#F3F4F6");
  const card = pickTok(tokens, "card", "#FFFFFF");
  const border = pickTok(tokens, "border", "rgba(0,0,0,0.08)");
  const text = pickTok(tokens, "text", "#111827");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#6B7280"));

  const topPad = insets.top + 10 + HEADER_BACK_SIZE + 20;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },
    scroll: { flex: 1, backgroundColor: bg },

    content: {
      paddingTop: topPad,
      paddingBottom: Math.max(insets.bottom, 16) + FLOATING_TABBAR_SAFE_SPACE,
      paddingHorizontal: 20,
    },

    title: {
      fontSize: 27,
      fontWeight: "900",
      color: text,
      marginBottom: 6,
    },

    meta: {
      fontSize: 13,
      fontWeight: "700",
      color: muted,
      marginBottom: 16,
    },

    draftBox: {
      backgroundColor: "rgba(253, 186, 116, 0.14)",
      borderColor: "rgba(253, 186, 116, 0.55)",
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },

    draftText: {
      color: text,
      fontWeight: "700",
      fontSize: 13,
      lineHeight: 19,
    },

    intro: {
      fontSize: 15,
      lineHeight: 23,
      color: text,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
    },

    section: { marginTop: 22 },

    heading: {
      fontSize: 17,
      fontWeight: "900",
      color: text,
      marginBottom: 8,
    },

    paragraph: {
      fontSize: 15,
      lineHeight: 23,
      color: muted,
      marginBottom: 10,
    },

    bulletRow: {
      flexDirection: "row",
      marginBottom: 8,
      paddingRight: 4,
    },

    bulletDot: {
      fontSize: 15,
      lineHeight: 23,
      color: muted,
      width: 16,
    },

    bulletText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 23,
      color: muted,
    },

    footerSpace: { height: 20 },
  });
}
