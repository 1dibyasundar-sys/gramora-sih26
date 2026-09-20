import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { ArrowDownRight, CheckCircle } from 'lucide-react';

export interface PriceDisplayProps {
  pricePerUnit: number;
  unit: string;
  marketMandiPrice?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSavings?: boolean;
  className?: string;
}

export function PriceDisplay({
  pricePerUnit,
  unit,
  marketMandiPrice,
  size = 'md',
  showSavings = true,
  className,
}: PriceDisplayProps) {
  const savingsPercent =
    marketMandiPrice && marketMandiPrice > pricePerUnit
      ? Math.round(((marketMandiPrice - pricePerUnit) / marketMandiPrice) * 100)
      : null;

  const sizeStyles = {
    sm: {
      price: 'text-body font-bold',
      unit: 'text-caption',
      mandi: 'text-caption',
    },
    md: {
      price: 'text-h4 font-bold',
      unit: 'text-body-sm',
      mandi: 'text-caption',
    },
    lg: {
      price: 'text-h3 font-extrabold',
      unit: 'text-body',
      mandi: 'text-body-sm',
    },
    xl: {
      price: 'text-h1 font-extrabold',
      unit: 'text-h4',
      mandi: 'text-body',
    },
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-primary-400 font-mono tracking-tight', sizeStyles[size].price)}>
          {formatCurrency(pricePerUnit)}
        </span>
        <span className={cn('text-foreground/50 font-medium', sizeStyles[size].unit)}>
          / {unit}
        </span>
      </div>

      {marketMandiPrice && marketMandiPrice > pricePerUnit && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('line-through text-foreground/40 font-mono', sizeStyles[size].mandi)}>
            Mandi: {formatCurrency(marketMandiPrice)}
          </span>
          {showSavings && savingsPercent && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.2 rounded">
              <ArrowDownRight className="w-3 h-3" />
              Save {savingsPercent}% Direct
            </span>
          )}
        </div>
      )}
    </div>
  );
}
