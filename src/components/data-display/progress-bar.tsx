import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  helperText?: string;
  variant?: 'primary' | 'accent' | 'warning' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  helperText,
  variant = 'primary',
  size = 'md',
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizeHeights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantColors = {
    primary: 'bg-primary-500',
    accent: 'bg-accent-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    success: 'bg-emerald-500',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-body-sm font-medium">
          {label && <span className="text-foreground/80">{label}</span>}
          {showPercentage && <span className="font-mono text-foreground/60">{percentage}%</span>}
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-surface-elevated overflow-hidden border border-surface-border/50',
          sizeHeights[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantColors[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {helperText && <span className="text-caption text-foreground/50">{helperText}</span>}
    </div>
  );
}
