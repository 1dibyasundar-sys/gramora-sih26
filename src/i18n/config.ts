import { LanguageMetadata, SupportedLanguage } from './types';

export const SUPPORTED_LANGUAGES: LanguageMetadata[] = [
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
  },
  {
    code: 'or',
    nativeName: 'ଓଡ଼ିଆ',
    englishName: 'Odia',
  },
  {
    code: 'bn',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
  },
  {
    code: 'te',
    nativeName: 'తెలుగు',
    englishName: 'Telugu',
  },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'gramora_language';

export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === 'string' && ['en', 'hi', 'or', 'bn', 'te'].includes(lang);
}

export function getLanguageMetadata(lang: SupportedLanguage): LanguageMetadata {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  return (
    found || {
      code: 'en',
      nativeName: 'English',
      englishName: 'English',
    }
  );
}
