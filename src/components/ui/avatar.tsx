import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'offline' | 'busy';
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className,
  status,
}: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  const statusSize = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          'relative rounded-full overflow-hidden bg-surface-elevated border border-surface-border flex items-center justify-center text-foreground/80 font-medium select-none',
          sizeClasses[size],
          className
        )}
      >
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Graceful fallback to initial
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span>{fallback.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
            statusSize[size],
            status === 'online' && 'bg-emerald-500',
            status === 'offline' && 'bg-zinc-500',
            status === 'busy' && 'bg-amber-500'
          )}
        />
      )}
    </div>
  );
}
