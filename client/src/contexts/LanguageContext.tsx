import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

import enTranslations from "@/locales/en.json";
import esTranslations from "@/locales/es.json";
import zhTranslations from "@/locales/zh.json";
import arTranslations from "@/locales/ar.json";
import frTranslations from "@/locales/fr.json";
import ptTranslations from "@/locales/pt.json";

export type Language = "en" | "es" | "zh" | "ar" | "fr" | "pt";

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export const languages: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "EN", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "ES", dir: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "ZH", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "AR", dir: "rtl" },
  { code: "fr", name: "French", nativeName: "Français", flag: "FR", dir: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "PT", dir: "ltr" },
];

type TranslationValue = string | string[] | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

const translationsMap: Record<Language, Translations> = {
  en: enTranslations,
  es: esTranslations,
  zh: zhTranslations,
  ar: arTranslations,
  fr: frTranslations,
  pt: ptTranslations,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  tArray: (key: string) => string[];
  dir: "ltr" | "rtl";
  currentLanguage: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "impact-lab-language";

function getNestedValue(obj: Translations, path: string): TranslationValue | undefined {
  const keys = path.split(".");
  let current: TranslationValue | undefined = obj;
  
  for (const key of keys) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      current = (current as { [key: string]: TranslationValue })[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && translationsMap[stored as Language]) {
        return stored as Language;
      }
    }
    return "es";
  });

  const currentLanguage = languages.find(l => l.code === language) || languages[1];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.dir = currentLanguage.dir;
    document.documentElement.lang = language;
  }, [language, currentLanguage.dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    const translations = translationsMap[language];
    const value = getNestedValue(translations, key);
    
    if (typeof value === "string") {
      return value;
    }
    
    if (fallback) {
      return fallback;
    }
    
    const enValue = getNestedValue(translationsMap.en, key);
    if (typeof enValue === "string") {
      return enValue;
    }
    
    return key;
  }, [language]);

  const tArray = useCallback((key: string): string[] => {
    const translations = translationsMap[language];
    const value = getNestedValue(translations, key);
    
    if (Array.isArray(value)) {
      return value as string[];
    }
    
    const enValue = getNestedValue(translationsMap.en, key);
    if (Array.isArray(enValue)) {
      return enValue as string[];
    }
    
    return [];
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tArray,
        dir: currentLanguage.dir,
        currentLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

export function useLanguage() {
  return useTranslation();
}
