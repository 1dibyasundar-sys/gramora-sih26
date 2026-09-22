'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/data-display/stat-card';
import { GlassCard } from '@/components/ui/glass-card';
import { RouteMap } from '@/components/data-display/route-map';
import { ProgressBar } from '@/components/data-display/progress-bar';
import { StatusBadge } from '@/components/data-display/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRoutes } from '@/hooks/useRoutes';
import { useAuth } from '@/hooks/useAuth';
import { Truck, Navigation, Fuel, Leaf, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function LogisticsDashboardPage() {
  const { user } = useAuth();
  const { routes } = useRoutes();
  const activeRoute = routes[0];

  return (
    <AppShell title="Cold-Chain Fleet Command">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Fleet Operations Overview</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              {user?.organization
                ? `${user.organization} • ${user.location?.district ? `${user.location.district}, ` : ''}${user.location?.state || 'Cold-Chain Fleet Command'}`
                : user?.name
                ? `${user.name} • Cold-Chain Fleet Command`
                : 'Cold-Chain Fleet Command'}
            </p>
          </div>
          <Link href="/logistics/routes">
            <Button variant="primary" size="sm" leftIcon={<Navigation className="w-4 h-4" />}>
              Interactive Route Optimizer
            </Button>
          </Link>
        </div>

        {/* 1. KEY LOGISTICS METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Active Dispatched Routes"
            value="2 Active Runs"
            subtitle="MH & KA corridors"
            icon={<Truck className="w-5 h-5 text-cyan-400" />}
          />
          <StatCard
            title="Fleet Capacity Utilization"
            value="82%"
            subtitle="4,100 / 5,000 kg loaded"
            icon={<Navigation className="w-5 h-5 text-emerald-400" />}
            trend={{ value: '+14%', direction: 'up', label: 'cluster efficiency' }}
          />
          <StatCard
            title="Fuel Saved by AI Routing"
            value="24 Liters"
            subtitle="Today's runs"
            icon={<Fuel className="w-5 h-5 text-amber-400" />}
          />
          <StatCard
            title="Cold-Chain Compliance"
            value="99.8%"
            subtitle="Zero thermal excursions"
            icon={<Leaf className="w-5 h-5 text-primary-400" />}
          />
        </div>

        {/* 2. ACTIVE LIVE ROUTE VISUALIZATION (ROUTEMAP INTEGRATION) */}
        {activeRoute && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-h4 font-bold text-foreground">
                  Active Corridor: {activeRoute.routeNumber} ({activeRoute.vehicleNumber})
                </h3>
              </div>
              <Link href="/logistics/routes">
                <Button variant="outline" size="xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Full Map View
                </Button>
              </Link>
            </div>

            <RouteMap route={activeRoute} />
          </div>
        )}

        {/* 3. VEHICLE LOAD CAPACITY & STOPS PROGRESS */}
        {activeRoute && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Stops Sequence Checklist */}
            <div className="lg:col-span-7 rounded-2xl p-6 glass-panel border border-surface-border space-y-4">
              <h3 className="text-body font-bold text-foreground">Multi-Stop Turn-by-Turn Progress</h3>
              <div className="space-y-3">
                {activeRoute.stops.map((stop) => (
                  <div
                    key={stop.id}
                    className="p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-caption font-bold ${
                          stop.status === 'completed'
                            ? 'bg-emerald-500 text-black'
                            : stop.status === 'arrived'
                            ? 'bg-cyan-500 text-black animate-pulse'
                            : 'bg-surface-border text-foreground/50'
                        }`}
                      >
                        {stop.sequence}
                      </div>
                      <div>
                        <h4 className="text-body-sm font-bold text-foreground">{stop.locationName}</h4>
                        <span className="text-caption text-foreground/50">{stop.cargoDescription}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={stop.status} size="sm" />
                      <span className="text-[11px] text-foreground/50 block mt-1 font-mono">{stop.scheduledTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Cargo Payload Meter */}
            <div className="lg:col-span-5 rounded-2xl p-6 glass-panel border border-surface-border space-y-5">
              <h3 className="text-body font-bold text-foreground">Vehicle Capacity & Thermal Status</h3>

              <div className="p-4 rounded-xl bg-surface-elevated/80 border border-surface-border space-y-3">
                <ProgressBar
                  value={activeRoute.currentLoadKg}
                  max={activeRoute.vehicleCapacityKg}
                  label="Reefer Payload Weight"
                  helperText={`${activeRoute.currentLoadKg} kg of ${activeRoute.vehicleCapacityKg} kg max payload`}
                  variant="primary"
                  size="md"
                />

                <div className="pt-3 border-t border-surface-border flex items-center justify-between text-caption font-mono">
                  <span className="text-foreground/60">Active Reefer Temp:</span>
                  <strong className="text-cyan-400">11.4°C (Pre-set 12°C)</strong>
                </div>
                <div className="flex items-center justify-between text-caption font-mono">
                  <span className="text-foreground/60">Estimated Fuel Burn:</span>
                  <strong className="text-foreground/90">8.2 km / Liter</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-caption text-emerald-300">
                <strong className="block mb-0.5">Carbon Offset Calculation:</strong>
                This consolidated route prevents {activeRoute.co2AvoidedKg}kg of CO2 emissions compared to separate individual farm runs.
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
