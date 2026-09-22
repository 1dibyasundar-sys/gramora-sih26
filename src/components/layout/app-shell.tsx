'use client';

import React, { useState } from 'react';
import { AppSidebar } from './app-sidebar';
import { Topbar } from './topbar';
import { RoleSwitcherBadge } from './role-switcher-badge';
import { Drawer } from '@/components/ui/drawer';
import { Store, LayoutDashboard, Truck, Package, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { role, user, isFirebaseConfigured } = useAuth();
  const showRoleSwitcher = !(isFirebaseConfigured && user);

  const getDashboardPath = () => {
    if (role === 'farmer' || role === 'fpo') return '/farmer/dashboard';
    if (role === 'bulk_buyer' || role === 'consumer') return '/buyer/dashboard';
    if (role === 'logistics') return '/logistics/dashboard';
    return '/admin/dashboard';
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground relative">
      {/* Ambient background glow decoration */}
      <div
        className="fixed top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0">
        <AppSidebar />
      </div>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
        className="p-0 max-w-xs"
      >
        <AppSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
      </Drawer>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <Topbar
          title={title}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Mobile Demo Role Switcher Ribbon */}
        {showRoleSwitcher && (
          <div className="xl:hidden px-4 py-2 bg-surface-primary/60 border-b border-surface-border">
            <RoleSwitcherBadge />
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (High Accessibility) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-surface-primary/95 backdrop-blur-xl border-t border-surface-border flex items-center justify-around px-2"
      >
        <Link
          href={getDashboardPath()}
          className={cn(
            'flex flex-col items-center gap-1 text-[11px] font-medium p-1 transition-colors',
            pathname.includes('/dashboard') ? 'text-primary-400 font-bold' : 'text-foreground/50'
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/marketplace"
          className={cn(
            'flex flex-col items-center gap-1 text-[11px] font-medium p-1 transition-colors',
            pathname === '/marketplace' ? 'text-primary-400 font-bold' : 'text-foreground/50'
          )}
        >
          <Store className="w-5 h-5" />
          <span>Market</span>
        </Link>
        <Link
          href="/orders"
          className={cn(
            'flex flex-col items-center gap-1 text-[11px] font-medium p-1 transition-colors',
            pathname.includes('/orders') ? 'text-primary-400 font-bold' : 'text-foreground/50'
          )}
        >
          <Package className="w-5 h-5" />
          <span>Orders</span>
        </Link>
        <Link
          href="/profile"
          className={cn(
            'flex flex-col items-center gap-1 text-[11px] font-medium p-1 transition-colors',
            pathname === '/profile' ? 'text-primary-400 font-bold' : 'text-foreground/50'
          )}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
