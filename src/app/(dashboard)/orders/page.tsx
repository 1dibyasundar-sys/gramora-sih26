'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { OrderStatus, Order } from '@/types';
import { DataTable, ColumnDef } from '@/components/data-display/data-table';
import { StatusBadge } from '@/components/data-display/status-badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { SearchInput } from '@/components/data-display/search-input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package, Truck, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

export default function OrdersPage() {
  const { role } = useAuth();
  const { orders, loading, error, refetch, statusFilter, setStatusFilter } = useOrders(role);
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.buyerName.toLowerCase().includes(q) ||
      o.sellerName.toLowerCase().includes(q)
    );
  });

  const columns: ColumnDef<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Consignment ID',
      cell: (row) => (
        <Link href={`/orders/${row.id}`} className="font-mono font-bold text-primary-400 hover:underline">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: 'crop',
      header: 'Produce Items',
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground block truncate max-w-xs">
            {row.items.map((i) => `${i.quantity}${i.unit} ${i.productName}`).join(', ')}
          </span>
          <span className="text-caption text-foreground/50">
            {role === 'farmer' ? `Buyer: ${row.buyerName}` : `Seller: ${row.sellerName}`}
          </span>
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
      key: 'date',
      header: 'Created On',
      cell: (row) => <span className="text-caption text-foreground/60">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Link href={`/orders/${row.id}`}>
          <Button variant="secondary" size="xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
            Track Order
          </Button>
        </Link>
      ),
    },
  ];

  const renderMobileOrder = (order: Order) => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Link href={`/orders/${order.id}`} className="font-mono font-bold text-primary-400 hover:underline">
          {order.orderNumber}
        </Link>
        <StatusBadge status={order.status} size="sm" />
      </div>
      <div>
        <span className="font-semibold text-foreground text-body-sm block line-clamp-1">
          {order.items.map((i) => `${i.quantity}${i.unit} ${i.productName}`).join(', ')}
        </span>
        <span className="text-caption text-foreground/50">
          {role === 'farmer' ? `Buyer: ${order.buyerName}` : `Seller: ${order.sellerName}`}
        </span>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-surface-border">
        <span className="font-mono font-bold text-foreground">
          {formatCurrency(order.totalAmount)}
        </span>
        <Link href={`/orders/${order.id}`}>
          <Button variant="secondary" size="xs" rightIcon={<ArrowRight className="w-3 h-3" />}>
            Track Order
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <AppShell title="Order Management & Shipments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Consignment Orders</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Live tracking and escrow settlements for all agricultural shipments
            </p>
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by order # or party..."
            />
          </div>
        </div>

        {/* Tab filters */}
        <Tabs
          tabs={[
            { id: 'all', label: 'All Consignments', count: orders.length },
            { id: 'payment_pending', label: 'Payment Pending', count: orders.filter((o) => o.status === 'payment_pending').length },
            { id: 'processing', label: 'In Processing', count: orders.filter((o) => o.status === 'processing' || o.status === 'escrow_funded').length },
            { id: 'in_transit', label: 'In Transit', count: orders.filter((o) => o.status === 'in_transit' || o.status === 'dispatched').length },
            { id: 'delivered', label: 'Delivered', count: orders.filter((o) => o.status === 'delivered' || o.status === 'completed').length },
            { id: 'cancelled', label: 'Cancelled', count: orders.filter((o) => o.status === 'cancelled').length },
          ]}
          activeTab={statusFilter}
          onChange={(tab) => setStatusFilter(tab as OrderStatus | 'all')}
          variant="pills"
        />

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between text-rose-300">
            <div>
              <p className="font-semibold text-body-sm">Failed to synchronize consignment orders</p>
              <p className="text-caption opacity-80">{error}</p>
            </div>
            <Button variant="secondary" size="xs" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 py-8 animate-pulse">
            <div className="h-12 bg-surface-elevated rounded-xl" />
            <div className="h-16 bg-surface-elevated rounded-xl" />
            <div className="h-16 bg-surface-elevated rounded-xl" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            renderMobileItem={renderMobileOrder}
            emptyTitle="No orders found"
            emptyDescription="There are no consignments matching your selected status filter."
          />
        )}
      </div>
    </AppShell>
  );
}

