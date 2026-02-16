// src/theme/themeTokens.js

// ✅ Culoarea oficială ModaGo (teal din logo / Welcome)
export const MODAGO_BRAND = "#3fa9b5";

export const THEME = {
  light: {
    scheme: "light",

    bg: "#F3F4F6",
    card: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280",

    border: "rgba(0,0,0,0.08)",
    divider: "rgba(0,0,0,0.06)",

    // ✅ Brand
    primary: MODAGO_BRAND,
    accent: MODAGO_BRAND,
    onPrimary: "#FFFFFF",
    primarySoft: "rgba(63, 169, 181, 0.14)",

    danger: "#EF4444",

    shadowColor: "#000",

    // opționale folosite în UI
    mediaBg: "rgba(0,0,0,0.25)",
    fabBg: "rgba(255,255,255,0.92)",
  },

  dark: {
    scheme: "dark",

    bg: "#0B1220",
    card: "#111A2E",
    text: "#E5E7EB",
    muted: "#9CA3AF",

    border: "rgba(255,255,255,0.10)",
    divider: "rgba(255,255,255,0.08)",

    // ✅ Brand
    primary: MODAGO_BRAND,
    accent: MODAGO_BRAND,
    onPrimary: "#FFFFFF",
    primarySoft: "rgba(63, 169, 181, 0.18)",

    danger: "#F87171",

    shadowColor: "#000",

    // opționale folosite în UI
    mediaBg: "rgba(0,0,0,0.35)",
    fabBg: "rgba(255,255,255,0.12)",
  },
};
