'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sprout, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { LanguageSelector } from './language-selector';

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const navLinks = [
    { label: t('navigation.marketplace'), href: '/marketplace' },
    { label: t('navigation.howItWorks'), href: '/how-it-works' },
    { label: t('navigation.directImpact'), href: '/about' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-header border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-800 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
            <Sprout className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-body font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
              Gramora <span className="text-primary-400 font-medium text-caption px-1.5 py-0.2 rounded bg-primary-500/10 border border-primary-500/20">SIH 26033</span>
            </span>
            <span className="text-[10px] text-foreground/50 tracking-wider uppercase font-semibold hidden sm:inline">
              Direct Farm Commerce & Logistics
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-body-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary-400 font-semibold bg-primary-500/10'
                    : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Action CTAs & Language Selector */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSelector />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t('navigation.signIn')}
            </Button>
          </Link>
          <Link href="/register">
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('navigation.joinAsFarmerBuyer')}
            </Button>
          </Link>
        </div>

        {/* Mobile Actions: Language + Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSelector variant="compact" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-surface-elevated"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-surface-border bg-surface-primary/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-3 duration-200">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-3 py-2.5 rounded-lg text-body font-medium',
                  pathname === link.href
                    ? 'bg-primary-500/15 text-primary-300 font-semibold'
                    : 'text-foreground/80 hover:bg-white/5'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-2 pb-1">
            <div className="text-[12px] font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-1">
              {t('profile.languagePreferences')}
            </div>
            <LanguageSelector variant="full" />
          </div>
          <div className="pt-3 border-t border-surface-border/60 flex flex-col gap-2.5">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="secondary" size="md" className="w-full">
                {t('navigation.signIn')}
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" className="w-full">
                {t('navigation.getStarted')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
