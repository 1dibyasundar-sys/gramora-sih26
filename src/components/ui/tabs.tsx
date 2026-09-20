'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills' | 'segmented';
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className,
}: TabsProps) {
  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        className={cn(
          'inline-flex items-center p-1 rounded-xl bg-surface-primary border border-surface-border',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 text-body-sm font-medium rounded-lg transition-all duration-150 outline-none',
                isActive
                  ? 'bg-primary-600 text-white shadow-subtle'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'text-caption px-1.5 py-0.2 rounded-full font-semibold',
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-foreground/70'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={cn('flex items-center gap-6 border-b border-surface-border', className)}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-2 pb-3 pt-1 text-body-sm font-medium transition-colors outline-none',
                isActive ? 'text-primary-400 font-semibold' : 'text-foreground/60 hover:text-foreground',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-caption px-1.5 py-0.5 rounded-full bg-surface-elevated text-foreground/70 font-semibold">
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default pills variant
  return (
    <div role="tablist" className={cn('flex flex-wrap items-center gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-body-sm font-medium rounded-lg border transition-all duration-150 outline-none',
              isActive
                ? 'bg-primary-600/20 border-primary-500/50 text-primary-300 shadow-sm'
                : 'bg-surface-primary/70 border-surface-border text-foreground/70 hover:text-foreground hover:bg-surface-elevated',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-caption px-1.5 py-0.5 rounded-full bg-white/10 font-semibold">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
