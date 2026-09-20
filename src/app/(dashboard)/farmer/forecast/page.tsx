'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useForecast } from '@/hooks/useForecast';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function FarmerForecastPage() {
  const { forecasts, loading } = useForecast();
  const [selectedCropIndex, setSelectedCropIndex] = useState(0);

  const activeForecast = forecasts[selectedCropIndex] || forecasts[0];

  return (
    <AppShell title="Commodity Demand & Price Forecast">
      <div className="space-y-8">
        {/* Header with Mandatory Anti-Hallucination Disclaimer Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/15 border border-accent-500/30 text-caption font-semibold text-accent-300 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulated Predictive Machine Learning Model</span>
            </div>
            <h2 className="text-h3 font-bold text-foreground">
              Market Demand & Price Intelligence
            </h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              30-Day and 60-Day price trends modeled to prevent distress selling during mandi arrival surges.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-elevated/70 border border-surface-border text-caption text-foreground/50 max-w-sm">
            <div className="flex items-center gap-1.5 text-accent-400 font-bold mb-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Research Simulation Disclaimer</span>
            </div>
            Values labeled <strong className="text-foreground">&quot;Forecast / Estimated&quot;</strong> are generated from
            prototype historical regression curves for SIH 2026.
          </div>
        </div>

        {/* Crop Selection Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {forecasts.map((f, idx) => (
            <button
              key={f.crop}
              onClick={() => setSelectedCropIndex(idx)}
              className={`px-4 py-2.5 rounded-xl border text-body-sm font-semibold transition-all whitespace-nowrap ${
                selectedCropIndex === idx
                  ? 'bg-primary-600/20 border-primary-500 text-primary-300 ring-1 ring-primary-500/50'
                  : 'bg-surface-primary/80 border-surface-border text-foreground/70 hover:bg-surface-elevated'
              }`}
            >
              {f.crop} ({f.variety})
            </button>
          ))}
        </div>

        {activeForecast && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Historical vs Forecast Visual Curve */}
            <div className="lg:col-span-8 rounded-2xl p-6 glass-panel border border-surface-border space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-border">
                <div>
                  <h3 className="text-body font-bold text-foreground">
                    Price Horizon Curve: {activeForecast.crop}
                  </h3>
                  <span className="text-caption text-foreground/50 font-mono">
                    Current Mandi: ₹{activeForecast.currentMandiPrice}/kg • Forecast: ₹{activeForecast.predictedPriceNextMonth}/kg
                  </span>
                </div>
                <Badge variant={activeForecast.priceDeltaPercent >= 0 ? 'success' : 'warning'} size="md">
                  {activeForecast.priceDeltaPercent >= 0 ? `+${activeForecast.priceDeltaPercent}% Est.` : `${activeForecast.priceDeltaPercent}% Est.`}
                </Badge>
              </div>

              {/* Data Trend Visualization */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-caption text-foreground/60 font-semibold uppercase tracking-wider">
                  <span>Timeline (Historical → Forecast Window)</span>
                  <span>Price Benchmark (₹ / kg)</span>
                </div>

                {/* Combined Historical & Projected Trend Items */}
                <div className="space-y-2.5">
                  {activeForecast.historicalTrend.map((pt) => (
                    <div
                      key={pt.date}
                      className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border/60 flex items-center justify-between text-caption"
                    >
                      <div className="flex items-center gap-2 font-medium text-foreground/80">
                        <span className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span>{pt.date}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono">
                        <span className="text-foreground/50">Demand Index: {pt.demandIndex}/100</span>
                        <strong className="text-foreground w-16 text-right">₹{pt.price}</strong>
                      </div>
                    </div>
                  ))}

                  {activeForecast.forecastTrend.map((pt) => (
                    <div
                      key={pt.date}
                      className="p-3.5 rounded-xl bg-primary-950/30 border border-primary-500/40 flex items-center justify-between text-caption"
                    >
                      <div className="flex items-center gap-2 font-bold text-primary-300">
                        <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                        <span>{pt.date}</span>
                        <span className="text-[10px] text-accent-400 font-mono font-semibold">[ESTIMATED]</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono">
                        <span className="text-primary-400/80">Band: ₹{pt.confidenceLow} - ₹{pt.confidenceHigh}</span>
                        <strong className="text-primary-300 text-body-sm w-16 text-right">₹{pt.price}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/60 border border-surface-border text-caption text-foreground/50 flex items-center justify-between font-mono">
                <span>Model Confidence Index: <strong>{activeForecast.confidenceScorePercent}%</strong></span>
                <span>Uncertainty Margin: ±₹3.50/kg</span>
              </div>
            </div>

            {/* Right Column: Agronomic Harvesting Recommendation */}
            <div className="lg:col-span-4 space-y-6">
              <GlassCard variant="accent" className="p-6 space-y-4 border-accent-500/30">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-400" />
                  <h3 className="text-body font-bold text-foreground">Advisory Recommendation</h3>
                </div>

                <div className="space-y-2">
                  <span className="text-caption text-foreground/60 font-semibold block uppercase tracking-wider text-[11px]">
                    Recommended Harvest / Sale Window:
                  </span>
                  <div className="p-3 rounded-xl bg-surface-primary/90 border border-accent-500/30 font-bold text-accent-300 text-body-sm">
                    {activeForecast.optimalHarvestWindow}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-caption text-foreground/60 font-semibold block uppercase tracking-wider text-[11px]">
                    Intelligence Rationale:
                  </span>
                  <p className="text-caption text-foreground/80 leading-relaxed">
                    {activeForecast.advisoryNote}
                  </p>
                </div>

                <div className="pt-2 border-t border-surface-border/60">
                  <Link href="/farmer/products/new">
                    <Button variant="primary" size="sm" className="w-full">
                      List Harvest Lot for this Window
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
