import { z } from 'zod';
import { Identifiable } from '../repositories/base.repository';

/**
  * Authoritative Canonical Payment Statuses
  */
export const PAYMENT_RECORD_STATUSES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
] as const;

export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export type PaymentProvider = 'razorpay';

/**
 * Authoritative external payment transaction record stored in Firestore 'payments/{paymentId}'.
 * Preserves exact external provider order and payment IDs mapped to Gramora order.
 */
export interface PaymentRecord extends Identifiable {
  id: string;
  orderId: string;
  buyerId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  providerPaymentId?: string;
  amountPaise: number;
  currency: 'INR';
  status: PaymentRecordStatus;
  createdAt: string;
  updatedAt: string;
  capturedAt?: string;
  failedAt?: string;
  failureCode?: string;
  failureDescription?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Idempotent Webhook Event record stored in Firestore 'paymentWebhookEvents/{eventId}'.
 * Guarantees zero duplicate event processing.
 */
export interface PaymentWebhookEvent extends Identifiable {
  id: string; // Document ID is the provider's eventId
  eventId: string;
  provider: PaymentProvider;
  eventType: string;
  receivedAt: string;
  processedAt?: string;
  status: 'received' | 'processed' | 'ignored' | 'failed';
  payloadHash: string;
  relatedOrderId?: string;
  relatedPaymentId?: string;
  errorMessage?: string;
}

/**
 * Safe public payment configuration passed to client Razorpay Checkout
 */
export interface SafePaymentConfig {
  provider: PaymentProvider;
  providerOrderId: string;
  amountPaise: number;
  currency: 'INR';
  keyId: string;
  orderNumber: string;
}

/**
 * Request validation schema for creating a Razorpay order on the server
 */
export const CreatePaymentOrderSchema = z
  .object({
    orderId: z.string().min(1, 'Order ID is required'),
  })
  .strict();

export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderSchema>;

/**
 * Request validation schema for client payment verification callback
 */
export const VerifyPaymentSchema = z
  .object({
    orderId: z.string().min(1, 'Order ID is required'),
    razorpayPaymentId: z.string().min(1, 'Razorpay Payment ID is required'),
    razorpayOrderId: z.string().min(1, 'Razorpay Order ID is required'),
    razorpaySignature: z.string().min(1, 'Razorpay Signature is required'),
  })
  .strict();

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
