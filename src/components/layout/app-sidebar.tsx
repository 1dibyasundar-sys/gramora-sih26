'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAVIGATION_CONFIG } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { Sprout, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

export interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onCloseMobile?: () => void;
}

export function AppSidebar({ collapsed = false, onToggle, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, role } = useAuth();
  const sections = NAVIGATION_CONFIG[role] || NAVIGATION_CONFIG.farmer;

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-surface-primary border-r border-surface-border transition-all duration-300 select-none z-30',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-surface-border">
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-800 flex items-center justify-center text-white shrink-0 shadow-glow">
            <Sprout className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-body font-bold text-foreground truncate">
                Gramora
              </span>
              <span className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider">
                {role.replace('_', ' ')}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-body-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-primary-600/20 text-primary-300 font-semibold border border-primary-500/30'
                      : 'text-foreground/70 hover:text-foreground hover:bg-surface-elevated'
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-colors',
                      isActive ? 'text-primary-400' : 'text-foreground/60 group-hover:text-foreground'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-surface-border bg-surface-secondary/40">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-elevated/60 border border-surface-border/50">
          <Avatar
            src={user?.avatarUrl}
            fallback={user?.name || 'User'}
            size="sm"
            status="online"
          />
          {!collapsed && (
            <div className="flex flex-col truncate flex-1 min-w-0">
              <span className="text-caption font-bold text-foreground truncate">
                {user?.name || 'Authorized User'}
              </span>
              <span className="text-[10px] text-foreground/50 truncate">
                {user?.organization || role}
              </span>
            </div>
          )}
          {!collapsed && (
            <Link
              href="/login"
              title="Sign Out / Switch"
              className="text-foreground/40 hover:text-foreground p-1"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
