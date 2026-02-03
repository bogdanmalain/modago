// src/screens/AuthLoadingScreen.js
import React, { useEffect } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { supabase } from "../supabaseClient";
import { ROUTES } from "../navigation/routes";

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;

        if (!isMounted) return;

        // WEB: intră direct în Home (ca Vinted web)
        if (Platform.OS === "web") {
          navigation.replace(ROUTES.Home);
          return;
        }

        // MOBIL: dacă nu e logat -> Welcome; dacă e logat -> Home
        if (!session) navigation.replace(ROUTES.Welcome);
        else navigation.replace(ROUTES.Home);
      } catch (e) {
        // fallback safe
        if (Platform.OS === "web") navigation.replace(ROUTES.Home);
        else navigation.replace(ROUTES.Welcome);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
