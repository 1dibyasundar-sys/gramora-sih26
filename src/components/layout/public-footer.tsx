import React from 'react';
import Link from 'next/link';
import { Sprout, ShieldCheck, Heart } from 'lucide-react';

export function PublicFooter() {
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
              Empowering Indian agricultural producers and FPOs with direct marketplace access,
              cold-chain logistics, and AI-assisted demand intelligence.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-caption text-foreground/60">
              <ShieldCheck className="w-4 h-4 text-primary-400 shrink-0" />
              <span>Smart India Hackathon 2026 • Problem ID 26033</span>
            </div>
          </div>

          {/* Column 1: Marketplace */}
          <div className="space-y-3">
            <h4 className="text-label text-foreground font-bold uppercase tracking-wider text-xs">
              Marketplace
            </h4>
            <ul className="space-y-2 text-caption sm:text-body-sm">
              <li>
                <Link href="/marketplace?category=vegetables" className="hover:text-primary-400 transition-colors">
                  Fresh Vegetables
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=fruits" className="hover:text-primary-400 transition-colors">
                  Seasonal Fruits
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=grains" className="hover:text-primary-400 transition-colors">
                  Grains & Cereals
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=spices" className="hover:text-primary-400 transition-colors">
                  Single-Origin Spices
                </Link>
              </li>
              <li>
                <Link href="/marketplace?organicOnly=true" className="hover:text-primary-400 transition-colors">
                  Jaivik Certified Organic
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform Roles */}
          <div className="space-y-3">
            <h4 className="text-label text-foreground font-bold uppercase tracking-wider text-xs">
              Solutions
            </h4>
            <ul className="space-y-2 text-caption sm:text-body-sm">
              <li>
                <Link href="/how-it-works#farmers" className="hover:text-primary-400 transition-colors">
                  For Smallholder Farmers
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#fpos" className="hover:text-primary-400 transition-colors">
                  For FPO Collectives
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#buyers" className="hover:text-primary-400 transition-colors">
                  For Bulk Buyers & Horeca
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#logistics" className="hover:text-primary-400 transition-colors">
                  Cold-Chain Logistics
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Impact & Prototype */}
          <div className="space-y-3">
            <h4 className="text-label text-foreground font-bold uppercase tracking-wider text-xs">
              Direct Impact
            </h4>
            <ul className="space-y-2 text-caption sm:text-body-sm">
              <li>
                <Link href="/about" className="hover:text-primary-400 transition-colors">
                  Eliminating Intermediaries
                </Link>
              </li>
              <li>
                <Link href="/about#transparency" className="hover:text-primary-400 transition-colors">
                  Price Transparency Formula
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary-400 transition-colors">
                  Interactive Demo Dashboards
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclosures */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-caption text-foreground/40">
          <p>
            © {new Date().getFullYear()} Gramora Platform. Built for Smart India Hackathon 2026.
          </p>
          <p className="flex items-center gap-1.5">
            <span>Engineering a prosperous Bharat for farmers</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
