'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AppImage } from '@/components/data-display/app-image';
import { useToast } from '@/components/feedback/toast';
import { ServerProduct } from '@/server/domain/product';
import {
  Package,
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  PauseCircle,
  Archive,
  Eye,
  ExternalLink,
} from 'lucide-react';

export default function AdminProductsPage() {
  const router = useRouter();
  const { role, loading } = useAuth();
  const { success, error: toastError } = useToast();

  const [products, setProducts] = useState<ServerProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  };

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/login');
    }
  }, [loading, role, router]);

  const loadProducts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setFetching(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/v1/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load products list');
      }

      const json = await res.json();
      setProducts(json.data || []);
      setTotalCount(json.meta?.total || 0);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Error fetching product catalog');
    } finally {
      setFetching(false);
    }
  }, [categoryFilter, statusFilter, searchTerm, toastError]);

  useEffect(() => {
    if (role === 'admin') {
      loadProducts();
    }
  }, [role, loadProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleModerateStatus = async (product: ServerProduct, newStatus: 'active' | 'paused' | 'archived') => {
    const token = getAuthToken();
    if (!token) return;

    const reason = window.prompt(
      `Please document the reason to change listing status of "${product.title}" to ${newStatus}:`,
      newStatus === 'paused' ? 'Produce quality audit required' : 'Catalog administrative update'
    );

    if (!reason || reason.trim().length < 5) {
      toastError('A documented reason of at least 5 characters is required for product moderation.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/admin/products/${product.id}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listingStatus: newStatus, reason }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Product moderation failed');
      }

      success(`Product listing status updated to ${newStatus}.`);
      loadProducts();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Moderation failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell title="Produce Catalog & Moderation">
      <div className="space-y-6 max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Admin Dashboard', href: '/admin/dashboard' },
            { label: 'Products & Produce Catalog' },
          ]}
        />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Produce Catalog Oversight</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Inspect harvest listings, Cloudinary produce photography, farm gate pricing, and moderation
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Overview
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <GlassCard variant="strong" className="p-4 sm:p-5">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <Input
                label="Search Products"
                placeholder="Search by title, variety, seller, or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-foreground/40" />}
              />
            </div>
            <div className="sm:col-span-3">
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { label: 'All Categories', value: 'all' },
                  { label: 'Grains & Cereals', value: 'grains' },
                  { label: 'Pulses', value: 'pulses' },
                  { label: 'Vegetables', value: 'vegetables' },
                  { label: 'Fruits', value: 'fruits' },
                  { label: 'Spices', value: 'spices' },
                  { label: 'Oilseeds', value: 'oilseeds' },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                label="Listing Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Paused', value: 'paused' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Archived', value: 'archived' },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" size="md" className="w-full">
                Filter
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Products Table */}
        <div className="rounded-2xl border border-surface-border bg-surface-elevated/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated/70 text-caption text-foreground/60">
                  <th className="py-3.5 px-4 font-semibold w-16">Image</th>
                  <th className="py-3.5 px-4 font-semibold">Produce & Variety</th>
                  <th className="py-3.5 px-4 font-semibold">Seller</th>
                  <th className="py-3.5 px-4 font-semibold">Pricing</th>
                  <th className="py-3.5 px-4 font-semibold">Stock & Lot</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-body-sm">
                {fetching ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-foreground/50">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-400" />
                      Loading produce listings...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-foreground/50">
                      No produce listings match the selected filters.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-surface-border bg-surface-elevated">
                          <AppImage
                            src={p.images && p.images.length > 0 ? p.images[0] : ''}
                            alt={p.title}
                            aspectRatio="square"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {p.title}
                          {p.organicCertified && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                              Organic
                            </span>
                          )}
                        </div>
                        <div className="text-caption text-foreground/50">
                          {p.variety} • <span className="capitalize">{p.category}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{p.sellerName}</div>
                        <div className="text-caption text-foreground/50 capitalize">
                          {p.sellerType} • {p.location?.district || 'Location N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-primary-300 font-semibold">₹{p.pricePerUnit}</span>
                        <span className="text-foreground/50 text-xs"> / {p.unit}</span>
                        {p.marketMandiPrice && (
                          <div className="text-[11px] text-foreground/50 line-through">
                            ₹{p.marketMandiPrice} mandi
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-foreground font-medium">
                          {p.totalAvailableQuantity.toLocaleString()} {p.unit}
                        </span>
                        <div className="text-caption text-foreground/50">MOQ: {p.minOrderQuantity}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            p.listingStatus === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : p.listingStatus === 'paused'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'
                          }`}
                        >
                          {p.listingStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/marketplace/${p.id}`} target="_blank">
                            <Button variant="ghost" size="sm" title="View in Marketplace">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          {p.listingStatus === 'active' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleModerateStatus(p, 'paused')}
                              title="Pause listing"
                            >
                              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleModerateStatus(p, 'active')}
                              title="Reactivate listing"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleModerateStatus(p, 'archived')}
                            title="Archive listing"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
