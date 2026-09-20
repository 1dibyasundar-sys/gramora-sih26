'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useForecast } from '@/hooks/useForecast';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/data-display/stat-card';
import { BarChart3, TrendingUp, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminForecastPage() {
  const { forecasts } = useForecast();

  return (
    <AppShell title="National Agricultural Price Intelligence">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-caption font-semibold text-primary-300 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>National Commodity Balance Sheet Simulation</span>
            </div>
            <h2 className="text-h3 font-bold text-foreground">
              Multi-State Agricultural Forecast & Buffer Advisory
            </h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Simulated price volatility indexes and strategic procurement recommendations for state agencies.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-elevated/70 border border-surface-border text-caption text-foreground/50 max-w-sm">
            <div className="flex items-center gap-1.5 text-accent-400 font-bold mb-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Forecast Disclaimer</span>
            </div>
            All projections are clearly labeled research simulations for SIH 2026.
          </div>
        </div>

        {/* Commodity Forecast Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forecasts.map((f) => (
            <GlassCard key={f.crop} className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-body font-bold text-foreground">{f.crop}</h3>
                  <span className="text-caption text-foreground/50">{f.variety}</span>
                </div>
                <Badge variant={f.priceDeltaPercent >= 0 ? 'success' : 'warning'} size="sm">
                  {f.priceDeltaPercent >= 0 ? `+${f.priceDeltaPercent}% Forecast` : `${f.priceDeltaPercent}% Forecast`}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-1 text-caption">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Current Mandi:</span>
                  <span className="font-mono font-bold text-foreground">₹{f.currentMandiPrice} / kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">30-Day Estimated:</span>
                  <span className="font-mono font-bold text-primary-400">₹{f.predictedPriceNextMonth} / kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Model Confidence:</span>
                  <span className="font-mono text-foreground/80">{f.confidenceScorePercent}%</span>
                </div>
              </div>

              <p className="text-caption text-foreground/70 leading-relaxed line-clamp-3">
                {f.advisoryNote}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
