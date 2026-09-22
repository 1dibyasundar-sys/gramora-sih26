'use client';

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
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
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 text-foreground/40 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full bg-surface-primary/80 border border-surface-border text-foreground placeholder:text-foreground/40 text-body-sm rounded-md px-3.5 py-2.5 transition-all duration-200 outline-none focus:border-primary-500/80 focus:ring-1 focus:ring-primary-500/80 focus:text-foreground disabled:bg-surface-elevated/40 disabled:text-foreground/40 disabled:opacity-75 disabled:cursor-not-allowed read-only:bg-surface-secondary/50 read-only:text-foreground/70 shadow-subtle',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-error focus:border-error focus:ring-error',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-foreground/40 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
