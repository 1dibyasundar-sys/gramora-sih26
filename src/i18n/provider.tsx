'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, getLanguageMetadata, isSupportedLanguage } from './config';
import { LanguageMetadata, SupportedLanguage, TranslationKey, TranslationSchema } from './types';
import { bn } from './translations/bn';
import { en } from './translations/en';
import { hi } from './translations/hi';
import { or } from './translations/or';
import { te } from './translations/te';

const DICTIONARIES: Record<SupportedLanguage, TranslationSchema> = {
  en,
  hi,
  or,
  bn,
  te,
};

export interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  metadata: LanguageMetadata;
  supportedLanguages: LanguageMetadata[];
  isHydrated: boolean;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveTranslation(
  dict: TranslationSchema,
  key: string
): string | undefined {
  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always default to 'en' during initial server and client render to prevent hydration mismatches
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Read stored language from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && isSupportedLanguage(stored)) {
        setLanguageState(stored);
        document.documentElement.lang = stored;
      } else {
        document.documentElement.lang = DEFAULT_LANGUAGE;
      }
    } catch {
      // localStorage may fail in restricted/incognito modes
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const currentDict = DICTIONARIES[language] || DICTIONARIES[DEFAULT_LANGUAGE];
      let value = resolveTranslation(currentDict, key);

      // Fallback to English if translation is missing in target language
      if (value === undefined && language !== DEFAULT_LANGUAGE) {
        value = resolveTranslation(DICTIONARIES[DEFAULT_LANGUAGE], key);
      }

      // Safe final fallback: key string
      if (value === undefined) {
        return key;
      }

      // Interpolate parameters if any (e.g. {count} or {name})
      if (params) {
        return Object.entries(params).reduce<string>((acc, [paramKey, paramVal]) => {
          return acc.replaceAll(`{${paramKey}}`, String(paramVal));
        }, value);
      }

      return value;
    },
    [language]
  );

  const metadata = useMemo(() => getLanguageMetadata(language), [language]);

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      metadata,
      supportedLanguages: SUPPORTED_LANGUAGES,
      isHydrated,
    }),
    [language, setLanguage, t, metadata, isHydrated]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}
