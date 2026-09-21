'use client';

import React from 'react';
import Link from 'next/link';
import { Sprout, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/i18n';

export function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="w-full border-t border-surface-border bg-surface-primary/95 text-foreground/70 text-body-sm pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-surface-border">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-800 flex items-center justify-center text-white shadow-glow">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-h4 font-extrabold text-foreground tracking-tight">
                Gramora
              </span>
            </Link>
            <p className="text-body-sm text-foreground/60 leading-relaxed max-w-sm">
              {t('footer.aboutText')}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-caption text-foreground/60">
              <ShieldCheck className="w-4 h-4 text-primary-400 shrink-0" />
              <span>{t('footer.sihBadge')}</span>
            </div>
          </div>

          {/* Column 1: Marketplace */}
          <div className="space-y-3">
            <h4 className="text-label text-foreground font-bold uppercase tracking-wider text-xs">
              {t('footer.marketplaceCol')}
            </h4>
            <ul className="space-y-2 text-caption sm:text-body-sm">
              <li>
                <Link href="/marketplace?category=vegetables" className="hover:text-primary-400 transition-colors">
                  {t('marketplace.vegetables')}
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=fruits" className="hover:text-primary-400 transition-colors">
                  {t('marketplace.fruits')}
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=grains" className="hover:text-primary-400 transition-colors">
                  {t('marketplace.grains')}
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=spices" className="hover:text-primary-400 transition-colors">
                  {t('marketplace.spices')}
                </Link>
              </li>
              <li>
                <Link href="/marketplace?organicOnly=true" className="hover:text-primary-400 transition-colors">
                  {t('marketplace.organic')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform Roles */}
          <div className="space-y-3">
            <h4 className="text-label text-foreground font-bold uppercase tracking-wider text-xs">
              {t('footer.producersCol')}
            </h4>
            <ul className="space-y-2 text-caption sm:text-body-sm">
              <li>
                <Link href="/how-it-works#farmers" className="hover:text-primary-400 transition-colors">
                  {t('auth.farmer')}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#fpos" className="hover:text-primary-400 transition-colors">
                  {t('auth.fpo')}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#buyers" className="hover:text-primary-400 transition-colors">
                  {t('auth.buyer')}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#logistics" className="hover:text-primary-400 transition-colors">
                  {t('footer.logisticsCol')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Impact & Prototype */}
          <div className="space-y-3">
            <h4 className="text-label text-foreground font-bold uppercase tracking-wider text-xs">
              {t('navigation.directImpact')}
            </h4>
            <ul className="space-y-2 text-caption sm:text-body-sm">
              <li>
                <Link href="/about" className="hover:text-primary-400 transition-colors">
                  {t('marketplace.directExchange')}
                </Link>
              </li>
              <li>
                <Link href="/about#transparency" className="hover:text-primary-400 transition-colors">
                  {t('productDetail.breakdownTitle')}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary-400 transition-colors">
                  {t('navigation.dashboard')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclosures */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-caption text-foreground/40">
          <p>
            © {new Date().getFullYear()} Gramora Platform. {t('footer.sihBadge')}
          </p>
          <p className="flex items-center gap-1.5">
            <span>{t('footer.rightsReserved')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
