'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useRoutes } from '@/hooks/useRoutes';
import { RouteMap } from '@/components/data-display/route-map';
import { ProgressBar } from '@/components/data-display/progress-bar';
import { StatusBadge } from '@/components/data-display/status-badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RouteStop } from '@/types';
import {
  Truck,
  Navigation,
  Fuel,
  Leaf,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/components/feedback/toast';

export default function RouteOptimizationPage() {
  const { routes, loading } = useRoutes();
  const { success } = useToast();
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-501');
  const [activeStop, setActiveStop] = useState<RouteStop | undefined>(undefined);

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const handleUpdateStopStatus = (stopId: string) => {
    success(`Updated Stop #${stopId} status to Verified Arrival`);
  };

  return (
    <AppShell title="Dynamic Route Optimization">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-caption font-semibold text-cyan-300 mb-2">
              <Navigation className="w-3.5 h-3.5" />
              <span>Multi-Stop Farm Collection Optimization</span>
            </div>
            <h2 className="text-h3 font-bold text-foreground">
              Dynamic Cluster Route Engine
            </h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Consolidating multiple farm pickups into continuous cold-chain corridors to minimize deadhead miles.
            </p>
          </div>

          {/* Route Switcher */}
          <div className="flex items-center gap-2">
            {routes.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRouteId(r.id);
                  setActiveStop(r.stops[0]);
                }}
                className={`px-3.5 py-2 rounded-xl border text-body-sm font-semibold transition-all ${
                  selectedRouteId === r.id
                    ? 'bg-primary-600/20 border-primary-500 text-primary-300 ring-1 ring-primary-500/50'
                    : 'bg-surface-primary/80 border-surface-border text-foreground/70 hover:bg-surface-elevated'
                }`}
              >
                {r.routeNumber} ({r.stopsCount} stops)
              </button>
            ))}
          </div>
        </div>

        {activeRoute && (
          <div className="space-y-8">
            {/* Top Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface-primary border border-surface-border space-y-1">
                <span className="text-caption text-foreground/50">Corridor Distance</span>
                <div className="text-h4 font-bold text-foreground font-mono">{activeRoute.totalDistanceKm} km</div>
                <span className="text-caption text-emerald-400 font-semibold">-34 km vs single trips</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-primary border border-surface-border space-y-1">
                <span className="text-caption text-foreground/50">Est. Total Duration</span>
                <div className="text-h4 font-bold text-foreground font-mono">{activeRoute.estimatedDurationHours} Hours</div>
                <span className="text-caption text-foreground/50">Including dock handling</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-primary border border-surface-border space-y-1">
                <span className="text-caption text-foreground/50">Payload Weight Utilization</span>
                <div className="text-h4 font-bold text-primary-400 font-mono">
                  {Math.round((activeRoute.currentLoadKg / activeRoute.vehicleCapacityKg) * 100)}%
                </div>
                <span className="text-caption text-foreground/50 font-mono">
                  {activeRoute.currentLoadKg} / {activeRoute.vehicleCapacityKg} kg
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-primary border border-surface-border space-y-1">
                <span className="text-caption text-foreground/50">Fuel Saved by AI Bundling</span>
                <div className="text-h4 font-bold text-accent-400 font-mono">{activeRoute.fuelSavedLiters} L</div>
                <span className="text-caption text-foreground/50 font-mono">{activeRoute.co2AvoidedKg} kg CO2 avoided</span>
              </div>
            </div>

            {/* Visual Map Canvas Placeholder Abstraction */}
            <RouteMap
              route={activeRoute}
              activeStopId={activeStop?.id}
              onSelectStop={(s) => setActiveStop(s)}
            />

            {/* Turn by turn stops table */}
            <div className="rounded-2xl p-6 glass-panel border border-surface-border space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <h3 className="text-body font-bold text-foreground">Stop Sequence Manifest</h3>
                  <p className="text-caption text-foreground/50">Click any stop to view driver dispatch instructions</p>
                </div>
                <Badge variant="primary" size="sm">
                  {activeRoute.vehicleNumber} ({activeRoute.vehicleType})
                </Badge>
              </div>

              <div className="space-y-3">
                {activeRoute.stops.map((stop) => (
                  <div
                    key={stop.id}
                    onClick={() => setActiveStop(stop)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      activeStop?.id === stop.id
                        ? 'bg-primary-600/15 border-primary-500 ring-1 ring-primary-500/40'
                        : 'bg-surface-elevated/60 border-surface-border hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-body-sm shrink-0 mt-0.5 ${
                          stop.status === 'completed'
                            ? 'bg-emerald-500 text-black'
                            : stop.status === 'arrived'
                            ? 'bg-cyan-500 text-black animate-pulse'
                            : 'bg-surface-border text-foreground/50'
                        }`}
                      >
                        {stop.sequence}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-body-sm font-bold text-foreground">{stop.locationName}</h4>
                          <span className="text-caption text-foreground/50 font-mono">({stop.district})</span>
                        </div>
                        <p className="text-caption text-foreground/70">{stop.cargoDescription}</p>
                        <div className="flex items-center gap-3 text-caption text-foreground/50 font-mono pt-1">
                          <span>Contact: {stop.contactPerson} ({stop.contactPhone})</span>
                          <span>•</span>
                          <span>Payload: {stop.weightKg} kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between shrink-0">
                      <StatusBadge status={stop.status} size="sm" />
                      <span className="text-caption font-mono text-foreground/60">{stop.scheduledTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
