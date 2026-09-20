'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search crops, varieties, districts, sellers...',
  className,
  onClear,
}: SearchInputProps) {
  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <Search className="absolute left-3.5 w-4 h-4 text-foreground/40 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-primary/90 border border-surface-border text-foreground placeholder:text-foreground/40 text-body-sm rounded-xl pl-10 pr-10 py-2.5 outline-none transition-all focus:border-primary-500/70 focus:ring-1 focus:ring-primary-500/50 shadow-subtle"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="absolute right-3.5 text-foreground/40 hover:text-foreground p-0.5 rounded-full"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
