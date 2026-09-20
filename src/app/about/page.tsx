import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { ShieldCheck, Target, Users, Globe, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header Hero */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-caption font-semibold text-primary-300">
              <ShieldCheck className="w-4 h-4 text-accent-400" />
              <span>Smart India Hackathon 2026 • Problem ID 26033</span>
            </div>
            <h1 className="text-h1 sm:text-display font-extrabold text-foreground tracking-tight">
              Re-Engineering Indian Agricultural Commerce
            </h1>
            <p className="text-body sm:text-body-lg text-foreground/70 leading-relaxed">
              &ldquo;Multiple intermediaries reduce farmers earnings and increase consumer prices.&rdquo;
              We built Gramora to replace opaque, multi-tier commission structures with a transparent,
              technology-enabled direct marketplace and cold-chain logistics backbone.
            </p>
          </div>

          {/* Core Mission Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-h4 font-bold text-foreground">Our Mission</h3>
              <p className="text-body-sm text-foreground/70 leading-relaxed">
                Empower Indian smallholder farmers and FPOs to retain 85%–90% of the harvest value,
                doubling farm gate net income while simultaneously providing consumers and bulk buyers
                fresher produce at lower prices.
              </p>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-h4 font-bold text-foreground">FPO Empowerment</h3>
              <p className="text-body-sm text-foreground/70 leading-relaxed">
                Farmer Producer Organizations (FPOs) aggregate output from hundreds of marginal farmers.
                We provide FPO collectives with enterprise grade batch management, digital grading tools,
                and direct wholesale institutional buyer connections.
              </p>
            </GlassCard>

            <GlassCard className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-h4 font-bold text-foreground">Cold-Chain Logistics</h3>
              <p className="text-body-sm text-foreground/70 leading-relaxed">
                25% of India&apos;s perishable harvest spoils in transit. Our dynamic multi-stop pickup routing
                and real-time refrigerated fleet monitoring slashes spoilage to under 4%, preserving nutrition
                and shelf-life.
              </p>
            </GlassCard>
          </div>

          {/* Detailed Problem Statement Analysis */}
          <div id="transparency" className="rounded-2xl p-8 sm:p-12 glass-panel border border-surface-border space-y-6">
            <div className="max-w-3xl space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="md">
                  Detailed Analysis
                </Badge>
                <Badge variant="outline" size="sm">
                  Research Benchmarks
                </Badge>
              </div>
              <h2 className="text-h2 font-extrabold text-foreground">
                The Intermediary Dilemma in Indian Agriculture
              </h2>
              <p className="text-body text-foreground/70 leading-relaxed">
                Under the historic Agricultural Produce Market Committee (APMC) structure, smallholder
                farmers lack cold storage, private freight options, and direct price intelligence. They
                are forced to sell to local village collectors (Kachha Aadhati) at distress prices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
              <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border">
                <div className="text-h3 font-extrabold text-primary-400 font-mono">5 - 7</div>
                <div className="text-body-sm font-semibold text-foreground mt-1">Intermediary Layers</div>
                <div className="text-caption text-foreground/60 mt-0.5">Targeted for Disintermediation</div>
              </div>
              <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border">
                <div className="text-h3 font-extrabold text-accent-400 font-mono">₹45,000 Cr+</div>
                <div className="text-body-sm font-semibold text-foreground mt-1">Annual Harvest Spoilage</div>
                <div className="text-caption text-foreground/60 mt-0.5">National Post-Harvest Loss</div>
              </div>
              <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border">
                <div className="text-h3 font-extrabold text-emerald-400 font-mono">Instant</div>
                <div className="text-body-sm font-semibold text-foreground mt-1">Direct Escrow Payouts</div>
                <div className="text-caption text-foreground/60 mt-0.5">Automated Milestones</div>
              </div>
              <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border">
                <div className="text-h3 font-extrabold text-cyan-400 font-mono">32%</div>
                <div className="text-body-sm font-semibold text-foreground mt-1">Logistics Mileage Cut</div>
                <div className="text-caption text-foreground/60 mt-0.5">Simulated Fleet Efficiency</div>
              </div>
            </div>
          </div>

          {/* Interactive Exploration CTA */}
          <div className="text-center space-y-6 pt-6">
            <h3 className="text-h3 font-bold text-foreground">
              Explore The Architecture In Action
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/marketplace">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Browse Marketplace
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="glass" size="lg">
                  View Demo Dashboards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
