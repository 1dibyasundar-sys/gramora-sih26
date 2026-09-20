'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Route, RouteStop } from '@/types';
import { MapPin, Navigation, Truck, Zap, Thermometer, ShieldCheck } from 'lucide-react';

export interface RouteMapProps {
  route: Route;
  activeStopId?: string;
  onSelectStop?: (stop: RouteStop) => void;
  className?: string;
}

export function RouteMap({
  route,
  activeStopId,
  onSelectStop,
  className,
}: RouteMapProps) {
  const [selectedId, setSelectedId] = useState<string>(activeStopId || route.stops[0]?.id);

  // Scaled coordinates for clean interactive SVG visualization
  const stopPoints = [
    { id: 'stp-1', x: 120, y: 280, label: 'Stop 1: Dindori Farm' },
    { id: 'stp-2', x: 280, y: 190, label: 'Stop 2: Pimpalgaon Center' },
    { id: 'stp-3', x: 440, y: 240, label: 'Stop 3: Nashik Cold Hub' },
    { id: 'stp-4', x: 680, y: 130, label: 'Stop 4: Bhiwandi DC' },
  ];

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl overflow-hidden border border-surface-border bg-[#08110c] shadow-card flex flex-col',
        className
      )}
    >
      {/* Top Map Telemetry Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-primary/90 backdrop-blur-md border border-surface-border text-caption">
          <Truck className="w-4 h-4 text-primary-400" />
          <span className="font-semibold text-foreground">{route.vehicleNumber}</span>
          <span className="text-foreground/40">•</span>
          <span className="text-primary-400 font-mono">{route.vehicleType}</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-primary/90 backdrop-blur-md border border-surface-border text-caption">
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300">11.4°C Optimal</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-caption text-emerald-300">
            <Zap className="w-3.5 h-3.5" />
            <span>Simulated Dynamic Route</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Visualizer */}
      <div className="w-full h-80 sm:h-96 relative flex items-center justify-center p-4">
        {/* Ambient Grid overlay */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Dynamic SVG Road Network */}
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full preserve-3d"
          style={{ filter: 'drop-shadow(0 0 16px rgba(16, 185, 129, 0.15))' }}
        >
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Primary Route Path */}
          <path
            d="M 120 280 C 200 240, 220 200, 280 190 S 380 260, 440 240 S 580 150, 680 130"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeDasharray="8 4"
            strokeLinecap="round"
            className="animate-[dash_20s_linear_infinite]"
          />

          {/* Alternate Sub-optimal Route (Comparison for SIH 26033) */}
          <path
            d="M 120 280 C 180 340, 320 360, 440 240 S 640 260, 680 130"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Stops */}
          {stopPoints.map((pt, idx) => {
            const stop = route.stops[idx];
            const isSelected = stop?.id === selectedId;
            const isCompleted = stop?.status === 'completed';
            const isCurrent = stop?.status === 'arrived';

            return (
              <g
                key={pt.id}
                className="cursor-pointer transition-transform duration-200 hover:scale-110"
                onClick={() => {
                  if (stop) {
                    setSelectedId(stop.id);
                    if (onSelectStop) onSelectStop(stop);
                  }
                }}
              >
                {/* Node halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 22 : 16}
                  className={cn(
                    'transition-all duration-300',
                    isSelected
                      ? 'fill-primary-500/20 stroke-primary-400 stroke-2'
                      : isCompleted
                      ? 'fill-emerald-500/10 stroke-emerald-500/40'
                      : 'fill-surface-elevated stroke-surface-border'
                  )}
                />
                {/* Node Center */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 10 : 7}
                  className={cn(
                    isCurrent
                      ? 'fill-cyan-400 animate-ping'
                      : isCompleted
                      ? 'fill-emerald-400'
                      : 'fill-amber-400'
                  )}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 8 : 5}
                  className={isCurrent ? 'fill-cyan-400' : isCompleted ? 'fill-emerald-400' : 'fill-amber-400'}
                />
                {/* Label Text */}
                <text
                  x={pt.x}
                  y={pt.y + 34}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                  opacity={isSelected ? '1' : '0.7'}
                >
                  {stop?.locationName ? stop.locationName.split(' ')[0] : `Stop ${idx + 1}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Live Truck Indicator overlay on active route segment */}
        <div
          className="absolute top-[48%] left-[54%] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center animate-bounce"
          style={{ animationDuration: '2.5s' }}
        >
          <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg ring-4 ring-cyan-500/30">
            <Truck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-cyan-300 bg-black/80 px-2 py-0.5 rounded-full border border-cyan-500/40 mt-1 whitespace-nowrap">
            En Route (54 km/h)
          </span>
        </div>
      </div>

      {/* Bottom Route Summary Footnote */}
      <div className="p-4 border-t border-surface-border bg-surface-secondary/70 flex flex-wrap items-center justify-between gap-3 text-caption">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary-400" />
          <span className="text-foreground/80 font-medium">
            Simulated Route Visualization: Prototype route model eliminating 3 handling touchpoints
          </span>
        </div>
        <div className="flex items-center gap-4 text-foreground/60 font-mono">
          <span>Distance: {route.totalDistanceKm} km</span>
          <span>Duration: ~{route.estimatedDurationHours} hrs</span>
          <span className="text-emerald-400 font-bold">Est. Saved: {route.fuelSavedLiters}L Fuel</span>
        </div>
      </div>
    </div>
  );
}
