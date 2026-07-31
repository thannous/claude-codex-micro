import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "codex-micro-theme";
export const THEME_ORDER = Object.freeze(["auto", "light", "dark"]);

export function detectTheme(storage) {
  try {
    const target = storage ?? globalThis.window?.localStorage;
    const saved = target?.getItem(THEME_STORAGE_KEY);
    return THEME_ORDER.includes(saved) ? saved : "auto";
  } catch {
    return "auto";
  }
}

export function nextTheme(theme) {
  const index = THEME_ORDER.indexOf(theme);
  if (index < 0) return THEME_ORDER[0];
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}

export function saveTheme(theme, storage) {
  try {
    const target = storage ?? globalThis.window?.localStorage;
    target?.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(detectTheme);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const prefersDark = media?.matches ?? false;
      document.documentElement.dataset.theme =
        theme === "auto" ? (prefersDark ? "dark" : "light") : theme;
    };

    apply();
    saveTheme(theme);

    if (theme !== "auto" || !media?.addEventListener) return undefined;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((current) => nextTheme(current));
  }, []);

  return { theme, cycleTheme };
}
