import de from "./de.json";
import en from "./en.json";
import type { Language } from "@schenticad/shared";

const translations: Record<Language, Record<string, string>> = { de, en };

let currentLanguage: Language = "de";

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  return translations[currentLanguage]?.[key] ?? translations.de[key] ?? key;
}
