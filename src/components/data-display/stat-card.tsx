import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  className?: string;
  badgeText?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  badgeText,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl p-5 glass-panel border border-surface-border transition-all duration-200 hover:border-primary-500/30 hover:shadow-card group',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label text-foreground/60 font-medium mb-1 tracking-wide uppercase text-xs">
            {title}
          </p>
          <div className="text-h2 font-bold text-foreground tracking-tight">{value}</div>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-primary-400 group-hover:scale-105 transition-transform shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(trend || subtitle || badgeText) && (
        <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between text-caption">
          {trend ? (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold',
                  trend.direction === 'up' && 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30',
                  trend.direction === 'down' && 'text-rose-400 bg-rose-950/40 border border-rose-500/30',
                  trend.direction === 'neutral' && 'text-foreground/60 bg-surface-elevated'
                )}
              >
                {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
                {trend.value}
              </span>
              {trend.label && <span className="text-foreground/50">{trend.label}</span>}
            </div>
          ) : (
            <span className="text-foreground/50">{subtitle}</span>
          )}

          {badgeText && (
            <span className="text-[11px] font-semibold text-primary-400/90 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
