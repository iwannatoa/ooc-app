import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useFlaskPort } from '@/hooks/useFlaskPort';

// Auto-import all locale files
const localeModules = import.meta.glob<{ default: Record<string,any> }>('./locales/*.json', {
  eager: true,
});

// Extract locale codes from file paths and build translations object
const translations: Record<string, any> = {};
let defaultTranslations: any = null;

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
export type Translations = typeof defaultTranslations;

// Get available locales list
export const availableLocales = Object.keys(translations) as Locale[];

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'app_locale';

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
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

  useEffect(() => {
    const loadLanguageFromBackend = async () => {
      if (!apiUrl) return;

      try {
        const response = await fetch(`${apiUrl}/api/app-settings/language`);
        const data = await response.json();
        if (data.success && data.language && data.language in translations) {
          setLocaleState(data.language as Locale);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCALE_STORAGE_KEY, data.language);
          }
        }
      } catch (error) {
        console.error('Failed to load language from backend:', error);
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
        await fetch(`${apiUrl}/api/app-settings/language`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: newLocale }),
        });
      } catch (error) {
        console.error('Failed to save language to backend:', error);
      }
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[locale], key);
    return replaceParams(translation, params);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
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
