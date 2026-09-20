import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'secondary',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const sizeClasses = {
    sm: 'text-caption px-2 py-0.5 rounded-sm font-medium',
    md: 'text-body-sm px-2.5 py-1 rounded-md font-semibold text-xs',
  };

  const variantClasses = {
    primary: 'bg-primary-500/15 text-primary-400 border border-primary-500/30',
    secondary: 'bg-surface-elevated text-foreground/80 border border-surface-border',
    accent: 'bg-accent-500/15 text-accent-400 border border-accent-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    error: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    outline: 'border border-surface-border text-foreground/70 bg-transparent',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 shrink-0 select-none',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
