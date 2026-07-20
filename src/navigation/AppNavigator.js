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
import BalanceScreen from "../screens/BalanceScreen";
import OrdersScreen from "../screens/OrdersScreen";
import VacationModeScreen from "../screens/VacationModeScreen";

// Theme + Unread + Push
import { ThemeProvider, ThemeContext } from "../theme/ThemeProvider";
import { UnreadProvider } from "../context/UnreadContext";
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

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const navRef = useNavigationContainerRef();

  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

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
      (_event, newSession) => setSession(newSession ?? null),
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
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
    if (!session) return <AuthStack />;
    return <MobileRootStack />;
  }, [sessionReady, session]);

  return (
    <ThemeProvider>
      <UnreadProvider>
        <NavigationContainer
          ref={navRef}
          onReady={handleNavStateChange}
          onStateChange={handleNavStateChange}
        >
          {AppTree}
        </NavigationContainer>
      </UnreadProvider>
    </ThemeProvider>
  );
}
