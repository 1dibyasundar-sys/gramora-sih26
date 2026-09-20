'use client';

import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helperText, id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-label text-foreground/80 font-medium select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full appearance-none bg-surface-primary/80 border border-surface-border text-foreground text-body-sm rounded-md px-3.5 py-2.5 pr-10 transition-all duration-200 outline-none focus:border-primary-500/80 focus:ring-1 focus:ring-primary-500/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
              error && 'border-error focus:border-error focus:ring-error',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-surface-elevated text-foreground"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 text-foreground/40 pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-caption text-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-caption text-foreground/50">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
