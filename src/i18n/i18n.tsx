import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useFlaskPort } from '@/hooks/useFlaskPort';
import { invoke } from '@tauri-apps/api/core';

// Auto-import all locale files
type TranslationJson = Record<string, string | TranslationJson>;

const localeModules = import.meta.glob<{ default: TranslationJson }>(
  './locales/*.json',
  {
    eager: true,
  }
);

const translations: Record<string, TranslationJson> = {};
let defaultTranslations: TranslationJson | null = null;

Object.entries(localeModules).forEach(([path, module]) => {
  // Extract locale code from path (e.g., './locales/zh.json' -> 'zh')
  const localeMatch = path.match(/\/([^/]+)\.json$/);
  if (localeMatch) {
    const locale = localeMatch[1];
    translations[locale] = module.default;
    // Use the first loaded locale as the default type reference
    if (!defaultTranslations) {
      defaultTranslations = module.default;
    }
  }
});

export type Locale = keyof typeof translations;
export type Translations = TranslationJson;

// Get available locales list
export const availableLocales = Object.keys(translations) as Locale[];

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Set when loading or saving language preference from the backend fails (consumer may toast once). */
  languageBackendNotice: string | null;
  clearLanguageBackendNotice: () => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'app_locale';

interface CommandResponse<T> {
  success: boolean;
  data?: T;
}

const buildAuthHeaders = async (
  baseHeaders: HeadersInit = {}
): Promise<Record<string, string>> => {
  const merged: Record<string, string> =
    baseHeaders instanceof Headers
      ? Object.fromEntries(baseHeaders.entries())
      : Array.isArray(baseHeaders)
        ? Object.fromEntries(baseHeaders)
        : { ...(baseHeaders as Record<string, string>) };

  try {
    const tokenResp = await invoke<CommandResponse<string>>('get_flask_api_token');
    const token = tokenResp.success ? tokenResp.data?.trim() : '';
    if (token) {
      merged.Authorization = `Bearer ${token}`;
    }
  } catch {
    const fallback = import.meta.env.VITE_FLASK_API_TOKEN?.trim();
    if (fallback) {
      merged.Authorization = `Bearer ${fallback}`;
    }
  }

  return merged;
};

function getNestedValue(obj: TranslationJson, path: string): string {
  const keys = path.split('.');
  let value: string | TranslationJson | undefined = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key] as string | TranslationJson;
    } else {
      return path;
    }
  }
  return typeof value === 'string' ? value : path;
}

function replaceParams(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params) return text;
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { apiUrl } = useFlaskPort();
  const [languageBackendNotice, setLanguageBackendNotice] = useState<
    string | null
  >(null);
  const localeRef = useRef<Locale>('zh');

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale;
      if (stored && stored in translations) {
        return stored;
      }
      // Try to match browser language
      const browserLang = navigator.language.toLowerCase();
      const browserLangCode = browserLang.split('-')[0];
      if (browserLangCode in translations) {
        return browserLangCode as Locale;
      }
    }
    // Default to first available locale (usually 'zh' if it exists, otherwise first in alphabetical order)
    return availableLocales[0] || 'zh';
  });

  localeRef.current = locale;

  const clearLanguageBackendNotice = () => {
    setLanguageBackendNotice(null);
  };

  useEffect(() => {
    const loadLanguageFromBackend = async () => {
      if (!apiUrl) return;

      try {
        const response = await fetch(`${apiUrl}/api/app-settings/language`, {
          headers: await buildAuthHeaders(),
        });
        const data = await response.json();
        if (data.success && data.language && data.language in translations) {
          setLocaleState(data.language as Locale);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCALE_STORAGE_KEY, data.language);
          }
          setLanguageBackendNotice(null);
        }
      } catch (error) {
        console.error('Failed to load language from backend:', error);
        const loc = localeRef.current;
        const msg = replaceParams(
          getNestedValue(translations[loc], 'app.languagePreferenceLoadFailed'),
          {}
        );
        setLanguageBackendNotice(msg);
      }
    };

    if (apiUrl) {
      loadLanguageFromBackend();
    }
  }, [apiUrl]);

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }

    if (apiUrl) {
      try {
        const headers = await buildAuthHeaders({
          'Content-Type': 'application/json',
        });
        await fetch(`${apiUrl}/api/app-settings/language`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ language: newLocale }),
        });
      } catch (error) {
        console.error('Failed to save language to backend:', error);
        const loc = localeRef.current;
        const msg = replaceParams(
          getNestedValue(translations[loc], 'app.languagePreferenceSaveFailed'),
          {}
        );
        setLanguageBackendNotice(msg);
      }
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[locale], key);
    return replaceParams(translation, params);
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        languageBackendNotice,
        clearLanguageBackendNotice,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
