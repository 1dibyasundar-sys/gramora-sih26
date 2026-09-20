'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { IconButton } from './button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        className={cn(
          'relative w-full rounded-2xl bg-surface-primary border border-surface-border p-6 shadow-elevated z-10 animate-in fade-in zoom-in-95 duration-200 glass-panel',
          sizeClasses[size],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-h4 font-bold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-body-sm text-foreground/60 mt-1">{description}</p>
            )}
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close dialog"
            onClick={onClose}
            className="shrink-0 -mt-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
