'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useInventory } from '@/hooks/useProducts';
import { DataTable, ColumnDef } from '@/components/data-display/data-table';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ProgressBar } from '@/components/data-display/progress-bar';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/feedback/alert';
import { InventoryItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { Package, PlusCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function InventoryPage() {
  const { inventory, loading, error } = useInventory();

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'productName',
      header: 'Crop & Lot Number',
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.productName}</span>
          <span className="text-caption font-mono text-foreground/50">{row.lotNumber}</span>
        </div>
      ),
    },
    {
      key: 'storage',
      header: 'Storage Bay / Silo',
      cell: (row) => (
        <span className="text-caption text-foreground/80">{row.storageFacility}</span>
      ),
    },
    {
      key: 'available',
      header: 'Available Stock',
      cell: (row) => (
        <div className="space-y-1 min-w-[140px]">
          <div className="flex justify-between text-caption font-mono">
            <span className="font-bold text-foreground">{row.availableQuantity} {row.unit}</span>
            <span className="text-foreground/40">{row.totalQuantity} total</span>
          </div>
          <ProgressBar
            value={row.availableQuantity}
            max={row.totalQuantity}
            variant={row.status === 'Critical' ? 'error' : row.status === 'Low Stock' ? 'warning' : 'primary'}
            size="sm"
            showPercentage={false}
          />
        </div>
      ),
    },
    {
      key: 'reserved',
      header: 'Reserved (In Escrow)',
      cell: (row) => (
        <span className="font-mono text-caption text-amber-400 font-semibold">
          {row.reservedQuantity} {row.unit}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Best Before',
      cell: (row) => (
        <span className="text-caption text-foreground/60">{formatDate(row.expiryDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Inventory Status',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
  ];

  const renderMobileInventory = (item: InventoryItem) => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-foreground text-body-sm block">{item.productName}</span>
          <span className="text-caption font-mono text-foreground/50">{item.lotNumber}</span>
        </div>
        <StatusBadge status={item.status} size="sm" />
      </div>
      <div className="text-caption text-foreground/70">
        Facility: <strong className="text-foreground">{item.storageFacility}</strong>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-caption font-mono">
          <span className="font-bold text-foreground">Available: {item.availableQuantity} {item.unit}</span>
          <span className="text-foreground/50">{item.reservedQuantity} reserved</span>
        </div>
        <ProgressBar
          value={item.availableQuantity}
          max={item.totalQuantity}
          variant={item.status === 'Critical' ? 'error' : item.status === 'Low Stock' ? 'warning' : 'primary'}
          size="sm"
          showPercentage={false}
        />
      </div>
      <div className="text-caption text-foreground/50 flex justify-between pt-1 border-t border-surface-border">
        <span>Best before: {formatDate(item.expiryDate)}</span>
        <span>Total: {item.totalQuantity} {item.unit}</span>
      </div>
    </div>
  );

  return (
    <AppShell title="Cold Storage & Lot Inventory">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Harvest Batches in Storage</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Track warehouse lot allocations, reserved escrow stock, and cold-chain shelf life
            </p>
          </div>
          <Link href="/farmer/products/new">
            <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Add Harvest Batch
            </Button>
          </Link>
        </div>

        {error && (
          <Alert variant="error" title="Failed to load storage inventory">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="p-8 text-center text-foreground/50">Loading storage inventory...</div>
        ) : (
          <DataTable
            columns={columns}
            data={inventory}
            keyExtractor={(i) => i.id}
            renderMobileItem={renderMobileInventory}
            emptyTitle="No lots in storage"
            emptyDescription="You have no active warehouse batches registered."
          />
        )}
      </div>
    </AppShell>
  );
}
