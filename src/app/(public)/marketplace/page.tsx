'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { useProducts } from '@/hooks/useProducts';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { ProductCategory, ProductFilterOptions } from '@/types';
import { SearchInput } from '@/components/data-display/search-input';
import { FilterPanel } from '@/components/data-display/filter-panel';
import { PriceDisplay } from '@/components/data-display/price-display';
import { AppImage } from '@/components/data-display/app-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Drawer } from '@/components/ui/drawer';
import { ProductCardSkeleton } from '@/components/feedback/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { Alert } from '@/components/feedback/alert';
import {
  MapPin,
  Filter,
  LayoutGrid,
  List,
  ArrowUpDown,
  ShieldCheck,
  Sprout,
  Store,
} from 'lucide-react';
import { useTranslation } from '@/i18n';

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') as ProductCategory | null;
  const organicParam = searchParams.get('organicOnly') === 'true';
  const queryParam = searchParams.get('q') || '';
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(queryParam);

  const { products, loading, error, filters, setFilters, refetch } = useProducts({
    sortBy: 'rating',
    category: categoryParam || undefined,
    organicOnly: organicParam || undefined,
    search: queryParam || undefined,
  });

  useEffect(() => {
    if (categoryParam || organicParam || queryParam) {
      setFilters((prev) => ({
        ...prev,
        category: categoryParam || prev.category,
        organicOnly: organicParam || prev.organicOnly,
        search: queryParam || prev.search,
      }));
      if (queryParam) setSearchQuery(queryParam);
    }
  }, [categoryParam, organicParam, queryParam, setFilters]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setFilters({ ...filters, search: q });
  };

  const handleSortChange = (sort: 'price_asc' | 'price_desc' | 'rating' | 'newest') => {
    setFilters({ ...filters, sortBy: sort });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilters({ sortBy: 'rating' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header & Mission Statement */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-surface-border">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-caption font-semibold text-primary-300 mb-2">
                <Store className="w-3.5 h-3.5" />
                <span>{t('marketplace.badge')}</span>
              </div>
              <h1 className="text-h2 sm:text-h1 font-extrabold text-foreground tracking-tight">
                {t('marketplace.title')}
              </h1>
              <p className="text-body-sm text-foreground/60 max-w-xl mt-1">
                {t('marketplace.subtitle')}
              </p>
            </div>

            {/* View Mode & Sort Controls */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center bg-surface-primary rounded-xl border border-surface-border p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-foreground/50 hover:text-foreground'
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-foreground/50 hover:text-foreground'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <div className="w-48">
                <Select
                  options={[
                    { label: t('marketplace.sortRating'), value: 'rating' },
                    { label: t('marketplace.sortPriceAsc'), value: 'price_asc' },
                    { label: t('marketplace.sortPriceDesc'), value: 'price_desc' },
                    { label: t('marketplace.sortNewest'), value: 'newest' },
                  ]}
                  value={filters.sortBy || 'rating'}
                  onChange={(e) => handleSortChange(e.target.value as 'price_asc' | 'price_desc' | 'rating' | 'newest')}
                />
              </div>

              {/* Mobile filter button */}
              <div className="lg:hidden">
                <Button
                  variant="glass"
                  size="md"
                  onClick={() => setMobileFilterOpen(true)}
                  leftIcon={<Filter className="w-4 h-4" />}
                >
                  {t('common.filter')}
                </Button>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="max-w-2xl">
            <SearchInput
              value={searchQuery}
              onChange={handleSearch}
              placeholder={t('marketplace.searchPlaceholder')}
            />
          </div>

          {/* Main Layout: Sidebar Filters + Catalog */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block lg:col-span-1 sticky top-28">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={resetFilters}
              />
            </div>

            {/* Mobile Filter Drawer */}
            <Drawer
              isOpen={mobileFilterOpen}
              onClose={() => setMobileFilterOpen(false)}
              title={`${t('common.filter')} ${t('navigation.marketplace')}`}
              position="right"
            >
              <FilterPanel
                filters={filters}
                onChange={(f) => {
                  setFilters(f);
                  setMobileFilterOpen(false);
                }}
                onReset={() => {
                  resetFilters();
                  setMobileFilterOpen(false);
                }}
              />
            </Drawer>

            {/* Products Grid / List */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between text-caption text-foreground/50">
                <span>{t('marketplace.showingCrops')}: <strong className="text-foreground">{products.length}</strong></span>
                <span>{t('marketplace.activeMandiComparison')}</span>
              </div>

              {error ? (
                <div className="p-6 rounded-2xl bg-surface-primary border border-red-500/30 space-y-4">
                  <Alert variant="error" title="Unable to retrieve marketplace listings">
                    {error}
                  </Alert>
                  <Button variant="secondary" size="sm" onClick={() => refetch()}>
                    {t('common.retry')}
                  </Button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <EmptyState
                  title={t('marketplace.noProduceFound')}
                  description={t('marketplace.noProduceDescription')}
                  actionLabel={t('marketplace.retryQuery')}
                  onAction={resetFilters}
                />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="rounded-2xl border border-surface-border bg-surface-primary overflow-hidden flex flex-col group hover:border-primary-500/40 transition-all duration-200 shadow-card"
                    >
                      <Link href={`/marketplace/${prod.id}`} className="relative block">
                        <AppImage
                          src={prod.images[0]}
                          alt={prod.title}
                          aspectRatio="landscape"
                          className="group-hover:scale-105 transition-transform duration-300"
                          category={prod.category}
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" size="sm">
                            {prod.qualityGrade}
                          </Badge>
                          {prod.organicCertified && (
                            <Badge variant="success" size="sm">
                              {t('marketplace.organic')}
                            </Badge>
                          )}
                        </div>
                        {prod.location.distanceKm && (
                          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-white/90">
                            {prod.location.distanceKm} km away
                          </div>
                        )}
                      </Link>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center gap-1.5 text-caption text-foreground/50 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-primary-400" />
                            <span>{prod.location.district}, {prod.location.state}</span>
                          </div>
                          <Link href={`/marketplace/${prod.id}`}>
                            <h3 className="text-body font-bold text-foreground line-clamp-2 hover:text-primary-400 transition-colors">
                              {prod.title}
                            </h3>
                          </Link>
                          <div className="flex items-center justify-between text-caption text-foreground/60 mt-2">
                            <span className="truncate">{prod.sellerName}</span>
                            <span className="font-semibold text-accent-400">★ {prod.sellerRating}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-surface-border flex items-end justify-between gap-2">
                          <PriceDisplay
                            pricePerUnit={prod.pricePerUnit}
                            unit={prod.unit}
                            marketMandiPrice={prod.marketMandiPrice}
                            size="sm"
                          />
                          <Link href={`/marketplace/${prod.id}`}>
                            <Button variant="secondary" size="xs">
                              {t('marketplace.viewProduce')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-4">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="rounded-2xl border border-surface-border bg-surface-primary p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 hover:border-primary-500/40 transition-all shadow-card"
                    >
                      <div className="w-full sm:w-44 h-36 shrink-0 rounded-xl overflow-hidden">
                        <AppImage
                          src={prod.images?.[0]}
                          alt={prod.title}
                          aspectRatio="landscape"
                          fallbackText="No Image"
                          category={prod.category}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" size="sm">
                            {prod.qualityGrade}
                          </Badge>
                          {prod.organicCertified && (
                            <Badge variant="success" size="sm">
                              {t('marketplace.organic')}
                            </Badge>
                          )}
                          <span className="text-caption text-foreground/50">
                            {prod.location.district}, {prod.location.state}
                          </span>
                        </div>
                        <Link href={`/marketplace/${prod.id}`}>
                          <h3 className="text-h4 font-bold text-foreground hover:text-primary-400 transition-colors truncate">
                            {prod.title}
                          </h3>
                        </Link>
                        <p className="text-caption text-foreground/70 line-clamp-2">
                          {prod.description}
                        </p>
                        <div className="text-caption text-foreground/50 font-medium">
                          Seller: <strong className="text-foreground/80">{prod.sellerName}</strong> • {t('marketplace.minOrderQty')}: {prod.minOrderQuantity} {prod.unit}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-surface-border">
                        <PriceDisplay
                          pricePerUnit={prod.pricePerUnit}
                          unit={prod.unit}
                          marketMandiPrice={prod.marketMandiPrice}
                          size="md"
                        />
                        <Link href={`/marketplace/${prod.id}`}>
                          <Button variant="primary" size="sm">
                            {t('marketplace.orderProduce')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <PublicHeader />
          <div className="flex-1 max-w-7xl mx-auto px-4 py-12 space-y-8 w-full animate-pulse">
            <div className="h-10 bg-surface-elevated rounded-xl w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-72 bg-surface-elevated rounded-2xl" />
              ))}
            </div>
          </div>
          <PublicFooter />
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
