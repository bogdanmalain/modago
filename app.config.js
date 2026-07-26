import "dotenv/config";

export default {
  expo: {
    name: "ModaGo",
    slug: "ModaGo",
    scheme: "modago",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.modago.app",
      usesAppleSignIn: true,
      infoPlist: {
        UIBackgroundModes: ["fetch", "remote-notification"],
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.117717672138-1sl37cji0mje2vuuot593fmogdvm1960",
            ],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.modago.app",
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png", // ← icon.png în loc de notification-icon.png
          color: "#00BFA5",
          iosDisplayInForeground: true,
        },
      ],
      "@react-native-google-signin/google-signin",
      "expo-apple-authentication",
      // Raportare de erori. Fără SENTRY_ORG/SENTRY_PROJECT + SENTRY_AUTH_TOKEN
      // build-ul merge normal, dar stack trace-urile rămân minificate.
      "@sentry/react-native",
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      googleWebClientId:
        "117717672138-clhr60u9gn5rh7c9apitupg747vncmo1.apps.googleusercontent.com",
      googleIosClientId:
        "117717672138-1sl37cji0mje2vuuot593fmogdvm1960.apps.googleusercontent.com",
      // Gol => raportarea de erori e dezactivată, aplicația merge normal.
      sentryDsn: process.env.SENTRY_DSN ?? "",
      eas: {
        projectId: "817c1716-ab8f-40a6-8d1b-fd4aa330d5f2",
      },
    },
  },
};
