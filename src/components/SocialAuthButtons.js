import React, { useContext, useState } from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";

import AppButton from "./AppButton";
import { ThemeContext } from "../theme/ThemeProvider";
import {
  signInWithGoogle,
  signInWithApple,
  isGoogleSignInSupported,
  isAppleSignInSupported,
} from "../services/socialAuthService";

/**
 * Butoane "Continuă cu Google" / "Continuă cu Apple".
 * Navigarea către app se face automat via onAuthStateChange din AppNavigator,
 * deci aici doar declanșăm login-ul și afișăm erorile.
 */
export default function SocialAuthButtons({ disabled }) {
  const { tokens } = useContext(ThemeContext);
  const [loadingProvider, setLoadingProvider] = useState(null);

  const notify = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleGoogle = async () => {
    try {
      setLoadingProvider("google");
      const result = await signInWithGoogle();
      if (result.canceled) return;
    } catch (err) {
      notify("Eroare Google", err?.message || "A apărut o eroare.");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    try {
      setLoadingProvider("apple");
      const result = await signInWithApple();
      if (result.canceled) return;
    } catch (err) {
      notify("Eroare Apple", err?.message || "A apărut o eroare.");
    } finally {
      setLoadingProvider(null);
    }
  };

  const googleSupported = isGoogleSignInSupported();
  const appleSupported = isAppleSignInSupported();

  if (!googleSupported && !appleSupported) return null;

  return (
    <View style={styles.wrap}>
      {googleSupported && (
        <AppButton
          title="Continuă cu Google"
          onPress={handleGoogle}
          loading={loadingProvider === "google"}
          disabled={disabled || !!loadingProvider}
          variant="outline"
          height={52}
          radius={14}
        />
      )}

      {appleSupported && (
        <AppButton
          title="Continuă cu Apple"
          onPress={handleApple}
          loading={loadingProvider === "apple"}
          disabled={disabled || !!loadingProvider}
          variant="outline"
          height={52}
          radius={14}
          style={{ marginTop: 10 }}
          textStyle={{ color: tokens.text }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
  },
});
