'use client';

import { useContext } from 'react';
import { LanguageContext, LanguageContextValue } from './provider';

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
