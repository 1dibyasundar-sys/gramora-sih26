'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sprout, Wheat, Apple, Carrot, Milk } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudinary';

export interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | 'wide';
  fallbackText?: string;
  containerClassName?: string;
  category?: 'fruits' | 'vegetables' | 'grains' | 'dairy' | 'other' | string;
}

export function AppImage({
  src,
  alt = 'Agricultural Produce',
  aspectRatio = 'landscape',
  fallbackText,
  containerClassName,
  className,
  category,
  ...props
}: AppImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const optimizedSrc = getOptimizedImageUrl(src, {
    quality: 'auto',
    format: 'auto',
    crop: 'fill',
  });

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
    wide: 'aspect-[16/9]',
  };

  const renderFallbackIcon = () => {
    const props = { className: "w-8 h-8 text-primary-500/50" };
    switch (category) {
      case 'grains': return <Wheat {...props} />;
      case 'fruits': return <Apple {...props} />;
      case 'vegetables': return <Carrot {...props} />;
      case 'dairy': return <Milk {...props} />;
      default: return <Sprout {...props} />;
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-elevated/70 border border-surface-border/50 flex items-center justify-center select-none',
        aspectClasses[aspectRatio],
        containerClassName
      )}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 bg-surface-elevated/40 animate-pulse" />
      )}

      {error || !src ? (
        <div className="flex flex-col items-center justify-center text-foreground/40 gap-2 p-4 text-center">
          {renderFallbackIcon()}
          <span className="text-caption font-medium">{fallbackText || alt}</span>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}
