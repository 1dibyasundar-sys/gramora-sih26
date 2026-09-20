'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/data-display/stat-card';
import { GlassCard } from '@/components/ui/glass-card';
import { DataTable, ColumnDef } from '@/components/data-display/data-table';
import { StatusBadge } from '@/components/data-display/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '@/hooks/useOrders';
import { useInventory } from '@/hooks/useProducts';
import { useForecast } from '@/hooks/useForecast';
import { Order, InventoryItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign,
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Sparkles,
  Truck,
  CheckCircle2,
} from 'lucide-react';

export default function FarmerDashboardPage() {
  const { orders } = useOrders('farmer');
  const { inventory } = useInventory();
  const { forecasts } = useForecast();

  const activeLotsCount = inventory.length;
  const lowStockAlerts = inventory.filter((i) => i.status === 'Low Stock' || i.status === 'Critical');
  const primaryForecast = forecasts[0];

  const orderColumns: ColumnDef<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order Ref',
      cell: (row) => (
        <Link href={`/orders/${row.id}`} className="font-mono font-bold text-primary-400 hover:underline">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.buyerName}</span>
          <span className="text-caption text-foreground/50">{row.items.length} item(s)</span>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total Payout',
      cell: (row) => (
        <span className="font-mono font-bold text-foreground">
          {formatCurrency(row.subtotal)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Logistics Status',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'date',
      header: 'Placed Date',
      cell: (row) => <span className="text-caption text-foreground/60">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Link href={`/orders/${row.id}`}>
          <Button variant="ghost" size="xs">
            View Details
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <AppShell title="Farmer Operations Hub">
      <div className="space-y-8">
        {/* Top Header Bar & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Operational Overview</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Ananya Farms • Dindori, Nashik (Verified Producer Registry)
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/farmer/forecast">
              <Button variant="glass" size="sm" leftIcon={<TrendingUp className="w-4 h-4 text-primary-400" />}>
                Market Intelligence
              </Button>
            </Link>
            <Link href="/farmer/products/new">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                List New Harvest
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. KEY METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Revenue (Direct)"
            value="₹3,42,800"
            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
            trend={{ value: '+38%', direction: 'up', label: 'vs traditional mandi' }}
          />
          <StatCard
            title="Active Dispatches"
            value="2 Shipments"
            subtitle="1 Reefer truck in transit"
            icon={<Truck className="w-5 h-5 text-cyan-400" />}
          />
          <StatCard
            title="Active Lots in Storage"
            value={`${activeLotsCount} Batches`}
            subtitle="7,200 kg total available"
            icon={<Package className="w-5 h-5 text-accent-400" />}
          />
          <StatCard
            title="Next Gate Pickup"
            value="Today, 06:30 AM"
            subtitle="Reefer MH-15-EG-4921"
            icon={<Clock className="w-5 h-5 text-primary-400" />}
          />
        </div>

        {/* 2. SALES TRENDS & DEMAND FORECAST HIGHLIGHT (Meaningful Split Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sales Performance Matrix */}
          <div className="lg:col-span-7 rounded-2xl p-6 glass-panel border border-surface-border space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-body font-bold text-foreground">Direct Farmer Earnings vs Mandi Trend</h3>
                <p className="text-caption text-foreground/50">Comparative margin over last 5 harvest cycles</p>
              </div>
              <span className="text-caption font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                +38% Net Gain
              </span>
            </div>

            {/* Visual Bar Matrix */}
            <div className="space-y-3 pt-2">
              {[
                { month: 'November 2025', mandi: 21, platform: 29, volume: '1,200 kg' },
                { month: 'December 2025', mandi: 23, platform: 31, volume: '2,400 kg' },
                { month: 'January 2026', mandi: 25, platform: 34, volume: '1,800 kg' },
                { month: 'February 2026', mandi: 26, platform: 35, volume: '3,100 kg' },
                { month: 'March 2026 (Current)', mandi: 28, platform: 38, volume: '4,800 kg' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-caption text-foreground/70">
                    <span className="font-medium">{item.month} ({item.volume})</span>
                    <span className="font-mono">
                      Mandi: <span className="line-through text-foreground/40">₹{item.mandi}</span> →{' '}
                      <strong className="text-primary-400">₹{item.platform}/kg</strong>
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden flex">
                    <div
                      className="bg-zinc-600/40 h-full"
                      style={{ width: `${(item.mandi / 40) * 100}%` }}
                    />
                    <div
                      className="bg-primary-500 h-full"
                      style={{ width: `${((item.platform - item.mandi) / 40) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-caption text-foreground/50">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600/60" /> Conventional Mandi Net
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary-500" /> Gramora Direct Extra
                </span>
              </div>
            </div>
          </div>

          {/* AI Demand Intelligence Mini-Widget */}
          <div className="lg:col-span-5 space-y-5">
            {primaryForecast && (
              <GlassCard variant="accent" className="p-6 space-y-4 border border-accent-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent-400" />
                    <h3 className="text-body font-bold text-foreground">AI Market Price Advisory</h3>
                  </div>
                  <Badge variant="accent" size="sm">
                    {primaryForecast.crop}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-primary/90 border border-surface-border space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-caption text-foreground/60">Current Gate: ₹{primaryForecast.currentMandiPrice}/kg</span>
                    <span className="font-mono font-bold text-emerald-400 text-body-sm">
                      Next Month Est: ₹{primaryForecast.predictedPriceNextMonth}/kg (+{primaryForecast.priceDeltaPercent}%)
                    </span>
                  </div>
                  <p className="text-caption text-foreground/80 leading-relaxed">
                    {primaryForecast.advisoryNote}
                  </p>
                </div>

                <div className="flex items-center justify-between text-caption">
                  <span className="text-foreground/60 font-semibold">Recommended Window:</span>
                  <span className="font-bold text-accent-400">{primaryForecast.optimalHarvestWindow}</span>
                </div>

                <Link href="/farmer/forecast" className="block pt-1">
                  <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View All Crop Forecasts
                  </Button>
                </Link>
              </GlassCard>
            )}

            {/* Low Stock / Expiry Warning Box */}
            {lowStockAlerts.length > 0 && (
              <div className="rounded-xl p-4 bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-caption">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Inventory Threshold Alert ({lowStockAlerts.length})</span>
                </div>
                {lowStockAlerts.map((alert) => (
                  <div key={alert.id} className="text-caption text-foreground/80 flex items-center justify-between py-1 border-t border-amber-500/20">
                    <span className="truncate">{alert.productName}</span>
                    <span className="font-mono text-amber-300 font-semibold">{alert.availableQuantity} {alert.unit} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. RECENT ORDERS DATA TABLE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h4 font-bold text-foreground">Recent Farm Gate Orders</h3>
            <Link href="/orders">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All Orders
              </Button>
            </Link>
          </div>

          <DataTable
            columns={orderColumns}
            data={orders}
            keyExtractor={(item) => item.id}
          />
        </div>
      </div>
    </AppShell>
  );
}
