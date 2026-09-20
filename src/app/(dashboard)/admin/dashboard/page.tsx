'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/data-display/stat-card';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminDashboardMetrics } from '@/server/domain/admin';
import {
  Users,
  Sprout,
  ShoppingBag,
  Truck,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Package,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { role, loading } = useAuth();
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  };

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/login');
    }
  }, [loading, role, router]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        setFetching(true);
        const res = await fetch('/api/v1/admin/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Failed to fetch metrics: ${res.status}`);
        }

        const json = await res.json();
        setMetrics(json.data);
      } catch (err: unknown) {
        setFetchError(err instanceof Error ? err.message : 'Error loading dashboard metrics');
      } finally {
        setFetching(false);
      }
    };

    if (role === 'admin') {
      fetchMetrics();
    }
  }, [role]);

  return (
    <AppShell title="Ecosystem Mission Control">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h3 font-bold text-foreground">National Agricultural Commerce Overview</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                LIVE METRICS
              </span>
            </div>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              SIH 2026 Problem Statement 26033 • Authoritative Multi-Tenant Governance
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/admin/users">
              <Button variant="secondary" size="sm" leftIcon={<Users className="w-4 h-4" />}>
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/products">
              <Button variant="secondary" size="sm" leftIcon={<Package className="w-4 h-4" />}>
                Products Oversight
              </Button>
            </Link>
            <Link href="/admin/forecast">
              <Button variant="primary" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
                Demand Forecast
              </Button>
            </Link>
          </div>
        </div>

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span className="text-body-sm">{fetchError}</span>
          </div>
        )}

        {/* 1. ECOSYSTEM MACRO STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Registered Producers"
            value={fetching ? '...' : (metrics ? metrics.users.farmers + metrics.users.fpos : 0).toString()}
            subtitle={
              metrics
                ? `${metrics.users.farmers} Farmers • ${metrics.users.fpos} in FPOs`
                : 'Direct farm gate aggregators'
            }
            icon={<Sprout className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            title="Commercial Buyers"
            value={fetching ? '...' : (metrics?.users.buyers ?? 0).toString()}
            subtitle={`${metrics?.users.consumers ?? 0} Consumer accounts`}
            icon={<ShoppingBag className="w-5 h-5 text-amber-400" />}
          />
          <StatCard
            title="Active Listed Produce"
            value={fetching ? '...' : (metrics?.products.active ?? 0).toString()}
            subtitle={`${metrics?.products.total ?? 0} Catalog batches total`}
            icon={<Package className="w-5 h-5 text-primary-400" />}
          />
          <StatCard
            title="Platform GMV (Settled)"
            value={
              fetching
                ? '...'
                : metrics
                ? `₹${metrics.orders.totalGmvRupees.toLocaleString('en-IN')}`
                : '₹0'
            }
            subtitle={`${metrics?.orders.completed ?? 0} Completed orders`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          />
        </div>

        {/* 2. OPERATIONAL DOMAIN CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users Oversight Card */}
          <GlassCard variant="strong" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-body font-bold text-foreground">User & KYC Governance</h3>
              </div>
              <Link href="/admin/users" className="text-caption text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Total Accounts:</span>
                <strong className="font-mono text-foreground">{metrics?.users.total ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Verified Identities:</span>
                <span className="font-mono text-emerald-400 font-semibold">{metrics?.users.verified ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Pending Verification:</span>
                <span className="font-mono text-amber-400 font-semibold">{metrics?.users.pendingVerification ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Logistics Transporters:</span>
                <span className="font-mono text-foreground">{metrics?.users.logistics ?? 0}</span>
              </div>
            </div>
            <Link href="/admin/users" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                Review Pending KYCs
              </Button>
            </Link>
          </GlassCard>

          {/* Produce & Moderation Card */}
          <GlassCard variant="strong" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="text-body font-bold text-foreground">Produce & Catalog Oversight</h3>
              </div>
              <Link href="/admin/products" className="text-caption text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Active Marketplace Listings:</span>
                <strong className="font-mono text-emerald-400">{metrics?.products.active ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Draft / Staging Lots:</span>
                <span className="font-mono text-foreground">{metrics?.products.draft ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Archived / Closed Lots:</span>
                <span className="font-mono text-foreground/50">{metrics?.products.archived ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Warehouse Stock Monitored:</span>
                <span className="font-mono text-primary-300 font-semibold">
                  {metrics ? `${metrics.inventory.totalStockKg.toLocaleString()} kg` : '0 kg'}
                </span>
              </div>
            </div>
            <Link href="/admin/products" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                Audit Produce Catalog
              </Button>
            </Link>
          </GlassCard>

          {/* Orders & Escrow Oversight Card */}
          <GlassCard variant="strong" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                <h3 className="text-body font-bold text-foreground">Orders & Escrow Flow</h3>
              </div>
              <Link href="/admin/orders" className="text-caption text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Total Lifetime Orders:</span>
                <strong className="font-mono text-foreground">{metrics?.orders.total ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Active In-Flight Consignments:</span>
                <span className="font-mono text-cyan-400 font-semibold">{metrics?.orders.active ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Delivered & Settled:</span>
                <span className="font-mono text-emerald-400 font-semibold">{metrics?.orders.completed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground/70">Cancelled Consignments:</span>
                <span className="font-mono text-red-400">{metrics?.orders.cancelled ?? 0}</span>
              </div>
            </div>
            <Link href="/admin/orders" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                Inspect Orders
              </Button>
            </Link>
          </GlassCard>
        </div>

        {/* 3. SYSTEM HEALTH & SUPPLY CHAIN DIRECTIVE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 p-6 rounded-2xl bg-surface-elevated/40 border border-surface-border space-y-3">
            <div className="flex items-center gap-2 text-caption font-semibold text-primary-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              SIH Problem Statement 26033 Supply Chain Objective
            </div>
            <h4 className="text-h4 font-bold text-foreground">
              Eliminating Intermediary Exploitation Through Direct Escrow & Inventory Transparency
            </h4>
            <p className="text-body-sm text-foreground/70 leading-relaxed">
              Gramora establishes a direct digital bridge between agricultural producers and commercial buyers.
              By combining cryptographic image verification via Cloudinary, transaction-safe inventory reservation,
              and authoritative admin governance, the platform ensures equitable farmer remuneration and lower consumer prices.
            </p>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl bg-surface-elevated/40 border border-surface-border space-y-3">
            <h4 className="text-body font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Infrastructure Status
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Authoritative Firestore:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Cloudinary Signed Storage:</span>
                <span
                  className={
                    metrics?.systemHealth.cloudinary === 'configured'
                      ? 'text-emerald-400 font-semibold flex items-center gap-1'
                      : 'text-amber-400 font-semibold flex items-center gap-1'
                  }
                >
                  {metrics?.systemHealth.cloudinary === 'configured' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" /> Pending Env Vars
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">RBAC Enforcement:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Server-Authoritative
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
