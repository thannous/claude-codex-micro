import fr from "./fr.js";
import en from "./en.js";
import es from "./es.js";
import de from "./de.js";

export const LOCALES = { fr, en, es, de };

export const LOCALE_LABELS = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
};

const STORAGE_KEY = "codex-micro-locale";
const DEFAULT_LOCALE = "en";

export function detectLocale() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch {
    // Stockage indisponible : on retombe sur la langue par défaut.
  }
  return DEFAULT_LOCALE;
}

export function saveLocale(locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignoré : la préférence ne sera simplement pas mémorisée.
  }
}

function lookup(table, parts) {
  let node = table;
  for (const part of parts) {
    if (node == null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(locale) {
  const table = LOCALES[locale] ?? fr;
  return (key, values) => {
    const parts = key.split(".");
    let text = lookup(table, parts) ?? lookup(fr, parts) ?? key;
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}
