import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zh from './locales/zh.json';
import en from './locales/en.json';
import { useFlaskPort } from '@/hooks/useFlaskPort';

export type Locale = 'zh' | 'en';
export type Translations = typeof zh;

const translations: Record<Locale, Translations> = {
  zh,
  en,
};

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

function replaceParams(text: string, params?: Record<string, string | number>): string {
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
      if (stored && (stored === 'zh' || stored === 'en')) {
        return stored;
      }
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('zh')) {
        return 'zh';
      }
    }
    return 'zh';
  });

  useEffect(() => {
    const loadLanguageFromBackend = async () => {
      if (!apiUrl) return;
      
      try {
        const response = await fetch(`${apiUrl}/api/app-settings/language`);
        const data = await response.json();
        if (data.success && data.language && (data.language === 'zh' || data.language === 'en')) {
          setLocaleState(data.language);
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

