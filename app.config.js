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
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      googleWebClientId:
        "117717672138-clhr60u9gn5rh7c9apitupg747vncmo1.apps.googleusercontent.com",
      googleIosClientId:
        "117717672138-1sl37cji0mje2vuuot593fmogdvm1960.apps.googleusercontent.com",
      eas: {
        projectId: "817c1716-ab8f-40a6-8d1b-fd4aa330d5f2",
      },
    },
  },
};
