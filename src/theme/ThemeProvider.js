// src/theme/ThemeProvider.js
// Provider global pentru tema aplicației (Auto/Manual) + hydrate din AsyncStorage.
// Fix: nu mai avem "flash" pe light — putem folosi hydrateDone în AppNavigator (ThemeGate).

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEME } from "./themeTokens";

const STORAGE_KEY = "modago_theme_v1";

const DEFAULT_SETTINGS = { mode: "auto", manualScheme: "light" };

const FALLBACK_TOKENS_LIGHT = {
  bg: "#f5f7fb",
  card: "#ffffff",
  text: "#0b1220",
  subtext: "#6b7280",
  muted: "#6b7280",
  border: "rgba(0,0,0,0.08)",
  primary: "#2563eb",
  accent: "#2563eb",
  danger: "#ef4444",
  shadowColor: "#000",
};

const FALLBACK_TOKENS_DARK = {
  bg: "#0b1220",
  card: "#131c2e",
  text: "#ffffff",
  subtext: "#9aa4b2",
  muted: "#9aa4b2",
  border: "rgba(255,255,255,0.08)",
  primary: "#4da3ff",
  accent: "#4da3ff",
  danger: "#f87171",
  shadowColor: "#000",
};

function normalizeScheme(s) {
  return s === "dark" ? "dark" : "light";
}

function getSafeTokens(scheme) {
  const light = THEME?.light ?? FALLBACK_TOKENS_LIGHT;
  const dark = THEME?.dark ?? FALLBACK_TOKENS_DARK;
  return scheme === "dark" ? dark : light;
}

export const ThemeContext = createContext({
  settings: DEFAULT_SETTINGS,
  scheme: "light",
  tokens: getSafeTokens("light"),
  setAuto: () => {},
  setManual: (_scheme) => {},
  hydrateDone: false,
  forceRefreshSystem: () => {},
  debug: null,
});

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrateDone, setHydrateDone] = useState(false);

  const hookScheme = useColorScheme(); // "light" | "dark" | null

  const readSystemScheme = useCallback(() => {
    const appearance = Appearance.getColorScheme(); // "light" | "dark" | null
    const best = hookScheme ?? appearance;
    return normalizeScheme(best);
  }, [hookScheme]);

  const [osScheme, setOsScheme] = useState(() => readSystemScheme());

  useEffect(() => {
    setOsScheme(readSystemScheme());
  }, [readSystemScheme]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setOsScheme(normalizeScheme(colorScheme));
    });
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setOsScheme(readSystemScheme());
    });
    return () => sub?.remove?.();
  }, [readSystemScheme]);

  const forceRefreshSystem = useCallback(() => {
    setOsScheme(readSystemScheme());
  }, [readSystemScheme]);

  // Hydrate
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
        // ignore
      } finally {
        if (mounted) setHydrateDone(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  }, []);

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

  const scheme = settings.mode === "auto" ? osScheme : settings.manualScheme;
  const tokens = useMemo(() => getSafeTokens(scheme), [scheme]);

  const debug = useMemo(() => {
    if (!__DEV__) return null;
    return {
      hookScheme: hookScheme ?? "null",
      appearanceScheme: Appearance.getColorScheme() ?? "null",
      osScheme,
      mode: settings?.mode,
      manualScheme: settings?.manualScheme,
      appliedScheme: scheme,
      hydrateDone,
    };
  }, [hookScheme, osScheme, settings, scheme, hydrateDone]);

  const value = useMemo(
    () => ({
      settings,
      scheme,
      tokens,
      setAuto,
      setManual,
      hydrateDone,
      forceRefreshSystem,
      debug,
    }),
    [
      settings,
      scheme,
      tokens,
      setAuto,
      setManual,
      hydrateDone,
      forceRefreshSystem,
      debug,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
