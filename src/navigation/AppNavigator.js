// src/navigation/AppNavigator.js

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";

import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Linking from "expo-linking";

import { ROUTES } from "./routes";
import { supabase } from "../supabaseClient";

import FloatingTabBar from "../components/FloatingTabBar";

// Screens – Tabs
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import AddItemScreen from "../screens/AddItemScreen";
import InboxScreen from "../screens/InboxScreen";
import ProfileScreen from "../screens/ProfileScreen";

// Screens – Stack
import ItemDetailsScreen from "../screens/ItemDetailsScreen";
import EditItemScreen from "../screens/EditItemScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";
import ChatScreen from "../screens/ChatScreen";

// Screens – Escrow
import CheckoutScreen from "../screens/CheckoutScreen";
import ShippingAddressesScreen from "../screens/ShippingAddressesScreen";
import OrderStatusScreen from "../screens/OrderStatusScreen";
import DisputeScreen from "../screens/DisputeScreen";
import AdminDisputesScreen from "../screens/AdminDisputesScreen";
import AdminDisputeDetailScreen from "../screens/AdminDisputeDetailScreen";

// Screens – Auth
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";

// Screens – Profile
import MyItemsScreen from "../screens/MyItemsScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ThemeSettingsScreen from "../screens/ThemeSettingsScreen";
import SecurityScreen from "../screens/SecurityScreen";
import LegalDocumentScreen from "../screens/LegalDocumentScreen";
import LegalIndexScreen from "../screens/LegalIndexScreen";
import { setErrorTrackingUser } from "../services/errorTracking";
import BalanceScreen from "../screens/BalanceScreen";
import OrdersScreen from "../screens/OrdersScreen";
import VacationModeScreen from "../screens/VacationModeScreen";

// Theme + Unread + Push
import { ThemeProvider, ThemeContext } from "../theme/ThemeProvider";
import { UnreadProvider } from "../context/UnreadContext";
import { OrderNotificationsProvider } from "../context/OrderNotificationsContext";
import NotificationBanner from "../components/NotificationBanner";
import { setupPushNotifications } from "../services/notificationService";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function getActiveRouteName(state) {
  if (!state) return null;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

function MobileTabs() {
  const { tokens } = useContext(ThemeContext);
  const bg = tokens?.bg ?? "#0B1220";

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => null,
        tabBarHideOnKeyboard: true,
        sceneContainerStyle: { backgroundColor: bg },
      }}
    >
      <Tab.Screen name={ROUTES.Home} component={HomeScreen} />
      <Tab.Screen name={ROUTES.Search} component={SearchScreen} />
      <Tab.Screen name={ROUTES.AddItem} component={AddItemScreen} />
      <Tab.Screen name={ROUTES.Inbox} component={InboxScreen} />
      <Tab.Screen name={ROUTES.Profile} component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MobileRootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="TabsRoot" component={MobileTabs} />

      {/* ── Produs ── */}
      <Stack.Screen name={ROUTES.ItemDetails} component={ItemDetailsScreen} />
      <Stack.Screen name={ROUTES.EditItem} component={EditItemScreen} />

      {/* ── Profil ── */}
      <Stack.Screen name={ROUTES.EditProfile} component={EditProfileScreen} />
      <Stack.Screen name={ROUTES.MyItems} component={MyItemsScreen} />
      <Stack.Screen name={ROUTES.Favorites} component={FavoritesScreen} />
      <Stack.Screen name={ROUTES.Settings} component={SettingsScreen} />
      <Stack.Screen
        name={ROUTES.ThemeSettings}
        component={ThemeSettingsScreen}
      />
      <Stack.Screen name={ROUTES.Security} component={SecurityScreen} />
      <Stack.Screen name={ROUTES.Legal} component={LegalIndexScreen} />
      <Stack.Screen
        name={ROUTES.LegalDocument}
        component={LegalDocumentScreen}
      />
      <Stack.Screen name={ROUTES.Balance} component={BalanceScreen} />
      <Stack.Screen name={ROUTES.Orders} component={OrdersScreen} />
      <Stack.Screen name={ROUTES.VacationMode} component={VacationModeScreen} />

      {/* ── Chat ── */}
      <Stack.Screen name={ROUTES.Chat} component={ChatScreen} />

      {/* ── Escrow / Checkout ── */}
      <Stack.Screen name={ROUTES.Checkout} component={CheckoutScreen} />
      <Stack.Screen
        name={ROUTES.ShippingAddresses}
        component={ShippingAddressesScreen}
      />
      <Stack.Screen name={ROUTES.OrderStatus} component={OrderStatusScreen} />
      <Stack.Screen name={ROUTES.Dispute} component={DisputeScreen} />
      <Stack.Screen name={ROUTES.AdminDisputes} component={AdminDisputesScreen} />
      <Stack.Screen name={ROUTES.AdminDisputeDetail} component={AdminDisputeDetailScreen} />

      {/* ── Image viewer ── */}
      <Stack.Screen
        name={ROUTES.ImageViewer}
        component={ImageViewerScreen}
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack.Navigator>
  );
}

function AuthStack({ initialRouteName }) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName || ROUTES.Welcome}
    >
      <Stack.Screen name={ROUTES.Welcome} component={WelcomeScreen} />
      <Stack.Screen name={ROUTES.Login} component={LoginScreen} />
      <Stack.Screen name={ROUTES.Register} component={RegisterScreen} />
      <Stack.Screen
        name={ROUTES.ForgotPassword}
        component={ForgotPasswordScreen}
      />
      <Stack.Screen
        name={ROUTES.ResetPassword}
        component={ResetPasswordScreen}
      />
      {/* Necesar aici: ecranul de înregistrare trimite spre Termeni și
          Confidențialitate înainte ca utilizatorul să aibă cont. */}
      <Stack.Screen
        name={ROUTES.LegalDocument}
        component={LegalDocumentScreen}
      />
    </Stack.Navigator>
  );
}

// Link-ul din emailul de resetare (modago://reset-password#access_token=...)
// trebuie să forțeze ecranul de resetare chiar dacă tokenurile din URL creează
// o sesiune — altfel comutarea automată pe stack-ul logat demontează ecranul
// înainte ca utilizatorul să apuce să-și schimbe parola.
function isPasswordRecoveryUrl(url) {
  if (!url) return false;
  return url.includes("reset-password") || url.includes("type=recovery");
}

export default function AppNavigator() {
  const navRef = useNavigationContainerRef();

  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const currentRouteNameRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data?.session ?? null);
        setSessionReady(true);
      } catch {
        if (!mounted) return;
        setSession(null);
        setSessionReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession ?? null);
        setErrorTrackingUser(newSession?.user?.id ?? null);
        if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
        if (event === "SIGNED_OUT") setPasswordRecovery(false);
      },
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    Linking.getInitialURL().then((url) => {
      if (mounted && isPasswordRecoveryUrl(url)) setPasswordRecovery(true);
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      if (isPasswordRecoveryUrl(url)) setPasswordRecovery(true);
    });

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      setupPushNotifications(session.user.id);
    }
  }, [session?.user?.id]);

  const handleNavStateChange = useCallback(() => {
    const state = navRef.getRootState();
    currentRouteNameRef.current = getActiveRouteName(state);
  }, [navRef]);

  const AppTree = useMemo(() => {
    if (!sessionReady) return null;
    // Cheile diferite sunt obligatorii: fără ele React vede același tip de
    // component, păstrează navigatorul montat și ignoră initialRouteName —
    // adică link-ul de resetare din email ajunge în aplicație, dar ecranul
    // rămâne pe Welcome.
    if (passwordRecovery)
      return (
        <AuthStack key="recovery" initialRouteName={ROUTES.ResetPassword} />
      );
    if (!session) return <AuthStack key="auth" />;
    return <MobileRootStack />;
  }, [sessionReady, session, passwordRecovery]);

  return (
    <ThemeProvider>
      <UnreadProvider>
        <OrderNotificationsProvider>
          <NavigationContainer
            ref={navRef}
            onReady={handleNavStateChange}
            onStateChange={handleNavStateChange}
          >
            {AppTree}
          </NavigationContainer>
          <NotificationBanner navRef={navRef} />
        </OrderNotificationsProvider>
      </UnreadProvider>
    </ThemeProvider>
  );
}
