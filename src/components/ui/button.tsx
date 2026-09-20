'use client';

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'glass' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'text-caption px-2.5 py-1 rounded-sm gap-1.5 font-medium',
      sm: 'text-body-sm px-3.5 py-1.5 rounded-md gap-2 font-medium',
      md: 'text-body-sm px-4 py-2.5 rounded-md gap-2 font-semibold',
      lg: 'text-body px-5 py-3 rounded-lg gap-2.5 font-semibold',
      xl: 'text-body-lg px-6 py-3.5 rounded-xl gap-3 font-bold',
    };

    const variantClasses = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 shadow-subtle hover:shadow-glow border border-primary-500/40 focus-visible:ring-2 focus-visible:ring-primary-500',
      secondary:
        'bg-surface-elevated text-foreground hover:bg-surface-secondary border border-surface-border active:scale-[0.99]',
      outline:
        'border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 hover:border-primary-500/60 active:bg-primary-500/20',
      glass:
        'glass-panel text-foreground hover:bg-white/10 hover:border-emerald-500/30 active:scale-[0.99] backdrop-blur-md',
      ghost:
        'text-foreground/80 hover:text-foreground hover:bg-white/5 active:bg-white/10',
      danger:
        'bg-error text-white hover:bg-red-600 border border-red-500/30 active:bg-red-700',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'glass' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'glass',
      size = 'md',
      loading = false,
      disabled,
      children,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'w-7 h-7 rounded-sm p-1',
      sm: 'w-8 h-8 rounded-md p-1.5',
      md: 'w-10 h-10 rounded-md p-2',
      lg: 'w-12 h-12 rounded-lg p-2.5',
    };

    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-500 border border-primary-500/40',
      secondary: 'bg-surface-elevated text-foreground hover:bg-surface-secondary border border-surface-border',
      outline: 'border border-primary-500/30 text-primary-400 hover:bg-primary-500/10',
      glass: 'glass-panel text-foreground hover:bg-white/10 hover:border-emerald-500/30',
      ghost: 'text-foreground/80 hover:text-foreground hover:bg-white/5',
      danger: 'bg-error text-white hover:bg-red-600',
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
