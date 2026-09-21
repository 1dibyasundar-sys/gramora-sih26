'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAVIGATION_CONFIG } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { Sprout, LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useTranslation } from '@/i18n';
import { TranslationKey } from '@/i18n/types';

export interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onCloseMobile?: () => void;
}

const TITLE_TRANSLATION_MAP: Record<string, TranslationKey> = {
  'Operations': 'navigation.operations',
  'Market Intelligence': 'navigation.marketIntelligence',
  'Settings': 'navigation.settings',
  'Collective Hub': 'navigation.collectiveHub',
  'Shopping': 'navigation.marketplace',
  'Account': 'navigation.profile',
  'Farmer Dashboard': 'dashboard.farmerDashboard',
  'Buyer Dashboard': 'dashboard.buyerDashboard',
  'My Crops & Listings': 'navigation.myCrops',
  'List New Harvest': 'navigation.listHarvest',
  'Cold Storage & Inventory': 'navigation.coldStorage',
  'Price & Demand Forecast': 'navigation.forecast',
  'Farm Orders': 'navigation.farmOrders',
  'Live Marketplace': 'navigation.liveMarketplace',
  'Marketplace': 'navigation.marketplace',
  'Direct Farm Marketplace': 'navigation.marketplace',
  'Kisan Profile & Land': 'navigation.kisanProfile',
  'Profile & Addresses': 'navigation.profile',
  'Profile Settings': 'navigation.profile',
  'FPO Registry Profile': 'navigation.profile',
  'Bulk Orders': 'navigation.orders',
  'Orders & Consignments': 'navigation.orders',
  'My Orders & Freshness': 'navigation.orders',
  'Aggregated Listings': 'navigation.myCrops',
  'Batch Inventory': 'navigation.coldStorage',
  'Commodity Forecast': 'navigation.forecast',
  'Delivery Routes': 'navigation.routes',
  'Fleet Logistics': 'navigation.fleet',
  'User Management': 'navigation.users',
  'Platform Overview': 'navigation.overview',
};

const ROLE_TRANSLATION_MAP: Record<string, TranslationKey> = {
  farmer: 'auth.farmer',
  buyer: 'auth.buyer',
  consumer: 'auth.consumer',
  fpo: 'auth.fpo',
  logistics: 'auth.logistics',
  admin: 'auth.admin',
};

export function AppSidebar({ collapsed = false, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const sections = NAVIGATION_CONFIG[role] || NAVIGATION_CONFIG.farmer;

  const roleLabel = ROLE_TRANSLATION_MAP[role] ? t(ROLE_TRANSLATION_MAP[role]) : role.replace('_', ' ');

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
              <span className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider truncate">
                {roleLabel}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section, sIdx) => {
          const sectionTitleKey = TITLE_TRANSLATION_MAP[section.title];
          const sectionTitle = sectionTitleKey ? t(sectionTitleKey) : section.title;

          return (
            <div key={sIdx} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">
                  {sectionTitle}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const itemTitleKey = TITLE_TRANSLATION_MAP[item.title];
                const itemTitle = itemTitleKey ? t(itemTitleKey) : item.title;

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
                    title={collapsed ? itemTitle : undefined}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-colors',
                        isActive ? 'text-primary-400' : 'text-foreground/60 group-hover:text-foreground'
                      )}
                    />
                    {!collapsed && <span className="truncate">{itemTitle}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
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
                {user?.organization || roleLabel}
              </span>
            </div>
          )}
          {!collapsed && (
            <Link
              href="/login"
              title={t('navigation.logout')}
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
