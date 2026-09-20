'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { IconButton } from './button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  className,
}: DrawerProps) {
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'fixed inset-y-0 flex max-w-full',
          position === 'right' ? 'right-0 pl-10' : 'left-0 pr-10'
        )}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-screen max-w-md bg-surface-primary border-surface-border p-6 shadow-elevated overflow-y-auto flex flex-col glass-panel',
            position === 'right' ? 'border-l' : 'border-r',
            className
          )}
        >
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            {title && <h3 className="text-h4 font-bold text-foreground">{title}</h3>}
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Close drawer"
              onClick={onClose}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
          <div className="mt-6 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
