'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFarmerProducts } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { DataTable, ColumnDef } from '@/components/data-display/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceDisplay } from '@/components/data-display/price-display';
import { AppImage } from '@/components/data-display/app-image';
import { Alert } from '@/components/feedback/alert';
import { Product } from '@/types';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { PlusCircle, Edit, ExternalLink, Boxes } from 'lucide-react';

export default function FarmerProductsPage() {
  const { user } = useAuth();
  const { products, loading, error } = useFarmerProducts(user?.id);
  const farmerProducts = user?.id
    ? products.filter((p) => p.sellerId === user.id)
    : products;

  const columns: ColumnDef<Product>[] = [
    {
      key: 'image',
      header: 'Crop',
      className: 'w-16',
      cell: (row) => (
        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
          <AppImage src={row.images[0]} alt={row.title} aspectRatio="square" />
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title & Variety',
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.title}</span>
          <span className="text-caption text-foreground/50">{row.variety} • {row.qualityGrade}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Gate Price',
      cell: (row) => (
        <span className="font-mono font-bold text-primary-400">
          {formatCurrency(row.pricePerUnit)} / {row.unit}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Available Stock',
      cell: (row) => (
        <span className="font-mono text-body-sm text-foreground">
          {formatWeight(row.totalAvailableQuantity)}
        </span>
      ),
    },
    {
      key: 'moq',
      header: 'Min Order',
      cell: (row) => (
        <span className="text-caption font-mono text-foreground/70">
          {row.minOrderQuantity} {row.unit}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/farmer/products/${row.id}/edit`}>
            <Button variant="ghost" size="xs" leftIcon={<Edit className="w-3.5 h-3.5" />}>
              Edit
            </Button>
          </Link>
          <Link href={`/marketplace/${row.id}`}>
            <Button variant="secondary" size="xs" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Crop Listings & Inventory">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">My Listed Crops</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Manage active farm gate listings and pricing benchmarks
            </p>
          </div>
          <Link href="/farmer/products/new">
            <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
              List New Harvest Lot
            </Button>
          </Link>
        </div>

        {error && (
          <Alert variant="error" title="Failed to load produce listings">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="p-8 text-center text-foreground/50">Loading produce catalog...</div>
        ) : (
          <DataTable
            columns={columns}
            data={farmerProducts}
            keyExtractor={(item) => item.id}
            emptyTitle="No crop listings yet"
            emptyDescription="Start by listing your harvest batch with photos and quality grade parameters."
          />
        )}
      </div>
    </AppShell>
  );
}
