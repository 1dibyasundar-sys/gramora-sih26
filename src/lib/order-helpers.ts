/**
 * Order and Escrow Role-Based UI Presentation Helpers
 * Gramora Smart Agri Marketplace (SIH 2026)
 */

import { Order, User, normalizeRole } from '@/types';

export type EscrowPaymentViewType =
  | 'buyer_pay'
  | 'farmer_awaiting'
  | 'logistics_pending'
  | 'admin_pending'
  | 'escrow_funded'
  | 'none';

export interface OrderPaymentRoleView {
  canPay: boolean;
  viewType: EscrowPaymentViewType;
  title: string;
  description: string;
  badgeText: string;
}

export interface GetOrderPaymentRoleViewParams {
  user: Pick<User, 'id' | 'role'> | null;
  order: Pick<Order, 'buyerId' | 'sellerId' | 'status'> | null;
}

/**
 * Resolves the server-authoritative role-aware presentation for consignment payment status.
 * Ensures the payment CTA ("Pay ₹X") is exclusively available to the purchasing buyer,
 * while farmers, FPOs, logistics, and administrators receive non-actionable status indicators.
 */
export function getOrderPaymentRoleView(params: GetOrderPaymentRoleViewParams): OrderPaymentRoleView {
  const { user, order } = params;

  if (!order) {
    return {
      canPay: false,
      viewType: 'none',
      title: '',
      description: '',
      badgeText: '',
    };
  }

  const canonicalUserRole = user?.role ? normalizeRole(user.role) : null;
  const isPurchaser = !!user && user.id === order.buyerId;

  // 1. PAYMENT PENDING STATUS
  if (order.status === 'payment_pending') {
    // Only the authenticated buyer who owns this consignment can fund escrow
    if (isPurchaser && (canonicalUserRole === 'buyer' || canonicalUserRole === 'consumer')) {
      return {
        canPay: true,
        viewType: 'buyer_pay',
        title: 'Escrow Security Funding Required',
        description:
          'Inventory is currently reserved. Fund the disintermediated escrow to trigger producer harvest & pack dispatch.',
        badgeText: 'Razorpay Test Mode',
      };
    }

    // Farmer or FPO producer who grew/supplied the consignment
    if (
      (user && user.id === order.sellerId) ||
      canonicalUserRole === 'farmer' ||
      canonicalUserRole === 'fpo'
    ) {
      return {
        canPay: false,
        viewType: 'farmer_awaiting',
        title: 'Awaiting Buyer Payment',
        description:
          'Your produce is reserved for this consignment. The buyer must complete escrow funding before fulfillment can proceed.',
        badgeText: 'Awaiting Buyer Escrow',
      };
    }

    // Logistics Partner
    if (canonicalUserRole === 'logistics') {
      return {
        canPay: false,
        viewType: 'logistics_pending',
        title: 'Payment Pending',
        description:
          'Awaiting buyer escrow funding confirmation before cold-chain logistics corridor scheduling can proceed.',
        badgeText: 'Payment Pending',
      };
    }

    // Mission Administrator or Unassigned Viewer
    return {
      canPay: false,
      viewType: 'admin_pending',
      title: 'Payment Pending',
      description:
        'Awaiting buyer escrow funding confirmation. Consignment inventory is actively reserved.',
      badgeText: 'Payment Pending',
    };
  }

  // 2. ESCROW FUNDED STATUS
  if (order.status === 'escrow_funded') {
    if (
      (user && user.id === order.sellerId) ||
      canonicalUserRole === 'farmer' ||
      canonicalUserRole === 'fpo'
    ) {
      return {
        canPay: false,
        viewType: 'escrow_funded',
        title: 'Escrow Security Funded & Locked',
        description:
          'Escrow funds have been secured. You may now proceed with produce harvest, quality packaging, and dock dispatch.',
        badgeText: 'Escrow Locked',
      };
    }

    if (isPurchaser) {
      return {
        canPay: false,
        viewType: 'escrow_funded',
        title: 'Escrow Security Funded & Locked',
        description:
          'Payment verified cryptographically via Razorpay. Funds are held safely in Gramora Escrow pending dock delivery inspection.',
        badgeText: 'Escrow Locked',
      };
    }

    return {
      canPay: false,
      viewType: 'escrow_funded',
      title: 'Escrow Security Funded & Locked',
      description:
        'Consignment escrow is fully funded. Logistics corridor scheduling and dock fulfillment can proceed.',
      badgeText: 'Escrow Locked',
    };
  }

  // Other statuses (processing, dispatched, delivered, completed, cancelled)
  return {
    canPay: false,
    viewType: 'none',
    title: '',
    description: '',
    badgeText: '',
  };
}
