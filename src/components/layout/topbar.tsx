'use client';

import React from 'react';
import { Menu, Search, UserCircle, ExternalLink } from 'lucide-react';
import { RoleSwitcherBadge } from './role-switcher-badge';
import { NotificationsPopover } from './notifications-popover';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export interface TopbarProps {
  onOpenMobileMenu?: () => void;
  title?: string;
}

export function Topbar({ onOpenMobileMenu, title }: TopbarProps) {
  const { user, role } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 sm:h-20 w-full glass-header border-b border-surface-border px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-foreground/70 hover:text-foreground hover:bg-surface-elevated"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {title && (
          <h1 className="text-body sm:text-h4 font-bold text-foreground truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right side: Demo Role Switcher, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Switcher Bar */}
        <div className="hidden xl:block">
          <RoleSwitcherBadge />
        </div>

        {/* Live Marketplace link */}
        <Link
          href="/marketplace"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-surface-border text-caption font-semibold text-foreground/80 hover:text-foreground transition-colors"
        >
          <span>Marketplace</span>
          <ExternalLink className="w-3 h-3 text-foreground/40" />
        </Link>

        {/* Notifications */}
        <NotificationsPopover />

        {/* Profile Avatar link */}
        <Link href="/profile" className="flex items-center gap-2 pl-1">
          <Avatar
            src={user?.avatarUrl}
            fallback={user?.name || 'U'}
            size="sm"
            status="online"
          />
        </Link>
      </div>
    </header>
  );
}
