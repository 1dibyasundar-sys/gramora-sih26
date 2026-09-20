'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useToast } from '@/components/feedback/toast';
import { ServerOrder } from '@/server/domain/order';
import {
  TrendingUp,
  Search,
  ArrowLeft,
  Loader2,
  XCircle,
  Eye,
  CreditCard,
  ShieldCheck,
  Calendar,
  Package,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { role, loading } = useAuth();
  const { error: toastError } = useToast();

  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<ServerOrder | null>(null);
  const [orderDetails, setOrderDetails] = useState<{ order: ServerOrder; items: any[] } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  };

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/login');
    }
  }, [loading, role, router]);

  const loadOrders = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setFetching(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/v1/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch platform orders');
      }

      const json = await res.json();
      setOrders(json.data || []);
      setTotalCount(json.meta?.total || 0);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Error fetching orders');
    } finally {
      setFetching(false);
    }
  }, [statusFilter, toastError]);

  useEffect(() => {
    if (role === 'admin') {
      loadOrders();
    }
  }, [role, loadOrders]);

  const inspectOrder = async (order: ServerOrder) => {
    setSelectedOrder(order);
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/v1/admin/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setOrderDetails(json.data);
      }
    } catch {
      // Best effort details load
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return <Badge variant="success">{status}</Badge>;
      case 'processing':
      case 'in_transit':
      case 'dispatched':
        return <Badge variant="info">{status}</Badge>;
      case 'created':
      case 'escrow_funded':
      case 'payment_pending':
        return <Badge variant="warning">{status}</Badge>;
      case 'cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppShell title="Order Oversight & Escrow">
      <div className="space-y-6 max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Admin Dashboard', href: '/admin/dashboard' },
            { label: 'Orders & Escrow Oversight' },
          ]}
        />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">National Orders & Escrow Oversight</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Inspect multi-seller consignments, direct farm payouts, and escrow settlement status
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Overview
            </Button>
          </Link>
        </div>

        {/* Filter Bar */}
        <GlassCard variant="strong" className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="w-full sm:w-72">
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Created / Placed', value: 'created' },
                { label: 'Escrow Funded / Locked', value: 'escrow_funded' },
                { label: 'Processing & Packaging', value: 'processing' },
                { label: 'In Transit / Logistics', value: 'in_transit' },
                { label: 'Delivered & Settled', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
            />
          </div>
          <div className="text-caption text-foreground/60 pt-4">
            Showing <strong className="font-mono text-foreground">{orders.length}</strong> orders
          </div>
        </GlassCard>

        {/* Orders Table */}
        <div className="rounded-2xl border border-surface-border bg-surface-elevated/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated/70 text-caption text-foreground/60">
                  <th className="py-3.5 px-4 font-semibold">Order Number</th>
                  <th className="py-3.5 px-4 font-semibold">Buyer</th>
                  <th className="py-3.5 px-4 font-semibold">Consignment Total</th>
                  <th className="py-3.5 px-4 font-semibold">Order State</th>
                  <th className="py-3.5 px-4 font-semibold">Payment / Escrow</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-body-sm">
                {fetching ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-foreground/50">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-400" />
                      Loading platform orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-foreground/50">
                      No orders match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const displayTotal =
                      o.totalAmount || (o.totalMinor ? Math.round(o.totalMinor / 100) : 0);
                    return (
                      <tr key={o.id} className="hover:bg-surface-elevated/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-primary-400">
                          {o.orderNumber || o.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{o.buyerName}</div>
                          <div className="text-caption text-foreground/50 font-mono text-[11px]">{o.buyerId}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          ₹{displayTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(o.status)}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs text-primary-300 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            {o.paymentStatus || 'escrow_locked'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-caption text-foreground/60 font-mono">
                          {o.createdAt ? o.createdAt.split('T')[0] : 'Recent'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => inspectOrder(o)}
                            title="Inspect Order Breakdown"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Drawer / Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-elevated border border-surface-border rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <h3 className="text-h4 font-bold text-foreground">
                    Consignment: {selectedOrder.orderNumber || selectedOrder.id}
                  </h3>
                  <p className="text-caption text-foreground/50 font-mono">ID: {selectedOrder.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderDetails(null);
                  }}
                  className="text-foreground/60 hover:text-foreground p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* High-level status */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-base border border-surface-border text-center">
                <div>
                  <span className="text-caption text-foreground/60 block">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <span className="text-caption text-foreground/60 block">Escrow Ledger</span>
                  <span className="font-mono text-emerald-400 font-semibold block mt-1">
                    {selectedOrder.escrowStatus || 'held_in_escrow'}
                  </span>
                </div>
                <div>
                  <span className="text-caption text-foreground/60 block">Consignment Total</span>
                  <span className="font-mono text-primary-300 font-bold text-h5 block mt-1">
                    ₹
                    {(
                      selectedOrder.totalAmount ||
                      (selectedOrder.totalMinor ? Math.round(selectedOrder.totalMinor / 100) : 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <h4 className="text-caption font-semibold uppercase text-foreground/70 tracking-wider">
                  Consignment Line Items
                </h4>
                {loadingDetails ? (
                  <div className="py-6 text-center text-xs text-foreground/50">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-primary-400" />
                    Loading items snapshot...
                  </div>
                ) : orderDetails?.items && orderDetails.items.length > 0 ? (
                  <div className="divide-y divide-surface-border border border-surface-border rounded-xl overflow-hidden">
                    {orderDetails.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-surface-base flex items-center justify-between text-body-sm">
                        <div>
                          <strong className="text-foreground">{item.productName || item.title || 'Produce Batch'}</strong>
                          <div className="text-caption text-foreground/50">
                            Seller: {item.sellerNameSnapshot || item.sellerId} • Grade: {item.grade || 'Grade A'}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-foreground">
                            {item.quantity} {item.unit}
                          </span>
                          <div className="text-caption text-primary-300 font-semibold">
                            ₹{item.totalPrice || (item.totalPriceMinor ? item.totalPriceMinor / 100 : 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-foreground/50 italic">
                    Historical line item snapshot captured in order record.
                  </p>
                )}
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddressSnapshot && (
                <div className="p-3 rounded-xl bg-surface-base border border-surface-border text-xs space-y-1">
                  <span className="text-caption font-semibold text-foreground/70 block">Delivery Destination</span>
                  <div className="text-foreground">{selectedOrder.shippingAddressSnapshot.name}</div>
                  <div className="text-foreground/70">
                    {selectedOrder.shippingAddressSnapshot.addressLine1}, {selectedOrder.shippingAddressSnapshot.district},{' '}
                    {selectedOrder.shippingAddressSnapshot.state} - {selectedOrder.shippingAddressSnapshot.postalCode}
                  </div>
                  <div className="font-mono text-primary-300">
                    Contact: {selectedOrder.shippingAddressSnapshot.phone}
                  </div>
                </div>
              )}

              {/* Cancellation Reason if cancelled */}
              {selectedOrder.cancellationReason && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                  <strong>Cancellation Reason:</strong> {selectedOrder.cancellationReason}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-surface-border">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderDetails(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
