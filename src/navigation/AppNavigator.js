// src/navigation/AppNavigator.js
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { Platform } from "react-native";

import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { ROUTES } from "./routes";
import { supabase } from "../supabaseClient";

// (WEB) Header sus – doar web
import Header from "../components/Header.web";

// Floating tabbar (MOBILE)
import FloatingTabBar from "../components/FloatingTabBar";

// Screens
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import AddItemScreen from "../screens/AddItemScreen";
import InboxScreen from "../screens/InboxScreen";
import ProfileScreen from "../screens/ProfileScreen";

import ItemDetailsScreen from "../screens/ItemDetailsScreen";
import EditItemScreen from "../screens/EditItemScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";

import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";

import MyItemsScreen from "../screens/MyItemsScreen";
import FavoritesScreen from "../screens/FavoritesScreen";

import ThemeSettingsScreen from "../screens/ThemeSettingsScreen";

// Theme provider
import { ThemeProvider, ThemeContext } from "../theme/ThemeProvider";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function getActiveRouteName(state) {
  if (!state) return null;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

const HIDDEN_TABBAR_ROUTES = new Set([
  ROUTES.ItemDetails,
  ROUTES.EditItem,
  ROUTES.Favorites,
  ROUTES.ThemeSettings,
]);

/**
 * MOBILE: Tabs = navigator principal
 * ImageViewer NU e aici — e modal în MobileRootStack
 */
function MobileTabs() {
  const { tokens } = useContext(ThemeContext);
  const bg = tokens?.bg ?? "#0B1220";

  return (
    <Tab.Navigator
      tabBar={(props) => {
        const activeRoute = props?.state?.routes?.[props?.state?.index]?.name;
        if (HIDDEN_TABBAR_ROUTES.has(activeRoute)) return null;
        return <FloatingTabBar {...props} />;
      }}
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

      {/* Hidden from tab buttons + hidden tabbar when active */}
      <Tab.Screen
        name={ROUTES.ItemDetails}
        component={ItemDetailsScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name={ROUTES.EditItem}
        component={EditItemScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name={ROUTES.MyItems}
        component={MyItemsScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name={ROUTES.Favorites}
        component={FavoritesScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name={ROUTES.ThemeSettings}
        component={ThemeSettingsScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

/**
 * MOBILE ROOT: Tabs + ImageViewer ca MODAL
 */
function MobileRootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TabsRoot" component={MobileTabs} />

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

function WebStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: () => <Header />,
        contentStyle: { backgroundColor: "#f5f7fb" },
      }}
    >
      <Stack.Screen name={ROUTES.Home} component={HomeScreen} />
      <Stack.Screen name={ROUTES.Search} component={SearchScreen} />
      <Stack.Screen name={ROUTES.AddItem} component={AddItemScreen} />
      <Stack.Screen name={ROUTES.ItemDetails} component={ItemDetailsScreen} />
      <Stack.Screen name={ROUTES.EditItem} component={EditItemScreen} />
      <Stack.Screen name={ROUTES.MyItems} component={MyItemsScreen} />
      <Stack.Screen name={ROUTES.Favorites} component={FavoritesScreen} />
      <Stack.Screen name={ROUTES.Profile} component={ProfileScreen} />
      <Stack.Screen
        name={ROUTES.ThemeSettings}
        component={ThemeSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name={ROUTES.ImageViewer} component={ImageViewerScreen} />
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

  const isWeb = Platform.OS === "web";

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data?.session ?? null);
        setSessionReady(true);
      } catch (e) {
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

  const handleNavStateChange = useCallback(() => {
    const state = navRef.getRootState();
    const name = getActiveRouteName(state);
    currentRouteNameRef.current = name;
  }, [navRef]);

  const AppTree = useMemo(() => {
    if (!sessionReady) return null;
    if (!session) return <AuthStack />;
    return isWeb ? <WebStack /> : <MobileRootStack />;
  }, [sessionReady, session, isWeb]);

  return (
    <ThemeProvider>
      <NavigationContainer
        ref={navRef}
        onReady={handleNavStateChange}
        onStateChange={handleNavStateChange}
      >
        {AppTree}
      </NavigationContainer>
    </ThemeProvider>
  );
}
