import { z } from 'zod';
import { Identifiable } from '../repositories/base.repository';
import { UserRole } from '@/types';

/**
 * Authoritative Canonical Order Statuses
 */
export const ORDER_STATUSES = [
  'created',
  'payment_pending',
  'escrow_funded',
  'processing',
  'dispatched',
  'delivered',
  'completed',
  'cancelled',
] as const;

export type ServerOrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Authoritative Payment Statuses
 */
export const PAYMENT_STATUSES = [
  'pending',
  'escrow_locked',
  'disbursed',
  'refunded',
  'failed',
] as const;

export type ServerPaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Authoritative Escrow Statuses
 */
export const ESCROW_STATUSES = [
  'unfunded',
  'held_in_escrow',
  'released_to_seller',
  'refunded_to_buyer',
] as const;

export type ServerEscrowStatus = (typeof ESCROW_STATUSES)[number];

/**
 * Shipping Address Snapshot attached to Order
 */
export interface OrderShippingAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  village?: string;
  district: string;
  state: string;
  postalCode: string;
}

/**
 * Canonical Server Order Entity stored in Firestore 'orders/{orderId}'.
 * Financial fields strictly recorded in integer minor units (paise for INR).
 */
export interface ServerOrder extends Identifiable {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerRole: UserRole;
  sellerIds: string[];
  status: ServerOrderStatus;
  paymentStatus: ServerPaymentStatus;
  escrowStatus: ServerEscrowStatus;
  currency: 'INR';
  subtotalMinor: number;
  shippingFeeMinor: number;
  platformFeeMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  itemCount: number;
  shippingAddressSnapshot: OrderShippingAddress;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  completedAt?: string;
  expiresAt?: string;
  createdBy: string;
  updatedBy: string;
  version: number;
  // UI compatibility computed getters/fields (INR in standard rupees)
  subtotal: number;
  logisticsFee: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
}

/**
 * Canonical Order Item Entity stored in Firestore 'orderItems/{orderItemId}'.
 * Freezes historical produce specifications and price to prevent retroactive alteration.
 */
export interface ServerOrderItem extends Identifiable {
  id: string;
  orderId: string;
  productId: string;
  productLotId?: string;
  sellerId: string;
  sellerNameSnapshot: string;
  productNameSnapshot: string;
  varietySnapshot: string;
  gradeSnapshot: string;
  unitSnapshot: string;
  pricePerUnitMinor: number;
  pricePerUnit: number; // Rupee representation
  quantity: number;
  lineTotalMinor: number;
  lineTotal: number; // Rupee representation
  inventoryReservationIds: string[];
  imageSnapshot?: string;
  createdAt: string;
}

/**
 * Canonical Inventory Reservation Entity stored in 'inventoryReservations/{reservationId}'.
 * Enforces reservation ownership: a reservation belongs to exactly one order.
 */
export interface ServerInventoryReservation extends Identifiable {
  id: string;
  orderId: string;
  orderItemId: string;
  inventoryLotId: string;
  quantity: number;
  status: 'active' | 'released' | 'consumed';
  createdAt: string;
  releasedAt?: string;
  consumedAt?: string;
}

/**
 * Order Event / Audit Record stored in 'orderEvents/{eventId}'.
 */
export interface ServerOrderEvent extends Identifiable {
  id: string;
  orderId: string;
  actorId: string;
  actorRole: string;
  eventType: string;
  fromStatus?: ServerOrderStatus;
  toStatus: ServerOrderStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  requestId: string;
}

/**
 * Strict Zod Validation Schemas
 */
export const CheckoutItemSchema = z
  .object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().positive('Quantity must be greater than zero'),
    productLotId: z.string().min(1).optional(),
  })
  .strict();

export const ShippingAddressSchema = z
  .object({
    name: z.string().min(2, 'Recipient name must be at least 2 characters').max(100),
    phone: z
      .string()
      .regex(/^[0-9+ -]{10,15}$/, 'Valid phone number required')
      .min(10)
      .max(15),
    addressLine1: z.string().min(3, 'Address line 1 is required').max(150),
    addressLine2: z.string().max(150).optional(),
    village: z.string().max(100).optional(),
    district: z.string().min(2, 'District is required').max(100),
    state: z.string().min(2, 'State is required').max(100),
    postalCode: z.string().regex(/^[0-9]{6}$/, 'Must be a 6-digit postal code'),
  })
  .strict();

export const CheckoutRequestSchema = z
  .object({
    items: z
      .array(CheckoutItemSchema)
      .min(1, 'At least one item is required for checkout')
      .max(20, 'Maximum 20 items per checkout consignment'),
    shippingAddress: ShippingAddressSchema,
  })
  .strict();

export type CheckoutInput = z.infer<typeof CheckoutRequestSchema>;

export const CancelOrderSchema = z
  .object({
    reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(300).optional(),
  })
  .strict();

export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;

export const OrderQuerySchema = z
  .object({
    status: z.enum([...ORDER_STATUSES, 'all']).optional().default('all'),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    cursor: z.string().optional(),
  })
  .strict();

export type OrderQueryInput = z.infer<typeof OrderQuerySchema>;
