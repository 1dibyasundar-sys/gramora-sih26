'use client';

import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import {
  Sprout,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  ClipboardList,
  Scale,
  CreditCard,
  Thermometer,
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="primary" size="md">
              End-to-End Operational Workflow
            </Badge>
            <h1 className="text-h1 sm:text-display font-extrabold text-foreground tracking-tight">
              How Gramora Connects Farm To Fork
            </h1>
            <p className="text-body sm:text-body-lg text-foreground/70 leading-relaxed">
              Step-by-step transparency from listing and digital grading to refrigerated dispatch and
              instant escrow payouts.
            </p>
          </div>

          {/* Section 1: Farmer & FPO Flow */}
          <div id="farmers" className="space-y-8 scroll-mt-24">
            <span id="fpos" className="-mt-24 block" aria-hidden="true" />
            <div className="flex items-center gap-3 border-b border-surface-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-h3 font-bold text-foreground">1. Farmer & FPO Workflow</h2>
                <p className="text-caption text-foreground/60">
                  Direct digital listing with zero middleman deductions
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600/20 text-primary-300 font-bold flex items-center justify-center font-mono">
                  1
                </div>
                <h3 className="text-body font-bold text-foreground">Listing & Grading</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Enter crop variety, harvest date, estimated yield, and moisture level. Upload
                  photographs for automated Agmark grade matching.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600/20 text-primary-300 font-bold flex items-center justify-center font-mono">
                  2
                </div>
                <h3 className="text-body font-bold text-foreground">Fair Price Discovery</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  View current local mandi benchmark prices and AI demand surge projections. Set your
                  desired farm gate price.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600/20 text-primary-300 font-bold flex items-center justify-center font-mono">
                  3
                </div>
                <h3 className="text-body font-bold text-foreground">Farm Gate Pickup</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  A certified refrigerated truck arrives directly at your gate. Produce is digitally
                  weighed and assigned a batch traceability barcode.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600/20 text-primary-300 font-bold flex items-center justify-center font-mono">
                  4
                </div>
                <h3 className="text-body font-bold text-foreground">Direct Escrow Payout</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Funds deposited by the buyer are disbursed straight to your bank account upon
                  electronic delivery receipt. No credit delays.
                </p>
              </GlassCard>
            </div>
          </div>

          {/* Section 2: Buyer Flow */}
          <div id="buyers" className="space-y-8 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-surface-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-h3 font-bold text-foreground">2. Consumer & Bulk Buyer Workflow</h2>
                <p className="text-caption text-foreground/60">
                  Procure verified farm-fresh produce with wholesale savings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-accent-600/20 text-accent-300 font-bold flex items-center justify-center font-mono">
                  1
                </div>
                <h3 className="text-body font-bold text-foreground">Browse & Filter</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Filter by crop type, verified organic certification, distance, and price per unit.
                  Inspect batch inspection certificates online.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-accent-600/20 text-accent-300 font-bold flex items-center justify-center font-mono">
                  2
                </div>
                <h3 className="text-body font-bold text-foreground">Volume Pricing & Escrow</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Order retail or lock wholesale quantity contracts with tiered volume pricing. Pay
                  securely into the Gramora Escrow vault.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-accent-600/20 text-accent-300 font-bold flex items-center justify-center font-mono">
                  3
                </div>
                <h3 className="text-body font-bold text-foreground">Cold-Chain Tracking</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Follow the reefer truck in transit with live temperature telemetry logs ensuring the
                  cold chain was never broken.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-accent-600/20 text-accent-300 font-bold flex items-center justify-center font-mono">
                  4
                </div>
                <h3 className="text-body font-bold text-foreground">Dock Acceptance</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Receive fresh produce within 24 hours of harvest. Inspect weight and quality, then sign
                  off on instant digital delivery.
                </p>
              </GlassCard>
            </div>
          </div>

          {/* Section 3: Cold-Chain Logistics Fleet */}
          <div id="logistics" className="space-y-8 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-surface-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-h3 font-bold text-foreground">3. Cold-Chain Logistics Workflow</h2>
                <p className="text-caption text-foreground/60">
                  Dynamic cluster dispatch maximizing fleet payload and minimizing transit time
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-300 font-bold flex items-center justify-center font-mono">
                  1
                </div>
                <h3 className="text-body font-bold text-foreground">Cluster Route Assembly</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Algorithm combines multiple farm pickups across a geographic cluster into an optimal
                  continuous run, avoiding empty deadhead legs.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-300 font-bold flex items-center justify-center font-mono">
                  2
                </div>
                <h3 className="text-body font-bold text-foreground">Automated Sensor Telemetry</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Vehicle reefer units stream continuous temperature and humidity metrics to the platform,
                  preventing temperature excursions.
                </p>
              </GlassCard>

              <GlassCard className="space-y-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-300 font-bold flex items-center justify-center font-mono">
                  3
                </div>
                <h3 className="text-body font-bold text-foreground">Instant Waybill Settlement</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Logistics carriers receive prompt, automated per-trip settlement without protracted 60-day
                  invoicing cycles.
                </p>
              </GlassCard>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="text-center pt-8 space-y-4">
            <Link href="/register">
              <Button variant="primary" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Join The Network Now
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
