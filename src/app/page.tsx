'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { AppImage } from '@/components/data-display/app-image';
import { PriceDisplay } from '@/components/data-display/price-display';
import { useFeaturedProducts } from '@/hooks/useProducts';
import {
  Sprout,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Truck,
  Layers,
  ChevronRight,
  Sparkles,
  DollarSign,
  Clock,
  Award,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  MapPin,
  Route,
} from 'lucide-react';

export default function LandingPage() {
  const [activeStepTab, setActiveStepTab] = useState<'farmer' | 'buyer' | 'logistics'>('farmer');
  const { products: featuredProducts, loading: loadingProducts } = useFeaturedProducts();

  // Featured 3 crops for the marketplace preview section
  const previewProducts = featuredProducts.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32 border-b border-surface-border">
          {/* Subtle Ambient Gradients */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary-600/10 rounded-full blur-[140px] pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-accent-500/10 rounded-full blur-[120px] pointer-events-none"
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Hero Content */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-caption font-semibold text-primary-300">
                  <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                  <span>Smart India Hackathon 2026 • Problem 26033</span>
                </div>

                <h1 className="text-h1 sm:text-display font-extrabold tracking-tight text-foreground leading-[1.15]">
                  Direct Farm Commerce.{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-300 to-accent-400">
                    Zero Middlemen Markups.
                  </span>
                </h1>

                <p className="text-body sm:text-body-lg text-foreground/75 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Traditional agriculture siphons 45% of harvest value through 5 to 7 layers of
                  commission agents. Gramora connects Farmers and FPOs directly with bulk buyers
                  and consumers with verified quality grading, transparent price discovery, and
                  smart cold-chain dispatch.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link href="/marketplace">
                    <Button
                      variant="primary"
                      size="lg"
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                      className="shadow-glow"
                    >
                      Explore Marketplace
                    </Button>
                  </Link>
                  <Link href="/register?role=farmer">
                    <Button variant="glass" size="lg">
                      Join as Farmer / FPO
                    </Button>
                  </Link>
                </div>

                {/* Proof Metrics Strip */}
                <div className="pt-8 border-t border-surface-border/60 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-left">
                  <div>
                    <div className="text-h3 font-extrabold text-primary-400 font-mono">+38%</div>
                    <div className="text-caption text-foreground/60 font-medium">Farmer Net Earning</div>
                  </div>
                  <div>
                    <div className="text-h3 font-extrabold text-foreground font-mono">-24%</div>
                    <div className="text-caption text-foreground/60 font-medium">Consumer Price Reduction</div>
                  </div>
                  <div>
                    <div className="text-h3 font-extrabold text-accent-400 font-mono">100%</div>
                    <div className="text-caption text-foreground/60 font-medium">Escrow Protected</div>
                  </div>
                </div>
              </div>

              {/* Right Hero Visual Area (Controlled Agricultural Commerce Card) */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Floating Price Comparison Highlight Card */}
                  <GlassCard
                    variant="strong"
                    className="p-6 relative z-10 border border-primary-500/30"
                    glow
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm">
                          Simulated Farm Trade
                        </Badge>
                        <span className="text-[11px] text-foreground/50 font-mono">Dindori, Nashik (Demo)</span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                        <AppImage
                          src="https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=80"
                          alt="Nashik Onions"
                          aspectRatio="square"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-body font-bold text-foreground truncate">
                          Nashik Garwa Red Onions
                        </h4>
                        <p className="text-caption text-foreground/60">Ananya Farms (Verified)</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-h4 font-bold text-primary-400 font-mono">₹28</span>
                          <span className="text-caption text-foreground/40 line-through">₹38 Mandi</span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            +35% to Farmer
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Value Distribution Breakdown */}
                    <div className="mt-5 p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2 text-caption">
                      <div className="flex justify-between items-center text-foreground/80">
                        <span>Direct Farmer Payout:</span>
                        <span className="font-bold text-emerald-400 font-mono">₹25.20 / kg (90%)</span>
                      </div>
                      <div className="flex justify-between items-center text-foreground/60">
                        <span>Reefer Logistics & QC:</span>
                        <span className="font-mono">₹2.10 / kg (7.5%)</span>
                      </div>
                      <div className="flex justify-between items-center text-foreground/60">
                        <span>Digital Platform Escrow Fee:</span>
                        <span className="font-mono">₹0.70 / kg (2.5%)</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-caption text-foreground/60">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        Dispatched in Reefer Fleet
                      </span>
                      <span className="font-mono text-emerald-400">11.4°C Monitored</span>
                    </div>
                  </GlassCard>

                  {/* Secondary Backing Card for Visual Layering */}
                  <div
                    className="absolute -bottom-4 -left-4 w-full h-full rounded-2xl bg-primary-950/40 border border-primary-500/20 -z-0 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PROBLEM BREAKDOWN (SIH Problem Statement 26033) */}
        <section className="py-20 border-b border-surface-border bg-surface-primary/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <Badge variant="warning" size="md">
                The Core Problem
              </Badge>
              <h2 className="text-h2 font-extrabold text-foreground">
                How Intermediaries Erode 45%–60% of Agricultural Value
              </h2>
              <p className="text-body text-foreground/60 leading-relaxed">
                In India&apos;s conventional APMC mandi pipeline, produce changes hands up to 7 times
                between field and fork, with every middleman adding speculative markups while
                prolonging transit perishability.
              </p>
            </div>

            {/* Traditional vs Gramora Comparison Flow */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Conventional Flawed Pipeline */}
              <div className="rounded-2xl p-6 sm:p-8 bg-rose-950/10 border border-rose-500/20 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Traditional Mandi System</span>
                  </div>
                  <span className="text-caption font-bold text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-500/30">
                    Farmer gets only 35%
                  </span>
                </div>

                <div className="space-y-3 font-mono text-caption text-foreground/70">
                  <div className="p-3 rounded-lg bg-surface-elevated/50 border border-surface-border flex items-center justify-between">
                    <span>1. Smallholder Harvest</span>
                    <span className="text-foreground">₹15 / kg</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/50 border border-surface-border flex items-center justify-between">
                    <span>2. Village Aggregator Markup</span>
                    <span className="text-rose-400">+₹4 (+26%)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/50 border border-surface-border flex items-center justify-between">
                    <span>3. Mandi Commission Agent (Aadhati)</span>
                    <span className="text-rose-400">+₹6 (+31%)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/50 border border-surface-border flex items-center justify-between">
                    <span>4. Regional Wholesaler</span>
                    <span className="text-rose-400">+₹7 (+28%)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/50 border border-surface-border flex items-center justify-between">
                    <span>5. City Retailer / Final Consumer</span>
                    <span className="font-bold text-foreground">₹42 / kg (180% higher!)</span>
                  </div>
                </div>

                <p className="text-caption text-rose-300/80 italic">
                  Result: Post-harvest spoilage hits 28%, payments delayed 45+ days, zero pricing
                  transparency for the grower.
                </p>
              </div>

              {/* Gramora Direct Solution Pipeline */}
              <div className="rounded-2xl p-6 sm:p-8 bg-emerald-950/15 border border-emerald-500/30 space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Gramora Direct Ecosystem</span>
                  </div>
                  <span className="text-caption font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/40">
                    Farmer retains 88%–92%
                  </span>
                </div>

                <div className="space-y-3 font-mono text-caption text-foreground/80">
                  <div className="p-3 rounded-lg bg-surface-elevated/80 border border-primary-500/30 flex items-center justify-between">
                    <span>1. Farmer / FPO Direct Gate Price</span>
                    <span className="font-bold text-emerald-400">₹24 / kg (+60% net income)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/80 border border-surface-border flex items-center justify-between">
                    <span>2. Optimized Cold-Chain Transit</span>
                    <span className="text-foreground/70">+₹2.80 / kg (Direct fleet)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/80 border border-surface-border flex items-center justify-between">
                    <span>3. Quality Verification & Escrow Fee</span>
                    <span className="text-foreground/70">+₹0.70 / kg (2.5%)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/80 border border-primary-500/30 flex items-center justify-between">
                    <span>4. Final Delivered Price to Buyer</span>
                    <span className="font-bold text-foreground">₹27.50 / kg (35% savings!)</span>
                  </div>
                </div>

                <p className="text-caption text-emerald-300/90 font-medium">
                  Instant escrow disbursement upon dock weighing. Spoilage reduced to &lt; 4% via
                  continuous cold-chain telemetry.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. PLATFORM SOLUTION */}
        <section className="py-20 border-b border-surface-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <Badge variant="primary" size="md">
                Complete Architecture
              </Badge>
              <h2 className="text-h2 font-extrabold text-foreground">
                An Integrated Digital Commerce & Logistics Pipeline
              </h2>
              <p className="text-body text-foreground/60 leading-relaxed">
                We replace fragmented speculation with an end-to-end data-driven infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard variant="interactive" className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
                  <Sprout className="w-6 h-6" />
                </div>
                <h3 className="text-body font-bold text-foreground">1. Farmers & FPOs</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  List harvest batches, specify Agmark quality grades, track real-time mandi benchmark
                  deltas, and lock in guaranteed sales contracts.
                </p>
              </GlassCard>

              <GlassCard variant="interactive" className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-body font-bold text-foreground">2. Digital Marketplace</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Transparent bidding, volume MOQ discounts, verifiable origin certificates, and automated
                  smart escrow payments.
                </p>
              </GlassCard>

              <GlassCard variant="interactive" className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-body font-bold text-foreground">3. Cold-Chain Logistics</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Reefer truck dispatch, multi-point cluster farm collection, and continuous temperature
                  logging for zero spoilage.
                </p>
              </GlassCard>

              <GlassCard variant="interactive" className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-body font-bold text-foreground">4. Consumers & Buyers</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Direct dock-to-door delivery with 24-hour harvest freshness, traceable origin QR tags,
                  and 20–35% cost savings.
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS (INTERACTIVE TABS) */}
        <section className="py-20 border-b border-surface-border bg-surface-primary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
              <Badge variant="secondary" size="md">
                User Journeys
              </Badge>
              <h2 className="text-h2 font-extrabold text-foreground">
                Built For Every Participant In The Agricultural Value Chain
              </h2>
            </div>

            {/* Role Tab Switcher */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex p-1.5 rounded-2xl bg-surface-elevated border border-surface-border">
                <button
                  onClick={() => setActiveStepTab('farmer')}
                  className={`px-5 py-2.5 rounded-xl text-body-sm font-bold transition-all ${
                    activeStepTab === 'farmer'
                      ? 'bg-primary-600 text-white shadow-subtle'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  For Farmers & FPOs
                </button>
                <button
                  onClick={() => setActiveStepTab('buyer')}
                  className={`px-5 py-2.5 rounded-xl text-body-sm font-bold transition-all ${
                    activeStepTab === 'buyer'
                      ? 'bg-primary-600 text-white shadow-subtle'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  For Bulk Buyers & Consumers
                </button>
                <button
                  onClick={() => setActiveStepTab('logistics')}
                  className={`px-5 py-2.5 rounded-xl text-body-sm font-bold transition-all ${
                    activeStepTab === 'logistics'
                      ? 'bg-primary-600 text-white shadow-subtle'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  For Logistics Fleets
                </button>
              </div>
            </div>

            {/* Tab 1: Farmer Flow */}
            {activeStepTab === 'farmer' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-primary-400 font-mono">01</div>
                  <h3 className="text-body font-bold text-foreground">List Crop & Set Gate Price</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Upload harvest photos, grade, quantity, and moisture parameters. Platform suggests
                    fair market rates above local mandi commission cuts.
                  </p>
                </GlassCard>
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-primary-400 font-mono">02</div>
                  <h3 className="text-body font-bold text-foreground">Farm Gate Inspection & Reefer Pickup</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Verified cold-chain vehicle arrives directly at your farm or FPO collection center.
                    Produce is weighed digitally with zero deductions.
                  </p>
                </GlassCard>
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-primary-400 font-mono">03</div>
                  <h3 className="text-body font-bold text-foreground">Instant Escrow Payout</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Upon delivery gate verification, locked buyer funds disburse directly to your bank
                    account within minutes without middlemen delay.
                  </p>
                </GlassCard>
              </div>
            )}

            {/* Tab 2: Buyer Flow */}
            {activeStepTab === 'buyer' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-accent-400 font-mono">01</div>
                  <h3 className="text-body font-bold text-foreground">Source Direct from Verified Farms</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Search 100+ fresh crops with batch certificates, moisture readings, and origin farm
                    profiles. Compare direct prices against mandi benchmarks.
                  </p>
                </GlassCard>
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-accent-400 font-mono">02</div>
                  <h3 className="text-body font-bold text-foreground">Secure Escrow Checkout</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Lock payment into an audited digital escrow. Funds remain protected until quality is
                    inspected and verified at your delivery dock.
                  </p>
                </GlassCard>
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-accent-400 font-mono">03</div>
                  <h3 className="text-body font-bold text-foreground">Live Telemetry & Dock Delivery</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Track the vehicle in real-time with continuous cold-chain temperature monitoring.
                    Receive produce within 24 hours of harvest.
                  </p>
                </GlassCard>
              </div>
            )}

            {/* Tab 3: Logistics Flow */}
            {activeStepTab === 'logistics' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-cyan-400 font-mono">01</div>
                  <h3 className="text-body font-bold text-foreground">AI Cluster Stop Dispatch</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Routes are bundled dynamically across adjacent farms to maximize cargo payload
                    capacity and eliminate deadhead mileage.
                  </p>
                </GlassCard>
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-cyan-400 font-mono">02</div>
                  <h3 className="text-body font-bold text-foreground">Integrated Thermal Telemetry</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Reefer temperature sensors sync automatically with the consignment ledger, ensuring
                    zero dispute cold-chain compliance.
                  </p>
                </GlassCard>
                <GlassCard className="space-y-3">
                  <div className="text-h3 font-black text-cyan-400 font-mono">03</div>
                  <h3 className="text-body font-bold text-foreground">Guaranteed Freight Settlement</h3>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    Fleet operators receive fast, automated per-trip settlement immediately upon digital
                    dropoff confirmation.
                  </p>
                </GlassCard>
              </div>
            )}
          </div>
        </section>

        {/* 10. MARKETPLACE PREVIEW SECTION */}
        <section className="py-20 border-b border-surface-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <Badge variant="primary" size="md">
                  Direct Catalog
                </Badge>
                <h2 className="text-h2 font-extrabold text-foreground mt-2">
                  Featured Harvest Listings
                </h2>
                <p className="text-body text-foreground/60 mt-1">
                  Active consignments available for immediate direct ordering with verified price deltas.
                </p>
              </div>
              <Link href="/marketplace">
                <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All Listings
                </Button>
              </Link>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-2xl border border-surface-border bg-surface-primary/50 h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {previewProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-2xl border border-surface-border bg-surface-primary overflow-hidden flex flex-col group hover:border-primary-500/40 transition-all duration-200 shadow-card"
                >
                  <div className="relative">
                    <AppImage
                      src={prod.images[0]}
                      alt={prod.title}
                      aspectRatio="landscape"
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge variant="secondary" size="sm">
                        {prod.qualityGrade}
                      </Badge>
                      {prod.organicCertified && (
                        <Badge variant="success" size="sm">
                          Organic
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-caption text-foreground/50 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-primary-400" />
                        <span>{prod.location.district}, {prod.location.state}</span>
                      </div>
                      <h3 className="text-body font-bold text-foreground line-clamp-1">
                        {prod.title}
                      </h3>
                      <p className="text-caption text-foreground/60 mt-0.5">
                        Seller: {prod.sellerName}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-surface-border flex items-end justify-between gap-2">
                      <PriceDisplay
                        pricePerUnit={prod.pricePerUnit}
                        unit={prod.unit}
                        marketMandiPrice={prod.marketMandiPrice}
                        size="sm"
                      />
                      <Link href={`/marketplace/${prod.id}`}>
                        <Button variant="secondary" size="xs">
                          Inspect Batch
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </section>

        {/* 8. DEMAND INTELLIGENCE & ROUTE OPTIMIZATION PREVIEW */}
        <section className="py-20 border-b border-surface-border bg-surface-primary/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge variant="accent" size="md">
                  Predictive Technology
                </Badge>
                <h2 className="text-h2 font-extrabold text-foreground">
                  AI-Assisted Demand Intelligence & Multi-Stop Route Optimization
                </h2>
                <p className="text-body text-foreground/70 leading-relaxed">
                  Farmers frequently suffer distressed sales due to unexpected mandi arrival gluts.
                  Gramora continuously monitors regional planting schedules, weather, and wholesale
                  arrivals to provide clear price forecasts and optimal harvest windows.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400 shrink-0 mt-0.5">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-body-sm font-bold text-foreground">
                        30-Day & 60-Day Price Forecast Bands
                      </h4>
                      <p className="text-caption text-foreground/60 mt-0.5">
                        Historical commodity modeling with confidence intervals to help farmers decide
                        whether to sell immediately or cold-store.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Route className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-body-sm font-bold text-foreground">
                        Cluster Pickup Optimization
                      </h4>
                      <p className="text-caption text-foreground/60 mt-0.5">
                        Consolidates multiple farm pickups into a single cold-chain run, slashing logistics
                        overhead by 32% and reducing carbon footprint.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/farmer/forecast">
                    <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Explore Price Intelligence
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Visual Demo Card */}
              <GlassCard variant="strong" className="p-6 space-y-4 border border-accent-500/30">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <span className="text-caption font-bold text-foreground">
                      Simulated AI Market Advisory
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-foreground/50">Nashik Zone</span>
                </div>

                <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-body font-bold text-foreground">Garwa Red Onions</span>
                    <span className="text-body-sm font-bold text-emerald-400 font-mono">+28.5% Predicted</span>
                  </div>
                  <p className="text-caption text-foreground/70 leading-relaxed">
                    &ldquo;Estimated seasonal arrivals in northern mandis will decrease by ~32% next month.
                    Storing dried stock in well-ventilated structures for 20 days is predicted to yield
                    higher net margins.&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-foreground/50 pt-1 border-t border-surface-border/60">
                    <span>Confidence: 89%</span>
                    <span className="text-accent-400 font-semibold">Harvest Window: 10-18 Days</span>
                  </div>
                </div>

                <div className="text-caption text-foreground/40 text-center italic">
                  * Clearly labeled simulation model — ready for national Agmarknet data ingestion
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* 11. TRUST & TRANSPARENCY SECTION */}
        <section className="py-20 border-b border-surface-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
              <Badge variant="secondary" size="md">
                Trust & Verification
              </Badge>
              <h2 className="text-h2 font-extrabold text-foreground">
                Eliminating Distrust with Open Verification
              </h2>
              <p className="text-body text-foreground/60 leading-relaxed">
                Both growers and commercial buyers require ironclad guarantees before executing direct
                trades without legacy brokers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-surface-primary border border-surface-border space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-body font-bold text-foreground">Standardized Quality Grading</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Every listed lot is categorized under objective Agmark and Jaivik Bharat parameters:
                  moisture percentages, physical caliber, defect thresholds, and shelf-life ratings.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-surface-primary border border-surface-border space-y-3">
                <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-body font-bold text-foreground">Guaranteed Escrow Protection</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Buyer payments are deposited into a neutral digital escrow upon order confirmation,
                  protecting growers against non-payment and buyers against non-delivery.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-surface-primary border border-surface-border space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-body font-bold text-foreground">Cold-Chain Temperature Logs</h3>
                <p className="text-caption text-foreground/70 leading-relaxed">
                  Active thermal sensors stream real-time temperature logs throughout the transit corridor,
                  preventing disputes over transit degradation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 12. CALL TO ACTION BANNER */}
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-surface-primary to-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
            <Badge variant="primary" size="md">
              Start Direct Trading
            </Badge>
            <h2 className="text-h2 sm:text-h1 font-extrabold text-foreground tracking-tight">
              Ready to Reclaim Farm Profitability?
            </h2>
            <p className="text-body sm:text-body-lg text-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Join thousands of progressive farmers, FPO collectives, and commercial bulk buyers who are
              bypassing intermediate markups and transacting directly today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/register">
                <Button
                  variant="primary"
                  size="xl"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="shadow-glow"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="glass" size="xl">
                  Launch Interactive Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
