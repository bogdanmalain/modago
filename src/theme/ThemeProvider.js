// src/theme/ThemeProvider.js
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEME } from "./themeTokens";

const STORAGE_KEY = "modago_theme_v1";

/**
 * settings:
 * - mode: "auto" | "manual"
 * - manualScheme: "light" | "dark"
 */
const DEFAULT_SETTINGS = { mode: "auto", manualScheme: "light" };

export const ThemeContext = createContext({
  settings: DEFAULT_SETTINGS,
  scheme: "light", // "light" | "dark" efectiv aplicat
  tokens: THEME.light, // tokeni actuali
  setAuto: () => {},
  setManual: (_scheme) => {},
  hydrateDone: false,
});

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrateDone, setHydrateDone] = useState(false);

  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() === "dark" ? "dark" : "light",
  );

  // ascultă schimbarea de sistem (doar dacă user e pe Auto, dar noi îl ținem oricum la zi)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub?.remove?.();
  }, []);

  // hydrate din storage
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

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  }, []);

  const setAuto = useCallback(() => {
    const next = { ...settings, mode: "auto" };
    setSettings(next);
    persist(next);
  }, [settings, persist]);

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

  const scheme =
    settings.mode === "auto" ? systemScheme : settings.manualScheme;
  const tokens = scheme === "dark" ? THEME.dark : THEME.light;

  const value = useMemo(
    () => ({ settings, scheme, tokens, setAuto, setManual, hydrateDone }),
    [settings, scheme, tokens, setAuto, setManual, hydrateDone],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
