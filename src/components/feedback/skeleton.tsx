import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-elevated/70 border border-surface-border/40', className)}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="glass-panel rounded-xl overflow-hidden p-4 space-y-3">
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="pt-2 flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}
