'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { SupportedLanguage } from '@/i18n/types';
import { cn } from '@/lib/utils';

export interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'full';
  align?: 'left' | 'right';
  className?: string;
}

export function LanguageSelector({
  variant = 'default',
  align = 'right',
  className,
}: LanguageSelectorProps) {
  const { language, setLanguage, supportedLanguages, metadata } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Select language. Current language: ${metadata.nativeName} (${metadata.englishName})`}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/40',
          variant === 'compact'
            ? 'p-2 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-surface-border text-foreground/80 hover:text-foreground'
            : variant === 'full'
            ? 'w-full justify-between px-3.5 py-2.5 bg-surface-elevated/70 hover:bg-surface-elevated border border-surface-border text-foreground'
            : 'px-3 py-1.5 bg-surface-elevated/70 hover:bg-surface-elevated border border-surface-border text-caption font-semibold text-foreground/80 hover:text-foreground'
        )}
      >
        <span className="flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-primary-400 shrink-0" />
          {variant !== 'compact' && (
            <span className="font-medium text-foreground">
              {metadata.nativeName}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-foreground/50 transition-transform duration-200 shrink-0',
            open && 'rotate-180 text-primary-400'
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className={cn(
            'absolute z-50 mt-2 min-w-[210px] rounded-xl bg-surface-primary/95 backdrop-blur-xl border border-surface-border p-1.5 shadow-elevated focus:outline-none animate-in fade-in zoom-in-95 duration-150',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-foreground/40 uppercase tracking-wider border-b border-surface-border/60 mb-1">
            Choose Language / भाषा चुनें
          </div>
          {supportedLanguages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-body-sm transition-colors text-left group',
                  isSelected
                    ? 'bg-primary-500/15 text-primary-300 font-semibold'
                    : 'text-foreground/80 hover:text-foreground hover:bg-white/5 font-medium'
                )}
              >
                <div className="flex flex-col">
                  <span className="text-[13px] leading-snug font-medium text-foreground group-hover:text-primary-300 transition-colors">
                    {lang.nativeName}
                  </span>
                  <span className="text-[11px] text-foreground/50 leading-tight">
                    {lang.englishName}
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary-400 shrink-0 animate-in fade-in" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
