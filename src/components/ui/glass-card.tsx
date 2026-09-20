import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'interactive' | 'accent';
  glow?: boolean;
}

export function GlassCard({
  className,
  variant = 'default',
  glow = false,
  children,
  ...props
}: GlassCardProps) {
  const variantStyles = {
    default: 'glass-panel',
    strong: 'bg-glass-bg-strong backdrop-blur-glass border border-glass-border/40 shadow-glass',
    interactive: 'glass-panel-interactive cursor-pointer',
    accent: 'glass-panel border-accent-500/30 bg-accent-950/20 shadow-glass',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-6 relative overflow-hidden transition-all duration-300',
        variantStyles[variant],
        glow && 'ring-1 ring-primary-500/30 shadow-glow',
        className
      )}
      {...props}
    >
      {glow && (
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
