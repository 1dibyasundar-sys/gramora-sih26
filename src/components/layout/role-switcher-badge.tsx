'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { UserCheck, Sparkles } from 'lucide-react';

const ROLES: { key: UserRole; label: string; color: string }[] = [
  { key: 'farmer', label: 'Farmer', color: 'text-emerald-400 border-emerald-500/30' },
  { key: 'fpo', label: 'FPO Collective', color: 'text-teal-400 border-teal-500/30' },
  { key: 'consumer', label: 'Consumer', color: 'text-blue-400 border-blue-500/30' },
  { key: 'bulk_buyer', label: 'Bulk Buyer', color: 'text-amber-400 border-amber-500/30' },
  { key: 'logistics', label: 'Logistics', color: 'text-cyan-400 border-cyan-500/30' },
  { key: 'admin', label: 'Admin', color: 'text-rose-400 border-rose-500/30' },
];

export function RoleSwitcherBadge({ className }: { className?: string }) {
  const { role, switchRole } = useAuth();

  return (
    <div className={cn('flex items-center gap-1.5 p-1 rounded-xl bg-surface-primary/90 border border-surface-border text-caption', className)}>
      <div className="flex items-center gap-1 px-2 text-foreground/50 font-bold uppercase text-[10px] tracking-wider shrink-0">
        <Sparkles className="w-3 h-3 text-accent-400" />
        <span className="hidden sm:inline">Demo Role:</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {ROLES.map((r) => {
          const isActive = role === r.key;
          return (
            <button
              key={r.key}
              onClick={() => switchRole(r.key)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap text-caption outline-none',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm ring-1 ring-primary-400/50'
                  : 'text-foreground/60 hover:text-foreground hover:bg-surface-elevated'
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
