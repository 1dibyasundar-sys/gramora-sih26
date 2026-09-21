'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { useProduct } from '@/hooks/useProducts';
import { AppImage } from '@/components/data-display/app-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { GlassCard } from '@/components/ui/glass-card';
import { Dialog } from '@/components/ui/dialog';
import { PriceDisplay } from '@/components/data-display/price-display';
import { useToast } from '@/components/feedback/toast';
import { Alert } from '@/components/feedback/alert';
import { useAuth } from '@/hooks/useAuth';
import { orderService } from '@/services';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import {
  getQuantityStep,
  getProductOrderability,
  incrementQuantity,
  decrementQuantity,
  clampQuantity,
} from '@/lib/quantity';
import {
  MapPin,
  ShieldCheck,
  Award,
  Clock,
  Droplets,
  Warehouse,
  Truck,
  CheckCircle2,
  Calendar,
  Share2,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Lock,
  AlertCircle,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const { product, loading, error } = useProduct(productId);
  const { success, error: toastError } = useToast();
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const isAuthenticated = !!user;

  const [quantity, setQuantity] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // Delivery destination address state
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    district: '',
    state: '',
    postalCode: '',
  });

  // Quantity, Step & Orderability Synchronization
  const availableStock = product?.totalAvailableQuantity ?? 0;
  const minOrderQty = product?.minOrderQuantity ?? 1;
  const orderability = getProductOrderability(availableStock, minOrderQty);
  const isOrderable = orderability.orderable;
  const isOutOfStock = !isOrderable && orderability.reason === 'OUT_OF_STOCK';
  const isInsufficientStock = !isOrderable && orderability.reason === 'INSUFFICIENT_STOCK';
  const step = product ? getQuantityStep(product.unit, minOrderQty) : 1;

  useEffect(() => {
    if (product) {
      if (isOrderable) {
        setQuantity(minOrderQty);
      } else {
        setQuantity(0);
      }
    }
  }, [product, isOrderable, minOrderQty]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-body-sm text-foreground/60">Loading batch details from verified farm registry...</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-4">
          <Alert variant="error" title="Failed to retrieve crop batch">
            {error}
          </Alert>
          <Link href="/marketplace">
            <Button variant="primary">Return to Marketplace</Button>
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-h3 font-bold mb-2">Crop Batch Not Found</h2>
          <p className="text-body-sm text-foreground/60 mb-6">
            The requested harvest lot could not be located in the active directory.
          </p>
          <Link href="/marketplace">
            <Button variant="primary">Return to Marketplace</Button>
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Cost calculations strictly tied to valid quantity
  const effectiveQty = isOrderable ? clampQuantity(quantity, minOrderQty, availableStock) : 0;
  const produceCost = effectiveQty * product.pricePerUnit;
  const traditionalMandiCost = effectiveQty * (product.marketMandiPrice || product.pricePerUnit * 1.3);
  const totalSavings = isOrderable && traditionalMandiCost > produceCost ? traditionalMandiCost - produceCost : 0;
  const estimatedLogistics = effectiveQty > 0 ? Math.round(effectiveQty * 2.2) : 0;
  const platformEscrowFee = effectiveQty > 0 ? Math.round(produceCost * 0.025) : 0;
  const totalOrderEstimate = produceCost + estimatedLogistics + platformEscrowFee;

  const handleIncrease = () => {
    if (!isOrderable) return;
    setQuantity((q) => incrementQuantity(q, step, availableStock, minOrderQty));
  };

  const handleDecrease = () => {
    if (!isOrderable) return;
    setQuantity((q) => decrementQuantity(q, step, minOrderQty));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOrderable) return;
    const raw = e.target.value;
    if (raw === '') {
      setQuantity(0);
      return;
    }
    const val = parseInt(raw, 10);
    if (!isNaN(val)) {
      setQuantity(val);
    }
  };

  const handleQuantityBlur = () => {
    if (!isOrderable) return;
    setQuantity((q) => clampQuantity(q, minOrderQty, availableStock));
  };

  // Real Checkout Handler
  const handleCheckout = async () => {
    if (ordering) return;
    if (!isOrderable || effectiveQty <= 0) {
      toastError('This crop lot is currently unavailable for consignment orders.');
      return;
    }
    if (!isAuthenticated || !user) {
      router.push(`/login?redirect=/marketplace/${productId}`);
      return;
    }

    setOrdering(true);
    try {
      const payload = {
        items: [
          {
            productId: product.id,
            quantity: effectiveQty,
          },
        ],
        shippingAddress: {
          name: shippingAddress.name.trim() || user.name || 'Agri Buyer',
          phone: shippingAddress.phone.trim() || user.phone || '9876543210',
          addressLine1:
            shippingAddress.addressLine1.trim() || user.location?.villageOrCity || 'Direct Dock Receiving Point',
          district:
            shippingAddress.district.trim() || user.location?.district || product.location.district || 'Nashik',
          state:
            shippingAddress.state.trim() || user.location?.state || product.location.state || 'Maharashtra',
          postalCode:
            shippingAddress.postalCode.trim() || user.location?.pincode || '422003',
        },
      };

      const idempotencyKey = `chk-${user.id}-${product.id}-${Date.now()}`;
      const createdOrder = await (orderService as any).checkout(payload, idempotencyKey);

      setCheckoutModalOpen(false);
      success(`Consignment order ${createdOrder.orderNumber} successfully locked in escrow!`);
      router.push(`/orders/${createdOrder.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout transaction failed';
      toastError(msg);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumb
            items={[
              { label: t('navigation.marketplace'), href: '/marketplace' },
              { label: product.category.toUpperCase(), href: `/marketplace?category=${product.category}` },
              { label: product.title },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Image Gallery & Quality Badges */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl border border-surface-border overflow-hidden bg-surface-primary shadow-card relative">
                <AppImage
                  src={product.images[selectedImageIndex] || product.images[0]}
                  alt={product.title}
                  aspectRatio="landscape"
                  category={product.category}
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant="primary" size="md">
                    {product.qualityGrade}
                  </Badge>
                  {product.organicCertified && (
                    <Badge variant="success" size="md">
                      {t('marketplace.organicCertified')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Thumbnail Bar */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        selectedImageIndex === idx ? 'border-primary-500 scale-105' : 'border-surface-border opacity-60'
                      }`}
                    >
                      <AppImage src={img} alt={`Thumbnail ${idx + 1}`} aspectRatio="square" className="w-full h-full" category={product.category} />
                    </button>
                  ))}
                </div>
              )}

              {/* Technical Specifications Grid */}
              <div className="rounded-2xl p-6 glass-panel border border-surface-border space-y-4">
                <h3 className="text-body font-bold text-foreground">{t('productDetail.lotDetails')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-1">
                    <span className="text-caption text-foreground/50 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary-400" /> {t('marketplace.harvestDate')}
                    </span>
                    <span className="text-body-sm font-bold text-foreground block">{product.harvestDate}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-1">
                    <span className="text-caption text-foreground/50 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-accent-400" /> {t('marketplace.shelfLife')}
                    </span>
                    <span className="text-body-sm font-bold text-foreground block">{product.shelfLifeDays} {t('marketplace.days')}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-1">
                    <span className="text-caption text-foreground/50 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" /> {t('productDetail.moistureContent')}
                    </span>
                    <span className="text-body-sm font-bold text-foreground block">
                      {product.moistureContentPercent ? `${product.moistureContentPercent}%` : 'Standard'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-1">
                    <span className="text-caption text-foreground/50 flex items-center gap-1">
                      <Warehouse className="w-3.5 h-3.5 text-emerald-400" /> {t('marketplace.storageType')}
                    </span>
                    <span className="text-body-sm font-bold text-foreground block truncate">
                      {product.storageType}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-body-sm text-foreground/80 leading-relaxed">{product.description}</p>
                </div>
              </div>

              {/* Verified Seller / FPO Profile Card */}
              <div className="rounded-2xl p-6 glass-panel border border-surface-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-300 font-bold text-h4">
                    {product.sellerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-body font-bold text-foreground">{product.sellerName}</h4>
                      {product.sellerVerified && (
                        <span title="Kisan / FPO KYC Verified">
                          <ShieldCheck className="w-4 h-4 text-primary-400" />
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-foreground/60 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-primary-400" />
                      {product.location.district}, {product.location.state}
                      {product.location.distanceKm && ` (${product.location.distanceKm} km from you)`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-body font-bold text-accent-400 font-mono">★ {product.sellerRating}</div>
                  <span className="text-caption text-foreground/50">Verified Producer</span>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing Transparency & Order Execution */}
            <div className="lg:col-span-5 space-y-6">
              <GlassCard variant="strong" className="p-6 sm:p-8 space-y-6 border border-primary-500/30 shadow-elevated" glow>
                <div>
                  <div className="flex items-center justify-between text-caption text-foreground/50 mb-1">
                    <span>Variety: {product.variety}</span>
                    <span className={`font-mono font-medium ${product.totalAvailableQuantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t('marketplace.availableStock')}: {formatWeight(product.totalAvailableQuantity)}
                    </span>
                  </div>
                  <h1 className="text-h3 font-extrabold text-foreground">{product.title}</h1>
                </div>

                {/* Primary Price Display */}
                <div className="p-4 rounded-xl bg-surface-elevated/80 border border-surface-border">
                  <PriceDisplay
                    pricePerUnit={product.pricePerUnit}
                    unit={product.unit}
                    marketMandiPrice={product.marketMandiPrice}
                    size="lg"
                  />
                  <div className="mt-2 pt-2 border-t border-surface-border text-caption text-foreground/60 flex items-center justify-between">
                    <span>{t('productDetail.minOrderRequirement')}</span>
                    <strong className="text-foreground">{product.minOrderQuantity} {product.unit}</strong>
                  </div>
                </div>

                {/* Interactive Quantity Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-label text-foreground/80 font-bold uppercase text-xs">
                    <span>{t('productDetail.selectQuantity')} ({product.unit}):</span>
                    <span className="text-caption text-foreground/50">
                      {t('productDetail.minimumOrder')}: {product.minOrderQuantity} {product.unit}
                    </span>
                  </div>

                  {/* Out of Stock Warning */}
                  {isOutOfStock && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-caption font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{t('productDetail.currentlyUnavailable')} ({t('productDetail.outOfStock')})</span>
                    </div>
                  )}

                  {/* Insufficient Stock for MOQ Warning */}
                  {isInsufficientStock && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-caption font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {t('productDetail.onlyStockAvailable')
                          .replace('{available}', String(product.totalAvailableQuantity))
                          .replace('{unit}', product.unit)
                          .replace('{moq}', String(product.minOrderQuantity))}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      aria-label={t('productDetail.decreaseQuantity')}
                      disabled={!isOrderable || quantity <= product.minOrderQuantity}
                      onClick={handleDecrease}
                      className="w-12 h-12 rounded-xl bg-surface-elevated border border-surface-border font-bold text-h4 flex items-center justify-center transition-all hover:bg-surface-secondary active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-elevated disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-primary-500 outline-none select-none shrink-0"
                    >
                      −
                    </button>
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="number"
                        value={isOrderable ? quantity : 0}
                        min={product.minOrderQuantity}
                        max={product.totalAvailableQuantity}
                        step={step}
                        disabled={!isOrderable}
                        aria-label={`${t('productDetail.selectQuantity')} in ${product.unit}`}
                        onChange={handleQuantityChange}
                        onBlur={handleQuantityBlur}
                        className="w-full text-center font-mono font-bold text-h4 py-2.5 px-3 bg-surface-primary border border-surface-border rounded-xl text-foreground focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-semibold text-foreground/50 pointer-events-none hidden sm:inline">
                        {product.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={t('productDetail.increaseQuantity')}
                      disabled={!isOrderable || quantity >= product.totalAvailableQuantity}
                      onClick={handleIncrease}
                      className="w-12 h-12 rounded-xl bg-surface-elevated border border-surface-border font-bold text-h4 flex items-center justify-center transition-all hover:bg-surface-secondary active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-elevated disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-primary-500 outline-none select-none shrink-0"
                    >
                      +
                    </button>
                  </div>

                  {isOrderable && (
                    <div className="flex justify-between text-caption text-foreground/50 px-1">
                      <span>Step: {step} {product.unit}</span>
                      <span>{quantity >= product.totalAvailableQuantity ? t('productDetail.maximumAvailable') : `Max: ${formatWeight(product.totalAvailableQuantity)}`}</span>
                    </div>
                  )}
                </div>

                {/* Value Breakdown Matrix (Transparent Direct Trade) */}
                <div className="p-4 rounded-xl bg-surface-primary/90 border border-surface-border space-y-2.5 text-body-sm">
                  <div className="flex items-center justify-between text-foreground/80">
                    <span>{t('productDetail.directFarmerEarning')} ({effectiveQty} {product.unit}):</span>
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(produceCost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-foreground/60">
                    <span>{t('productDetail.logisticsCost')}:</span>
                    <span className="font-mono">{formatCurrency(estimatedLogistics)}</span>
                  </div>
                  <div className="flex items-center justify-between text-foreground/60">
                    <span>{t('productDetail.platformFee')}:</span>
                    <span className="font-mono">{formatCurrency(platformEscrowFee)}</span>
                  </div>
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between text-body font-bold text-foreground">
                    <span>{t('productDetail.totalPrice')}:</span>
                    <span className="font-mono text-primary-400">{formatCurrency(totalOrderEstimate)}</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-caption font-bold flex items-center justify-between">
                      <span>{t('marketplace.consumerSavings')}:</span>
                      <span className="font-mono text-emerald-400">+{formatCurrency(totalSavings)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-glow"
                    disabled={!isOrderable || ordering}
                    loading={ordering}
                    onClick={() => {
                      if (!isOrderable) return;
                      setCheckoutModalOpen(true);
                    }}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {!isOrderable
                      ? isOutOfStock
                        ? t('productDetail.outOfStock')
                        : t('productDetail.insufficientStock')
                      : t('productDetail.orderConsignment')}
                  </Button>
                  <Button
                    variant="glass"
                    size="md"
                    className="w-full"
                    disabled={!isOrderable || ordering}
                    onClick={() => {
                      if (!isOrderable) return;
                      success(`Added ${effectiveQty} ${product.unit} to procurement cart`);
                    }}
                    leftIcon={<ShoppingBag className="w-4 h-4" />}
                  >
                    {t('productDetail.addToSourcingCart')}
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Simulated Escrow Checkout Modal */}
        <Dialog
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          title="Secure Direct Escrow Confirmation"
          description="Funds remain protected in Gramora Escrow until quality is verified at your dock"
          size="md"
        >
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-surface-elevated/80 border border-surface-border space-y-2 text-body-sm">
              <div className="flex justify-between">
                <span className="text-foreground/70">Produce Item:</span>
                <span className="font-bold text-foreground">{product.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Quantity:</span>
                <span className="font-mono font-bold text-foreground">{effectiveQty} {product.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Seller:</span>
                <span className="text-foreground">{product.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Delivery Hub:</span>
                <span className="text-foreground">Direct Refrigerated Dispatch</span>
              </div>
              <div className="pt-2 border-t border-surface-border flex justify-between font-bold text-body">
                <span>Total Escrow Amount:</span>
                <span className="font-mono text-primary-400">{formatCurrency(totalOrderEstimate)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-caption text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Zero-Intermediary Guarantee
              </div>
              <p>
                Farmer receives 90% instant disbursal upon dock digital weighing sign-off.
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-body-sm space-y-3">
                <p className="font-semibold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" /> Authentication Required
                </p>
                <p className="text-caption text-amber-300/80">
                  Please sign in to your buyer or consumer account to proceed with locking funds in disintermediated escrow.
                </p>
                <Link href={`/login?redirect=/marketplace/${productId}`}>
                  <Button variant="primary" size="sm" className="w-full mt-1">
                    Sign in to Continue
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="md" disabled={ordering} onClick={() => setCheckoutModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!isOrderable || ordering}
                  loading={ordering}
                  onClick={handleCheckout}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Confirm & Lock Escrow
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      </main>

      <PublicFooter />
    </div>
  );
}
