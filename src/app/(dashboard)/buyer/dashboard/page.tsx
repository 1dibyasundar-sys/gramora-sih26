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
import { PriceDisplay } from '@/components/data-display/price-display';
import { AppImage } from '@/components/data-display/app-image';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { Order } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingBag,
  Truck,
  TrendingDown,
  Store,
  ArrowRight,
  ShieldCheck,
  Thermometer,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function BuyerDashboardPage() {
  const { orders } = useOrders('bulk_buyer');
  const { products } = useProducts();

  const activeDeliveries = orders.filter((o) => o.status === 'in_transit' || o.status === 'picked_up');
  const recommendedCrops = products.slice(0, 3);

  const orderColumns: ColumnDef<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Consignment Ref',
      cell: (row) => (
        <Link href={`/orders/${row.id}`} className="font-mono font-bold text-primary-400 hover:underline">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: 'seller',
      header: 'Farm Source',
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.sellerName}</span>
          <span className="text-caption text-foreground/50">{row.items[0]?.productName}</span>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Escrow Amount',
      cell: (row) => (
        <span className="font-mono font-bold text-foreground">
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'est',
      header: 'Est. Dock Arrival',
      cell: (row) => (
        <span className="text-caption text-foreground/70 font-mono">
          {formatDate(row.estimatedDelivery)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Link href={`/orders/${row.id}`}>
          <Button variant="ghost" size="xs">
            Track Reefer
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <AppShell title="Procurement & Tracking Workspace">
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Buyer Procurement Center</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Direct sourcing from verified agricultural clusters with zero brokerage
            </p>
          </div>
          <Link href="/marketplace">
            <Button variant="primary" size="sm" leftIcon={<Store className="w-4 h-4" />}>
              Source Fresh Crops
            </Button>
          </Link>
        </div>

        {/* 1. KEY PROCUREMENT METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Active Consignments"
            value={`${activeDeliveries.length} Shipments`}
            subtitle="Cold-chain verified"
            icon={<Truck className="w-5 h-5 text-cyan-400" />}
          />
          <StatCard
            title="Procurement Savings"
            value="26.4%"
            icon={<TrendingDown className="w-5 h-5 text-emerald-400" />}
            trend={{ value: 'Save ₹46,200', direction: 'up', label: 'vs Mandi wholesale' }}
          />
          <StatCard
            title="Total Spend (Escrow)"
            value="₹1,82,550"
            subtitle="All funds protected"
            icon={<ShieldCheck className="w-5 h-5 text-primary-400" />}
          />
          <StatCard
            title="Saved Producer Farms"
            value="14 Farms / FPOs"
            subtitle="Direct contracted"
            icon={<ShoppingBag className="w-5 h-5 text-accent-400" />}
          />
        </div>

        {/* 2. ACTIVE IN-TRANSIT COLD CHAIN DELIVERIES (HIGH IMPACT TRACKING WIDGET) */}
        {activeDeliveries.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-h4 font-bold text-foreground">Active In-Transit Reefer Shipments</h3>
              </div>
              <Badge variant="info" size="sm">
                Live Sensor Telemetry
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeDeliveries.map((delivery) => (
                <GlassCard key={delivery.id} variant="strong" className="p-5 space-y-4 border-cyan-500/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-body-sm text-cyan-400">
                        {delivery.orderNumber}
                      </span>
                      <h4 className="text-body font-bold text-foreground mt-0.5">
                        {delivery.items.map((i) => `${i.quantity}${i.unit} ${i.productName}`).join(', ')}
                      </h4>
                      <p className="text-caption text-foreground/50">
                        Origin: {delivery.sellerName}
                      </p>
                    </div>
                    <StatusBadge status={delivery.status} size="sm" />
                  </div>

                  {delivery.coldChainTelemetry && (
                    <div className="p-3 rounded-xl bg-surface-primary/90 border border-surface-border flex items-center justify-between text-caption font-mono">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-cyan-400" />
                        <span>Temp: <strong className="text-cyan-300">{delivery.coldChainTelemetry.currentTempCelsius}°C</strong> (Target: {delivery.coldChainTelemetry.targetTempCelsius}°C)</span>
                      </div>
                      <span className="text-emerald-400 font-semibold">{delivery.coldChainTelemetry.sensorStatus}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-surface-border text-caption">
                    <span className="flex items-center gap-1.5 text-foreground/60">
                      <Clock className="w-3.5 h-3.5 text-foreground/40" />
                      Est. Arrival: {formatDate(delivery.estimatedDelivery)}
                    </span>
                    <Link href={`/orders/${delivery.id}`}>
                      <Button variant="outline" size="xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Inspect Timeline
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* 3. RECENT ORDERS TABLE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h4 font-bold text-foreground">Recent Procurement Orders</h3>
            <Link href="/orders">
              <Button variant="ghost" size="sm">
                View All Orders
              </Button>
            </Link>
          </div>

          <DataTable
            columns={orderColumns}
            data={orders}
            keyExtractor={(i) => i.id}
          />
        </div>

        {/* 4. RECOMMENDED SEASONAL CROPS (DIRECT PROCUREMENT) */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-400" />
              <h3 className="text-h4 font-bold text-foreground">Seasonal Harvest Recommendations</h3>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm">
                Browse Full Catalog
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {recommendedCrops.map((crop) => (
              <div
                key={crop.id}
                className="rounded-xl border border-surface-border bg-surface-primary p-4 space-y-3 flex flex-col justify-between hover:border-primary-500/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="w-full h-32 rounded-lg overflow-hidden">
                    <AppImage src={crop.images[0]} alt={crop.title} aspectRatio="landscape" />
                  </div>
                  <h4 className="text-body-sm font-bold text-foreground line-clamp-1">{crop.title}</h4>
                  <p className="text-caption text-foreground/50 truncate">Seller: {crop.sellerName}</p>
                </div>

                <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                  <PriceDisplay
                    pricePerUnit={crop.pricePerUnit}
                    unit={crop.unit}
                    marketMandiPrice={crop.marketMandiPrice}
                    size="sm"
                  />
                  <Link href={`/marketplace/${crop.id}`}>
                    <Button variant="secondary" size="xs">
                      Order
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
