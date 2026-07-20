// src/utils/env.js
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Stripe (@stripe/stripe-react-native) are cod nativ: nu rulează în Expo Go
// (fără dev build) și nu are implementare web. Folosim asta ca să comutăm
// între Stripe real (dev build / build de producție iOS/Android) și un
// mock local (Expo Go, web).
export const USE_STRIPE_MOCK = IS_EXPO_GO || Platform.OS === "web";
