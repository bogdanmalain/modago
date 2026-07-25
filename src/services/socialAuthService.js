import { Platform } from "react-native";
import Constants from "expo-constants";

import { supabase } from "../supabaseClient";

// Expo Go nu poate încărca module native terțe (google-signin, apple-authentication).
// Importurile trebuie făcute lazy (require, nu import static) ca să nu crape toată
// aplicația la boot când rulează în Expo Go — doar funcțiile astea devin indisponibile.
const isExpoGo = Constants.appOwnership === "expo";

let GoogleSigninModule = null;
let AppleAuthenticationModule = null;

if (!isExpoGo) {
  try {
    GoogleSigninModule = require("@react-native-google-signin/google-signin");
  } catch {
    GoogleSigninModule = null;
  }

  try {
    AppleAuthenticationModule = require("expo-apple-authentication");
  } catch {
    AppleAuthenticationModule = null;
  }
}

const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId;
const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId;

export function isGoogleSignInSupported() {
  return !!GoogleSigninModule;
}

export function isAppleSignInSupported() {
  return Platform.OS === "ios" && !!AppleAuthenticationModule;
}

export function isSocialAuthAvailable() {
  return isGoogleSignInSupported() || isAppleSignInSupported();
}

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSigninModule.GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

/**
 * Returns { canceled: true } if the user backed out, otherwise throws.
 */
export async function signInWithGoogle() {
  if (!GoogleSigninModule) {
    throw new Error(
      "Login-ul cu Google nu e disponibil în Expo Go. Folosește build-ul de dezvoltare.",
    );
  }

  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    GoogleSigninModule;

  ensureGoogleConfigured();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return { canceled: true };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error("Google nu a returnat un token valid.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) throw error;
    return { canceled: false, session: data.session };
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      return { canceled: true };
    }
    throw err;
  }
}

/**
 * Returns { canceled: true } if the user backed out, otherwise throws.
 */
export async function signInWithApple() {
  if (!AppleAuthenticationModule) {
    throw new Error(
      "Login-ul cu Apple nu e disponibil în Expo Go. Folosește build-ul de dezvoltare.",
    );
  }

  const AppleAuthentication = AppleAuthenticationModule;

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple nu a returnat un token valid.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error) throw error;
    return { canceled: false, session: data.session };
  } catch (err) {
    if (err?.code === "ERR_REQUEST_CANCELED") {
      return { canceled: true };
    }
    throw err;
  }
}
