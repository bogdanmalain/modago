// CE ESTE ACEST FIȘIER / LA CE FOLOSEȘTE
// Entry point al aplicației Expo. Montează SafeAreaProvider și AppNavigator.

import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
