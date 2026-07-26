// CE ESTE ACEST FIȘIER / LA CE FOLOSEȘTE
// Entry point al aplicației Expo. Montează SafeAreaProvider și AppNavigator.

import React from "react";
import Constants from "expo-constants";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import "./src/services/notificationService";
import { StripeProvider } from "./src/utils/stripeCompat";
import {
  initErrorTracking,
  wrapRootComponent,
} from "./src/services/errorTracking";

// Înainte de orice randare, ca erorile de la pornire să fie prinse.
initErrorTracking();

const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.stripePublishableKey;

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <AppNavigator />
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapRootComponent(App);
