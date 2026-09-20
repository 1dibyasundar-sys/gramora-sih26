'use client';

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, checked, disabled, onChange, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-start gap-3 cursor-pointer select-none group',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 rounded border border-surface-border bg-surface-primary/90 transition-all duration-200 flex items-center justify-center peer-checked:bg-primary-600 peer-checked:border-primary-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/50 group-hover:border-primary-500/40',
              className
            )}
          >
            <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150 stroke-[2.5]" />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-body-sm font-medium text-foreground">{label}</span>}
            {description && <span className="text-caption text-foreground/50">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
