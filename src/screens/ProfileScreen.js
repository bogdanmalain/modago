/**
 * ================================
 * src/screens/ProfileScreen.js
 * ================================
 * CE ESTE:
 * -> ecranul de profil pentru varianta mobilă ModaGo
 *
 * MODIFICĂRI:
 * -> scos "Tema aplicație" din lista principală
 * -> adăugat la loc butonul "Setări"
 * -> "Setări" duce către SettingsScreen
 * -> păstrat logo-ul, layout-ul actual și restul logicii existente
 * -> Sold afișează MDL
 */

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
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";
import { fetchMyItems } from "../services/itemsService";
import { fetchFavoriteItems } from "../services/favoritesService";
import { getMyBalance } from "../services/orderService";
import { ThemeContext } from "../theme/ThemeProvider";

import logoLight from "../../assets/logo/modago-logo-light.png";
import logoDark from "../../assets/logo/modago-logo.png";

function pickTok(tokens, key, fallback) {
  const v = tokens?.[key];
  return v !== undefined && v !== null ? v : fallback;
}

function getInitials(displayName, email) {
  const source = (displayName || email || "").trim();
  if (!source) return "MG";

  if (source.includes(" ")) {
    const parts = source
      .split(" ")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }
  }

  return source.slice(0, 2).toUpperCase();
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
  showDivider = false,
  danger = false,
  S,
  iconColor,
}) {
  return (
    <>
      <TouchableOpacity style={S.menuRow} activeOpacity={0.9} onPress={onPress}>
        <View style={S.menuLeft}>
          <View style={S.menuIconWrap}>
            <Ionicons
              name={icon}
              size={22}
              color={danger ? S.__colors.danger : iconColor}
            />
          </View>

          <Text style={[S.menuText, danger && { color: S.__colors.danger }]}>
            {label}
          </Text>
        </View>

        <View style={S.menuRight}>
          {!!value && <Text style={S.menuValue}>{value}</Text>}
          <Ionicons
            name="chevron-forward"
            size={18}
            color={danger ? S.__colors.dangerSoft : S.__colors.chevron}
          />
        </View>
      </TouchableOpacity>

      {showDivider ? <View style={S.menuDivider} /> : null}
    </>
  );
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tokens, settings } = useContext(ThemeContext);

  const S = useMemo(() => makeStyles(tokens), [tokens]);

  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const user = session?.user || null;
  const userId = user?.id || null;

  const [loadingCounts, setLoadingCounts] = useState(true);
  const [myItemsCount, setMyItemsCount] = useState(null);
  const [favCount, setFavCount] = useState(null);
  const [balanceMdl, setBalanceMdl] = useState(null);

  useEffect(() => {
    let sub;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      setSessionReady(true);

      const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => {
        setSession(sess ?? null);
      });

      sub = listener?.subscription;
    })();

    return () => sub?.unsubscribe?.();
  }, []);

  const displayName = useMemo(() => {
    const metaName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      "";

    if (metaName) return metaName;

    const e = user?.email || "";
    if (!e) return "Vizitator";
    return e.split("@")[0];
  }, [user]);

  const email = user?.email || "";
  const initials = useMemo(
    () => getInitials(displayName, email),
    [displayName, email],
  );

  const loadCounts = useCallback(async () => {
    if (!sessionReady) {
      setLoadingCounts(true);
      return;
    }

    if (!userId) {
      setMyItemsCount(null);
      setFavCount(null);
      setBalanceMdl(null);
      setLoadingCounts(false);
      return;
    }

    setLoadingCounts(true);
    try {
      const [myItems, favItems, balance] = await Promise.all([
        fetchMyItems(userId),
        fetchFavoriteItems(userId),
        getMyBalance().catch((e) => {
          console.log("❌ getMyBalance error:", e);
          return null;
        }),
      ]);

      setMyItemsCount(Array.isArray(myItems) ? myItems.length : 0);
      setFavCount(Array.isArray(favItems) ? favItems.length : 0);
      setBalanceMdl(balance ? balance.available_mdl : null);
    } catch (e) {
      console.log("❌ loadCounts error:", e);
      setMyItemsCount(null);
      setFavCount(null);
      setBalanceMdl(null);
    } finally {
      setLoadingCounts(false);
    }
  }, [userId, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    loadCounts();
  }, [sessionReady, userId, loadCounts]);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts]),
  );

  const goMyItems = useCallback(() => {
    if (!sessionReady || !user) return;
    navigation.navigate(ROUTES.MyItems);
  }, [sessionReady, user, navigation]);

  const goFavorites = useCallback(() => {
    if (!sessionReady || !user) return;
    navigation.navigate(ROUTES.Favorites);
  }, [sessionReady, user, navigation]);

  const goEditProfile = useCallback(() => {
    if (!sessionReady || !user) return;
    navigation.navigate(ROUTES.EditProfile);
  }, [sessionReady, user, navigation]);

  const goBalance = useCallback(() => {
    navigation.navigate(ROUTES.Balance);
  }, [navigation]);

  const goOrders = useCallback(() => {
    navigation.navigate(ROUTES.Orders);
  }, [navigation]);

  const goVacationMode = useCallback(() => {
    navigation.navigate(ROUTES.VacationMode);
  }, [navigation]);

  const goSettings = useCallback(() => {
    navigation.navigate(ROUTES.Settings);
  }, [navigation]);

  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000),
      );
      await Promise.race([supabase.auth.signOut(), timeout]);
    } catch (e) {
      console.log("❌ logout error:", e);
      Alert.alert(
        "Eroare",
        "Nu am putut te deconecta — verifică conexiunea la internet și încearcă din nou.",
      );
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut]);

  const formatCount = (val) => (loadingCounts ? "—" : String(val ?? "—"));
  const formatBalance = (val) =>
    loadingCounts || val === null ? "—" : `${Number(val).toFixed(2)} MDL`;

  const logoSource =
    settings?.mode === "manual"
      ? settings?.manualScheme === "dark"
        ? logoDark
        : logoLight
      : tokens?.scheme === "dark"
        ? logoDark
        : logoLight;

  return (
    <ScrollView
      style={S.screen}
      contentContainerStyle={[
        S.content,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 18) + 16,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={S.phoneShell}>
        <View style={S.brandLogoOnlyWrap}>
          <Image
            source={logoSource}
            style={S.brandLogoLarge}
            resizeMode="contain"
          />
        </View>

        <View style={S.headerActions}>
          <TouchableOpacity
            style={S.closeBtn}
            activeOpacity={0.9}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }
              navigation.navigate("TabsRoot", { screen: ROUTES.Profile });
            }}
          >
            <Ionicons name="close" size={24} color={S.__colors.text} />
          </TouchableOpacity>
        </View>

        <View style={S.profileHero}>
          <View style={S.avatar}>
            <Text style={S.avatarText}>{initials}</Text>
          </View>

          <Text style={S.name}>{displayName}</Text>
          <Text style={S.email}>{email || "Nu ești logat"}</Text>

          <TouchableOpacity
            style={S.editBtn}
            activeOpacity={0.9}
            onPress={goEditProfile}
          >
            <Text style={S.editBtnText}>Editează profilul</Text>
          </TouchableOpacity>
        </View>

        <View style={S.infoPillsRow}>
          <TouchableOpacity
            style={S.infoPill}
            activeOpacity={0.9}
            onPress={goMyItems}
          >
            <Text style={S.infoPillValue}>{formatCount(myItemsCount)}</Text>
            <Text style={S.infoPillLabel}>Anunțuri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={S.infoPill}
            activeOpacity={0.9}
            onPress={goFavorites}
          >
            <Text style={S.infoPillValue}>{formatCount(favCount)}</Text>
            <Text style={S.infoPillLabel}>Favorite</Text>
          </TouchableOpacity>

          <View style={S.infoPill}>
            <Text style={S.infoPillValue}>0</Text>
            <Text style={S.infoPillLabel}>Vânzări</Text>
          </View>
        </View>

        <View style={S.menuCard}>
          <MenuRow
            icon="briefcase-outline"
            label="Anunțurile mele"
            onPress={goMyItems}
            showDivider
            S={S}
            iconColor={S.__colors.icon}
          />

          <MenuRow
            icon="heart-outline"
            label="Favorite"
            onPress={goFavorites}
            showDivider
            S={S}
            iconColor={S.__colors.icon}
          />

          <MenuRow
            icon="wallet-outline"
            label="Sold"
            value={formatBalance(balanceMdl)}
            onPress={goBalance}
            showDivider
            S={S}
            iconColor={S.__colors.icon}
          />

          <MenuRow
            icon="receipt-outline"
            label="Comenzile mele"
            onPress={goOrders}
            showDivider
            S={S}
            iconColor={S.__colors.icon}
          />

          <MenuRow
            icon="umbrella-outline"
            label="Mod Vacanță"
            onPress={goVacationMode}
            showDivider
            S={S}
            iconColor={S.__colors.icon}
          />

          <MenuRow
            icon="settings-outline"
            label="Setări"
            onPress={goSettings}
            S={S}
            iconColor={S.__colors.icon}
          />
        </View>

        <View style={S.logoutCard}>
          <MenuRow
            icon="power-outline"
            label={loggingOut ? "Se deconectează..." : "Deconectează-te"}
            onPress={loggingOut ? undefined : onLogout}
            danger
            S={S}
            iconColor={S.__colors.danger}
          />
        </View>

        <View style={S.homeIndicator} />
      </View>
    </ScrollView>
  );
}

function makeStyles(tokens) {
  const bg = pickTok(tokens, "bg", "#0B1220");
  const text = pickTok(tokens, "text", "#E5E7EB");
  const muted = pickTok(tokens, "muted", pickTok(tokens, "subtext", "#9CA3AF"));
  const border = pickTok(tokens, "border", "rgba(255,255,255,0.10)");
  const divider = pickTok(tokens, "divider", "rgba(255,255,255,0.08)");
  const primary = pickTok(
    tokens,
    "primary",
    pickTok(tokens, "accent", "#2EC4B6"),
  );
  const danger = pickTok(tokens, "danger", "#EF6A6A");
  const onPrimary = pickTok(tokens, "onPrimary", "#FFFFFF");

  const glass = pickTok(tokens, "card", "rgba(255,255,255,0.10)");
  const glassStrong = pickTok(tokens, "surfaceElevated", glass);
  const shellBorder = pickTok(tokens, "borderStrong", border);
  const chevron = pickTok(tokens, "muted", muted);
  const icon = pickTok(tokens, "text", text);

  return StyleSheet.create({
    __colors: {
      bg,
      text,
      muted,
      border,
      divider,
      primary,
      danger,
      onPrimary,
      chevron,
      icon,
      dangerSoft: danger,
      glass,
      glassStrong,
      shellBorder,
    },

    screen: {
      flex: 1,
      backgroundColor: bg,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 16,
      backgroundColor: bg,
      justifyContent: "center",
    },

    phoneShell: {
      position: "relative",
      borderRadius: 34,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 26,
      borderWidth: 1,
      borderColor: shellBorder,
      backgroundColor: glass,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },

    brandLogoOnlyWrap: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      marginBottom: 6,
    },

    brandLogoLarge: {
      width: 180,
      height: 56,
    },

    headerActions: {
      position: "absolute",
      top: 14,
      right: 14,
      zIndex: 5,
    },

    closeBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: glassStrong,
      borderWidth: 1,
      borderColor: border,
    },

    profileHero: {
      alignItems: "center",
      paddingTop: 18,
      paddingBottom: 14,
    },

    avatar: {
      width: 124,
      height: 124,
      borderRadius: 62,
      backgroundColor: primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },

    avatarText: {
      color: onPrimary,
      fontWeight: "300",
      fontSize: 44,
      letterSpacing: 1,
    },

    name: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800",
      color: text,
      textAlign: "center",
    },

    email: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: "600",
      color: muted,
      textAlign: "center",
    },

    editBtn: {
      marginTop: 16,
      minHeight: 44,
      paddingHorizontal: 22,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: glassStrong,
      borderWidth: 1,
      borderColor: border,
    },

    editBtnText: {
      color: text,
      fontSize: 15,
      fontWeight: "700",
    },

    infoPillsRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },

    infoPill: {
      flex: 1,
      minHeight: 70,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: glassStrong,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 8,
    },

    infoPillValue: {
      fontSize: 20,
      fontWeight: "900",
      color: text,
    },

    infoPillLabel: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "700",
      color: muted,
      textAlign: "center",
    },

    menuCard: {
      borderRadius: 24,
      backgroundColor: glassStrong,
      borderWidth: 1,
      borderColor: border,
      overflow: "hidden",
      marginTop: 4,
    },

    menuRow: {
      minHeight: 68,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    menuLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 0,
    },

    menuIconWrap: {
      width: 30,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    menuText: {
      flex: 1,
      fontSize: 17,
      fontWeight: "700",
      color: text,
    },

    menuRight: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 12,
    },

    menuValue: {
      fontSize: 15,
      fontWeight: "700",
      color: muted,
      marginRight: 8,
    },

    menuDivider: {
      height: 1,
      marginLeft: 58,
      backgroundColor: divider,
    },

    logoutCard: {
      marginTop: 16,
      borderRadius: 22,
      backgroundColor: glassStrong,
      borderWidth: 1,
      borderColor: border,
      overflow: "hidden",
    },

    homeIndicator: {
      width: 142,
      height: 5,
      borderRadius: 999,
      backgroundColor: muted,
      opacity: 0.55,
      alignSelf: "center",
      marginTop: 18,
    },
  });
}
