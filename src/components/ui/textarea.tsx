'use client';

import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, disabled, rows = 4, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-label text-foreground/80 font-medium select-none"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            'w-full bg-white border border-surface-border text-gray-900 placeholder:text-gray-500 text-body-sm rounded-md px-3.5 py-2.5 transition-all duration-200 outline-none focus:border-primary-500/80 focus:ring-1 focus:ring-primary-500/80 focus:text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-75 disabled:cursor-not-allowed read-only:bg-gray-50 read-only:text-gray-700 resize-y',
            error && 'border-error focus:border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-caption text-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-caption text-foreground/50">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
