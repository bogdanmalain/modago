// ==============================
// src/theme/ThemeProvider.js
// ==============================
// Provider global pentru tema aplicației:
// - Salvează setările în AsyncStorage
// - Mode: "auto" (după telefon) / "manual" (forțat)
// - Expune: settings, scheme, tokens, setAuto, setManual, hydrateDone
// - “Auto” stabil: Appearance.getColorScheme() + listener + refresh la foreground
// - Protecții ca să nu crape dacă THEME e undefined/incomplet

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEME } from "./themeTokens";

// ==============================
// Storage + Defaults
// ==============================
const STORAGE_KEY = "modago_theme_v1";

/**
 * settings:
 * - mode: "auto" | "manual"
 * - manualScheme: "light" | "dark"
 */
const DEFAULT_SETTINGS = { mode: "auto", manualScheme: "light" };

// ==============================
// Fallback tokens (NU crapă niciodată)
// ==============================
const FALLBACK_TOKENS_LIGHT = {
  bg: "#f5f7fb",
  card: "#ffffff",
  text: "#0b1220",
  subtext: "#6b7280",
  border: "rgba(0,0,0,0.08)",
  accent: "#2563eb",
};

const FALLBACK_TOKENS_DARK = {
  bg: "#0b1220",
  card: "#131c2e",
  text: "#ffffff",
  subtext: "#9aa4b2",
  border: "rgba(255,255,255,0.08)",
  accent: "#4da3ff",
};

function normalizeScheme(s) {
  return s === "dark" ? "dark" : "light";
}

function getSafeTokens(scheme) {
  const light = THEME?.light ?? FALLBACK_TOKENS_LIGHT;
  const dark = THEME?.dark ?? FALLBACK_TOKENS_DARK;
  return scheme === "dark" ? dark : light;
}

// ==============================
// Context
// ==============================
export const ThemeContext = createContext({
  settings: DEFAULT_SETTINGS,
  scheme: "light",
  tokens: getSafeTokens("light"),
  setAuto: () => {},
  setManual: (_scheme) => {},
  hydrateDone: false,
});

// ==============================
// Provider
// ==============================
export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrateDone, setHydrateDone] = useState(false);

  // ==============================
  // 1) “Auto după telefon” – OS scheme stabil (Appearance)
  // ==============================
  const [osScheme, setOsScheme] = useState(() =>
    normalizeScheme(Appearance.getColorScheme()),
  );

  useEffect(() => {
    // Listener când schimbi tema din iOS/Android
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setOsScheme(normalizeScheme(colorScheme));
    });

    return () => {
      // compatibil RN vechi/noi
      sub?.remove?.();
    };
  }, []);

  // ==============================
  // 2) Refresh când revii în app (uneori iOS nu notifică corect în background)
  // ==============================
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setOsScheme(normalizeScheme(Appearance.getColorScheme()));
      }
    });
    return () => sub?.remove?.();
  }, []);

  // ==============================
  // 3) Hydrate din storage
  // ==============================
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;

        if (raw) {
          const parsed = JSON.parse(raw);
          const safe = {
            mode: parsed?.mode === "manual" ? "manual" : "auto",
            manualScheme: parsed?.manualScheme === "dark" ? "dark" : "light",
          };
          setSettings(safe);
        }
      } catch (e) {
        // ignore – rămânem pe defaults
      } finally {
        if (mounted) setHydrateDone(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ==============================
  // 4) Persist helper
  // ==============================
  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  }, []);

  // ==============================
  // 5) Setters
  // ==============================
  const setAuto = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, mode: "auto" };
      persist(next);
      return next;
    });
  }, [persist]);

  const setManual = useCallback(
    (scheme) => {
      const next = {
        mode: "manual",
        manualScheme: scheme === "dark" ? "dark" : "light",
      };
      setSettings(next);
      persist(next);
    },
    [persist],
  );

  // ==============================
  // 6) Scheme + Tokens
  // ==============================
  const scheme = settings.mode === "auto" ? osScheme : settings.manualScheme;
  const tokens = useMemo(() => getSafeTokens(scheme), [scheme]);

  // ==============================
  // 7) Context value
  // ==============================
  const value = useMemo(
    () => ({
      settings,
      scheme,
      tokens,
      setAuto,
      setManual,
      hydrateDone,
    }),
    [settings, scheme, tokens, setAuto, setManual, hydrateDone],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
