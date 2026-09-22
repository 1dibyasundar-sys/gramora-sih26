'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useOrder } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { orderService } from '@/services';
import { Timeline } from '@/components/data-display/timeline';
import { StatusBadge } from '@/components/data-display/status-badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AppImage } from '@/components/data-display/app-image';
import {
  ArrowLeft,
  Truck,
  Thermometer,
  ShieldCheck,
  FileText,
  MapPin,
  Calendar,
  Phone,
  CheckCircle2,
  Ban,
  AlertTriangle,
  CreditCard,
  Lock,
  Clock,
} from 'lucide-react';
import { useToast } from '@/components/feedback/toast';
import { apiOrderService } from '@/services/api/order.service';
import { getOrderPaymentRoleView } from '@/lib/order-helpers';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = (params.id as string) || 'ord-101';
  const { order, loading, refetch } = useOrder(orderId);
  const { role, user } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Razorpay Payment States
  const [paying, setPaying] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayWithRazorpay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment gateway SDK. Please check your internet connection.');
      }

      // 1. Authoritatively create order on server
      const paymentConfig = await apiOrderService.createPaymentOrder(order.id);

      // 2. Open client Razorpay modal
      const options = {
        key: paymentConfig.keyId,
        amount: paymentConfig.amountPaise,
        currency: paymentConfig.currency,
        name: 'GRAMORA Smart Agri Marketplace',
        description: `Escrow Hold: Consignment ${paymentConfig.orderNumber}`,
        order_id: paymentConfig.providerOrderId,
        handler: async (response: any) => {
          setVerifyingPayment(true);
          try {
            await apiOrderService.verifyPayment({
              orderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            success('Payment verified! Escrow funds have been successfully locked.');
            refetch();
          } catch (verifyErr) {
            showErrorToast(
              verifyErr instanceof Error ? verifyErr.message : 'Server payment verification failed'
            );
          } finally {
            setVerifyingPayment(false);
          }
        },
        prefill: {
          name: order.buyerName,
          contact: order.deliveryAddress?.contactPhone,
        },
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        theme: {
          color: '#16a34a',
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', (resp: any) => {
        showErrorToast(resp.error?.description || 'Payment failed at provider.');
        setPaying(false);
      });
      razorpayInstance.open();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to initiate payment.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto py-12 px-4 space-y-6 animate-pulse">
          <div className="h-8 bg-surface-elevated rounded-lg w-1/3" />
          <div className="h-64 bg-surface-elevated rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto py-16 px-4 text-center space-y-4">
          <h2 className="text-h2 font-bold text-foreground">Order Not Found</h2>
          <p className="text-body-sm text-foreground/60">
            Could not retrieve consignment details for ID: {orderId}
          </p>
          <Link href="/orders">
            <Button variant="secondary">Back to Orders</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const isCancellable =
    order.status !== 'cancelled' &&
    order.status !== 'completed' &&
    order.status !== 'delivered' &&
    order.status !== 'dispatched';
  const canCancel =
    isCancellable &&
    (role === 'admin' || role === 'buyer' || role === 'consumer' || user?.id === order.buyerId);

  const paymentView = getOrderPaymentRoleView({ user, order });

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      await orderService.updateOrderStatus(order.id, 'cancelled');
      success('Consignment cancelled successfully. Reserved inventory has been released.');
      setCancelModalOpen(false);
      refetch();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to cancel consignment');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Consignments', href: '/orders' },
              { label: order.orderNumber },
            ]}
          />
          <div className="flex items-center gap-3">
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Ban className="w-4 h-4" />}
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel Consignment
              </Button>
            )}
            <Link href="/orders">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Consignments
              </Button>
            </Link>
          </div>
        </div>

        {/* Cancelled Banner if applicable */}
        {order.status === 'cancelled' && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-3 text-rose-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-bold text-body-sm">This consignment order has been cancelled.</p>
              <p className="text-caption text-rose-300/80">
                All reserved farm stock was atomically released back to the producer inventory pool. Escrow transactions have been settled.
              </p>
            </div>
          </div>
        )}

        {/* Order Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-primary border border-surface-border">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-h3 font-bold text-foreground font-mono">{order.orderNumber}</h2>
              <StatusBadge status={order.status} size="md" />
            </div>
            <p className="text-caption text-foreground/60">
              Placed on {formatDate(order.createdAt)} • Simulated Escrow:{' '}
              <strong className="text-emerald-400 font-mono uppercase">{order.paymentStatus.replace('_', ' ')}</strong>
            </p>
          </div>

          <div className="text-right">
            <div className="text-h2 font-extrabold text-primary-400 font-mono">
              {formatCurrency(order.totalAmount)}
            </div>
            <span className="text-caption text-foreground/50">Disintermediated Escrow Total</span>
          </div>
        </div>

        {/* Role-Aware Payment & Escrow Status Cards */}
        {order.status === 'payment_pending' && (
          <>
            {paymentView.canPay ? (
              /* Purchasing Buyer: Actionable Payment Card */
              <GlassCard variant="strong" className="p-6 border-amber-500/50 bg-amber-950/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-amber-400" />
                      <h3 className="text-body font-bold text-foreground">{paymentView.title}</h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {paymentView.badgeText}
                      </span>
                    </div>
                    <p className="text-body-sm text-foreground/70">
                      {paymentView.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      loading={paying || verifyingPayment}
                      onClick={handlePayWithRazorpay}
                      leftIcon={<CreditCard className="w-4 h-4" />}
                    >
                      {verifyingPayment
                        ? 'Verifying Payment...'
                        : paying
                        ? 'Opening Checkout...'
                        : `Pay ${formatCurrency(order.totalAmount)}`}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ) : paymentView.viewType === 'farmer_awaiting' ? (
              /* Farmer / FPO Producer: Non-actionable Awaiting Buyer Payment Card */
              <GlassCard variant="strong" className="p-6 border-amber-500/40 bg-amber-950/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <h3 className="text-body font-bold text-foreground">{paymentView.title}</h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {paymentView.badgeText}
                      </span>
                    </div>
                    <p className="text-body-sm text-foreground/70">
                      {paymentView.description}
                    </p>
                  </div>
                  <div className="text-right sm:shrink-0">
                    <span className="text-caption text-foreground/50 block">Amount Due from Buyer:</span>
                    <span className="text-body font-mono font-bold text-amber-400">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ) : (
              /* Logistics / Admin: Non-actionable Payment Pending Status Card */
              <GlassCard variant="strong" className="p-6 border-surface-border bg-surface-primary/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <h3 className="text-body font-bold text-foreground">{paymentView.title}</h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-border text-foreground/70 border border-surface-border">
                        {paymentView.badgeText}
                      </span>
                    </div>
                    <p className="text-body-sm text-foreground/70">
                      {paymentView.description}
                    </p>
                  </div>
                  <div className="text-right sm:shrink-0">
                    <span className="text-caption text-foreground/50 block">Consignment Total:</span>
                    <span className="text-body font-mono font-bold text-foreground">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </GlassCard>
            )}
          </>
        )}

        {/* Escrow Funded Confirmation Banner */}
        {order.status === 'escrow_funded' && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold text-body-sm">{paymentView.title || 'Escrow Security Funded & Locked'}</p>
              <p className="text-caption text-emerald-300/80">
                {paymentView.description ||
                  'Payment verified cryptographically via Razorpay. Funds are held safely in Gramora Escrow pending dock delivery inspection.'}
              </p>
            </div>
          </div>
        )}

        {/* 2 Columns: Left Timeline & Telemetry | Right Items & Addresses */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Real-time Timeline & Cold-Chain Sensor */}
          <div className="lg:col-span-7 space-y-6">
            {/* Cold Chain Live Sensor Widget */}
            {order.coldChainTelemetry && (
              <GlassCard variant="strong" className="p-5 border-cyan-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <h3 className="text-body font-bold text-foreground">Reefer Truck Thermal Telemetry</h3>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Simulated
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300">
                    Updated {order.coldChainTelemetry.lastUpdated}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-surface-primary/80 border border-surface-border">
                    <span className="text-caption text-foreground/50 block">Current Cargo Temp</span>
                    <span className="text-h4 font-bold text-cyan-300 font-mono">
                      {order.coldChainTelemetry.currentTempCelsius}°C
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-primary/80 border border-surface-border">
                    <span className="text-caption text-foreground/50 block">Relative Humidity</span>
                    <span className="text-h4 font-bold text-foreground font-mono">
                      {order.coldChainTelemetry.humidityPercent}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-primary/80 border border-surface-border">
                    <span className="text-caption text-foreground/50 block">Sensor Status</span>
                    <span className="text-h4 font-bold text-emerald-400 font-mono">
                      {order.coldChainTelemetry.sensorStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-caption text-foreground/60 pt-1">
                  <span>Target Range: {order.coldChainTelemetry.targetTempCelsius}°C (±1.5°C tolerance)</span>
                  <span>Sensor Battery: {order.coldChainTelemetry.batteryLevel}%</span>
                </div>
              </GlassCard>
            )}

            {/* Turn-by-turn Professional Timeline */}
            <div className="rounded-2xl p-6 glass-panel border border-surface-border space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <h3 className="text-body font-bold text-foreground">Consignment Milestone Tracking</h3>
                <span className="text-caption text-foreground/50">Simulated Escrow Milestones</span>
              </div>

              <Timeline steps={order.timeline} />
            </div>
          </div>

          {/* Right Column: Order Items, Parties & Addresses */}
          <div className="lg:col-span-5 space-y-6">
            {/* Manifest List */}
            <div className="p-6 rounded-2xl bg-surface-primary border border-surface-border space-y-4">
              <h3 className="text-body font-bold text-foreground">Produce Manifest</h3>
              <div className="space-y-3 divide-y divide-surface-border/50">
                {order.items.map((item, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-surface-border shrink-0">
                          <AppImage
                            src={item.image}
                            alt={item.productName}
                            aspectRatio="square"
                          />
                        </div>
                      )}
                      <div>
                        <h4 className="text-body-sm font-bold text-foreground">{item.productName}</h4>
                        <span className="text-caption text-foreground/50">
                          {item.quantity} {item.unit} @ ₹{item.pricePerUnit}/{item.unit}
                        </span>
                      </div>
                    </div>
                    <span className="text-body-sm font-bold text-foreground font-mono">
                      {formatCurrency(item.pricePerUnit * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown Details */}
              <div className="pt-4 border-t border-surface-border space-y-2 text-caption">
                <div className="flex justify-between text-foreground/70">
                  <span>Farm Gate Subtotal:</span>
                  <span className="font-mono">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-foreground/60">
                  <span>Cold-Chain Freight:</span>
                  <span className="font-mono">{formatCurrency(order.logisticsFee)}</span>
                </div>
                <div className="flex justify-between text-foreground/60">
                  <span>Escrow & Digital Quality Fee:</span>
                  <span className="font-mono">{formatCurrency(order.platformFee)}</span>
                </div>
                <div className="pt-2 border-t border-surface-border flex justify-between font-bold text-body text-foreground">
                  <span>Total Escrow Amount:</span>
                  <span className="font-mono text-primary-400">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address & Contacts */}
            <div className="rounded-2xl p-6 glass-panel border border-surface-border space-y-4 text-body-sm">
              <h3 className="text-body font-bold text-foreground">Logistics Parties & Dock Destination</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-caption text-foreground/50 block">Producer Source:</span>
                  <span className="font-semibold text-foreground">{order.sellerName}</span>
                </div>

                <div>
                  <span className="text-caption text-foreground/50 block">Buyer Destination:</span>
                  <span className="font-semibold text-foreground">{order.buyerName}</span>
                  <p className="text-caption text-foreground/70 mt-0.5">
                    {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                  </p>
                  <p className="text-caption text-foreground/50 font-mono mt-0.5">
                    Contact: {order.deliveryAddress.contactPhone}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      <Dialog
        isOpen={cancelModalOpen}
        onClose={() => !cancelling && setCancelModalOpen(false)}
        title="Cancel Consignment Order"
        description="Release reserved inventory and cancel transaction"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-caption space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Confirmation Required: Consignment {order.orderNumber}
            </p>
            <p>
              Cancelling this order will immediately release all reserved produce back to the farmer&apos;s available inventory pool and void the pending escrow transaction.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-body-sm font-semibold text-foreground block">
              Reason for Cancellation (Optional)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Quantity altered, procurement postponed..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-foreground placeholder:text-foreground/40 text-body-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <Button
              variant="ghost"
              size="sm"
              disabled={cancelling}
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Consignment
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelling}
              onClick={handleConfirmCancel}
              leftIcon={<Ban className="w-4 h-4" />}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
