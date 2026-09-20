'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ id, checked, onChange, label, description, disabled, className }, ref) => {
    return (
      <div className={cn('flex items-center justify-between gap-4', disabled && 'opacity-50 cursor-not-allowed', className)}>
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-body-sm font-medium text-foreground">{label}</span>}
            {description && <span className="text-caption text-foreground/50">{description}</span>}
          </div>
        )}
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            checked ? 'bg-primary-600' : 'bg-surface-elevated border-surface-border'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
