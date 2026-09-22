import crypto from 'crypto';
import { Transaction } from 'firebase-admin/firestore';
import { orderRepository, OrderRepository } from '../repositories/order.repository';
import { paymentRepository, PaymentRepository } from '../repositories/payment.repository';
import {
  inventoryReservationRepository,
  InventoryReservationRepository,
} from '../repositories/inventory-reservation.repository';
import { escrowRepository, EscrowRepository } from '../repositories/escrow.repository';
import { auditLogRepository, AuditLogRepository } from '../repositories/audit-log.repository';
import { razorpayClient, RazorpayClient } from '../lib/razorpay';
import {
  getRazorpayConfig,
  getRazorpayCheckoutConfig,
  isRazorpayConfigured,
  isRazorpayCheckoutConfigured,
  isRazorpayWebhookConfigured,
} from '../config/env';
import {
  PaymentRecord,
  PaymentWebhookEvent,
  SafePaymentConfig,
  VerifyPaymentInput,
} from '../domain/payment';
import { ServerOrder } from '../domain/order';
import { AuthenticatedUser } from '../auth/verify-token';
import { requireExactRole, requireOwnershipOrAdmin, requireRole } from '../auth/rbac';
import {
  AppError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
} from '../lib/errors';
import { logger } from '../lib/logger';
import { COLLECTIONS } from '../repositories/collections';

export interface EscrowFundingParams {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  paidAmountPaise: number;
  paidCurrency: string;
  actorId: string;
  actorRole: string;
  source: 'webhook' | 'client_callback';
  eventId?: string;
  payloadHash?: string;
  rawEventPayload?: Record<string, unknown>;
}

export class PaymentService {
  private orderRepo: OrderRepository;
  private paymentRepo: PaymentRepository;
  private reservationRepo: InventoryReservationRepository;
  private escrowRepo: EscrowRepository;
  private auditLogRepo: AuditLogRepository;
  private razorpay: RazorpayClient;

  constructor(
    orderRepo: OrderRepository = orderRepository,
    paymentRepo: PaymentRepository = paymentRepository,
    reservationRepo: InventoryReservationRepository = inventoryReservationRepository,
    escrowRepo: EscrowRepository = escrowRepository,
    auditLogRepo: AuditLogRepository = auditLogRepository,
    razorpay: RazorpayClient = razorpayClient
  ) {
    this.orderRepo = orderRepo;
    this.paymentRepo = paymentRepo;
    this.reservationRepo = reservationRepo;
    this.escrowRepo = escrowRepo;
    this.auditLogRepo = auditLogRepo;
    this.razorpay = razorpay;
  }

  /**
   * Authoritative Server-Side Razorpay Order Creation
   * Validates identity, ownership, inventory reservation, order state, and server-side total.
   */
  async createPaymentOrder(
    orderId: string,
    user: AuthenticatedUser,
    requestId: string = crypto.randomUUID()
  ): Promise<SafePaymentConfig> {
    // Strict Payer Authorization: Only the purchasing party ('buyer' or 'consumer' who placed this order)
    // can initiate customer escrow funding. Producers (farmers/FPOs), logistics, unrelated buyers, and administrators
    // are strictly prohibited from funding or acting as the payer.
    requireExactRole(user, 'buyer', 'consumer', 'bulk_buyer');

    // 1. Fetch trusted order record
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order', orderId);
    }

    // 2. Strict purchaser ownership verification (zero admin or third-party bypass)
    if (user.uid !== order.buyerId) {
      throw new AuthorizationError(
        'Payment initiation rejected. Only the purchasing buyer who placed this consignment can fund escrow.'
      );
    }

    // 3. State verification: order must be in 'payment_pending'
    if (order.status !== 'payment_pending') {
      throw new AppError(
        `Order '${order.orderNumber}' is in status '${order.status}'. Payment can only be initiated for 'payment_pending' orders.`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // 4. Verify inventory reservation still exists and is active
    const reservations = await this.reservationRepo.findByOrderId(orderId);
    const activeReservations = reservations.filter((r) => r.status === 'active');
    if (activeReservations.length === 0) {
      throw new ConflictError(
        `Order '${order.orderNumber}' has no active inventory reservations. Consignment may have expired or been released.`
      );
    }

    // 5. Authoritative financial integrity (Strict server-side paise & currency)
    const amountPaise = order.totalMinor;
    if (!amountPaise || amountPaise <= 0) {
      throw new BadRequestError('Invalid order total amount.');
    }
    if (order.currency !== 'INR') {
      throw new BadRequestError(`Unsupported currency '${order.currency}'. Only INR is permitted.`);
    }

    // 6. Check if Razorpay is configured
    if (!isRazorpayCheckoutConfigured()) {
      throw new ServiceUnavailableError('Razorpay payment gateway is not configured on this server.');
    }
    const config = getRazorpayCheckoutConfig();

    // 7. Check if an active payment record already exists with providerOrderId
    let existingPayment = await this.paymentRepo.findByOrderId(orderId);

    let providerOrderId: string;

    if (
      existingPayment &&
      existingPayment.status === 'created' &&
      existingPayment.amountPaise === amountPaise &&
      existingPayment.providerOrderId
    ) {
      // Reuse existing provider order if still valid
      providerOrderId = existingPayment.providerOrderId;
    } else {
      // 8. Create external Razorpay order via server API
      const rzpOrder = await this.razorpay.createOrder({
        amountPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          buyerId: user.uid,
          requestId,
        },
      });

      providerOrderId = rzpOrder.id;

      // 9. Persist/update PaymentRecord
      if (existingPayment) {
        await this.paymentRepo.update(existingPayment.id, {
          providerOrderId,
          amountPaise,
          status: 'created',
          updatedAt: new Date().toISOString(),
        });
      } else {
        existingPayment = await this.paymentRepo.create({
          orderId: order.id,
          buyerId: user.uid,
          provider: 'razorpay',
          providerOrderId,
          amountPaise,
          currency: 'INR',
          status: 'created',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 10. Audit Log: payment order created
      await this.auditLogRepo.record({
        action: 'PAYMENT_ORDER_CREATED',
        actorUid: user.uid,
        actorRole: user.role,
        targetId: order.id,
        targetType: 'order',
        requestId,
        details: {
          orderNumber: order.orderNumber,
          provider: 'razorpay',
          providerOrderId,
          amountPaise,
          currency: 'INR',
        },
      });
    }

    logger.info('Razorpay payment order initialized', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      providerOrderId,
      amountPaise,
      buyerId: user.uid,
      requestId,
    });

    // 11. Return safe checkout configuration (NEVER leak secrets)
    return {
      provider: 'razorpay',
      providerOrderId,
      amountPaise,
      currency: 'INR',
      keyId: config.keyId,
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Client-side Payment Verification Callback
   * Provides rapid UX feedback while validating HMAC signature server-side.
   */
  async verifyClientPayment(
    input: VerifyPaymentInput,
    user: AuthenticatedUser,
    requestId: string = crypto.randomUUID()
  ): Promise<{ orderId: string; status: string; paymentStatus: string; alreadyProcessed: boolean }> {
    // Strict Payer Authorization: Only the purchasing party can verify client-side payment
    requireExactRole(user, 'buyer', 'consumer', 'bulk_buyer');

    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new NotFoundError('Order', input.orderId);
    }

    if (user.uid !== order.buyerId) {
      throw new AuthorizationError(
        'Payment verification rejected. Only the purchasing buyer who placed this consignment can verify payment.'
      );
    }

    // If order is already funded, return idempotent success
    if (order.status === 'escrow_funded') {
      return {
        orderId: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        alreadyProcessed: true,
      };
    }

    // Verify provider order ID belongs to this order
    const payment = await this.paymentRepo.findByOrderId(order.id);
    if (!payment || payment.providerOrderId !== input.razorpayOrderId) {
      logger.warn('Payment providerOrderId mismatch during client verification', {
        expected: payment?.providerOrderId,
        received: input.razorpayOrderId,
        orderId: order.id,
      });
      throw new BadRequestError('Razorpay order ID does not match this Gramora consignment order.');
    }

    // Cryptographic signature check
    if (!isRazorpayCheckoutConfigured()) {
      throw new ServiceUnavailableError('Razorpay payment gateway is not configured on this server.');
    }
    const config = getRazorpayCheckoutConfig();
    const isValidSignature = RazorpayClient.verifyPaymentSignature({
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      secret: config.keySecret,
    });

    if (!isValidSignature) {
      await this.auditLogRepo.record({
        action: 'PAYMENT_SIGNATURE_MISMATCH',
        actorUid: user.uid,
        actorRole: user.role,
        targetId: order.id,
        targetType: 'order',
        requestId,
        details: {
          razorpayOrderId: input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
        },
      });
      throw new BadRequestError('Cryptographic payment signature verification failed.');
    }

    // Execute atomic transition
    await this.executeAtomicEscrowFunding({
      orderId: order.id,
      providerOrderId: input.razorpayOrderId,
      providerPaymentId: input.razorpayPaymentId,
      paidAmountPaise: order.totalMinor,
      paidCurrency: 'INR',
      actorId: user.uid,
      actorRole: user.role,
      source: 'client_callback',
    });

    return {
      orderId: order.id,
      status: 'escrow_funded',
      paymentStatus: 'escrow_locked',
      alreadyProcessed: false,
    };
  }

  /**
   * Process Authoritative Razorpay Webhook Event
   * Validates raw-body HMAC-SHA256 signature and executes atomic state transition.
   */
  async processWebhook(
    rawBody: string,
    signature: string | null,
    requestId: string = crypto.randomUUID()
  ): Promise<{ received: boolean; status: 'processed' | 'ignored' | 'failed'; reason?: string }> {
    if (!signature) {
      logger.warn('Webhook rejected: missing signature header', { requestId });
      throw new BadRequestError('Missing X-Razorpay-Signature header.');
    }

    if (!isRazorpayWebhookConfigured()) {
      logger.warn('Webhook rejected: webhook secret not configured on server', { requestId });
      throw new ServiceUnavailableError(
        'Razorpay webhook configuration is incomplete. Missing RAZORPAY_WEBHOOK_SECRET.'
      );
    }
    const config = getRazorpayConfig();
    const isValid = RazorpayClient.verifyWebhookSignature(rawBody, signature, config.webhookSecret);

    if (!isValid) {
      await this.auditLogRepo.record({
        action: 'WEBHOOK_SIGNATURE_INVALID',
        actorUid: 'anonymous',
        actorRole: 'system',
        targetId: 'razorpay_webhook',
        targetType: 'system',
        requestId,
        details: {},
      });
      logger.warn('Webhook rejected: invalid HMAC signature', { requestId });
      throw new BadRequestError('Invalid webhook signature.');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new BadRequestError('Malformed webhook JSON payload.');
    }

    const eventType: string = payload.event;
    const eventId: string = payload.id || crypto.createHash('sha256').update(rawBody).digest('hex');
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    logger.info('Processing verified Razorpay webhook', {
      eventType,
      eventId,
      requestId,
    });

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;

      const providerPaymentId: string = paymentEntity?.id;
      const providerOrderId: string = paymentEntity?.order_id || orderEntity?.id;
      const amountPaise: number = paymentEntity?.amount || orderEntity?.amount;
      const currency: string = paymentEntity?.currency || orderEntity?.currency || 'INR';
      const notesOrderId: string | undefined = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId;

      if (!providerOrderId) {
        logger.warn('Webhook missing providerOrderId', { eventId, eventType });
        return { received: true, status: 'ignored', reason: 'missing_provider_order_id' };
      }

      // Find the associated Gramora payment or order
      let paymentRecord = await this.paymentRepo.findByProviderOrderId(providerOrderId);
      let orderId = paymentRecord?.orderId || notesOrderId;

      if (!orderId) {
        logger.warn('No matching Gramora order found for providerOrderId', {
          providerOrderId,
          eventId,
        });
        return { received: true, status: 'ignored', reason: 'order_not_found' };
      }

      const result = await this.executeAtomicEscrowFunding({
        orderId,
        providerOrderId,
        providerPaymentId: providerPaymentId || `pay_captured_${providerOrderId}`,
        paidAmountPaise: amountPaise,
        paidCurrency: currency,
        actorId: 'razorpay_webhook',
        actorRole: 'system',
        source: 'webhook',
        eventId,
        payloadHash,
        rawEventPayload: payload,
      });

      return { received: true, status: result.status, reason: result.reason };
    }

    if (eventType === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      const providerOrderId = paymentEntity?.order_id;
      const providerPaymentId = paymentEntity?.id;

      if (providerOrderId) {
        const paymentRecord = await this.paymentRepo.findByProviderOrderId(providerOrderId);
        if (paymentRecord) {
          await this.paymentRepo.update(paymentRecord.id, {
            status: 'failed',
            providerPaymentId,
            failedAt: new Date().toISOString(),
            failureCode: paymentEntity?.error_code || 'PAYMENT_FAILED',
            failureDescription: paymentEntity?.error_description || 'Payment failed at provider',
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await this.auditLogRepo.record({
        action: 'PAYMENT_FAILED',
        actorUid: 'razorpay_webhook',
        actorRole: 'system',
        targetId: providerOrderId || 'unknown',
        targetType: 'order',
        requestId,
        details: {
          providerPaymentId,
          providerOrderId,
          errorCode: paymentEntity?.error_code,
          errorDescription: paymentEntity?.error_description,
        },
      });

      return { received: true, status: 'processed', reason: 'payment_marked_failed' };
    }

    return { received: true, status: 'ignored', reason: 'unhandled_event_type' };
  }

  /**
   * Atomic Firestore Transaction: Payment + Escrow Hold + Order Status Transition
   * Transitions: payment_pending → escrow_funded
   * Enforces exact paise amount and currency match. Guarantees idempotency.
   */
  async executeAtomicEscrowFunding(params: EscrowFundingParams): Promise<{
    status: 'processed' | 'ignored';
    reason?: string;
  }> {
    const {
      orderId,
      providerOrderId,
      providerPaymentId,
      paidAmountPaise,
      paidCurrency,
      actorId,
      actorRole,
      source,
      eventId,
      payloadHash,
    } = params;

    return this.orderRepo.runTransaction(async (tx: Transaction) => {
      // 1. Check Webhook Idempotency inside transaction if eventId is provided
      if (eventId) {
        const existingEvent = await this.paymentRepo.getWebhookEventInTransaction(tx, eventId);
        if (existingEvent && existingEvent.status === 'processed') {
          logger.info('Webhook event already processed (idempotent ignore)', {
            eventId,
            orderId,
          });
          return { status: 'ignored', reason: 'already_processed' };
        }
      }

      // 2. Read Order within transaction
      const order = await this.orderRepo.getInTransaction(tx, orderId);
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // 3. If order is already in escrow_funded or higher, record idempotency and exit gracefully
      if (order.status === 'escrow_funded') {
        logger.info('Order is already in escrow_funded state', { orderId });
        if (eventId) {
          this.paymentRepo.saveWebhookEventInTransaction(tx, {
            id: eventId,
            eventId,
            provider: 'razorpay',
            eventType: 'payment.captured',
            receivedAt: new Date().toISOString(),
            processedAt: new Date().toISOString(),
            status: 'processed',
            payloadHash: payloadHash || '',
            relatedOrderId: orderId,
            relatedPaymentId: providerPaymentId,
          });
        }
        return { status: 'ignored', reason: 'order_already_escrow_funded' };
      }

      // 4. Validate order state must be payment_pending
      if (order.status !== 'payment_pending') {
        logger.error('Order is not in payment_pending status for escrow funding', {
          orderId,
          currentStatus: order.status,
        });
        throw new ConflictError(
          `Cannot fund escrow: order '${order.orderNumber}' is currently '${order.status}', expected 'payment_pending'.`
        );
      }

      // 5. Amount & Currency Integrity Validation
      if (paidCurrency !== 'INR' || order.currency !== 'INR') {
        logger.error('Currency mismatch during escrow funding', {
          paidCurrency,
          orderCurrency: order.currency,
          orderId,
        });
        throw new BadRequestError(
          `Currency mismatch: paid '${paidCurrency}' but order requires '${order.currency}'.`
        );
      }

      if (order.totalMinor !== paidAmountPaise) {
        logger.error('Amount mismatch during escrow funding', {
          paidAmountPaise,
          orderTotalMinor: order.totalMinor,
          orderId,
        });
        throw new BadRequestError(
          `Amount mismatch: paid ${paidAmountPaise} paise but order total is ${order.totalMinor} paise.`
        );
      }

      const now = new Date().toISOString();

      // 6. Update/Create PaymentRecord inside transaction
      let paymentRecord = await this.paymentRepo.findByOrderId(orderId);
      if (paymentRecord) {
        this.paymentRepo.updateInTransaction(tx, paymentRecord.id, {
          status: 'captured',
          providerPaymentId,
          capturedAt: now,
          updatedAt: now,
        });
      } else {
        this.paymentRepo.createInTransaction(tx, {
          orderId,
          buyerId: order.buyerId,
          provider: 'razorpay',
          providerOrderId,
          providerPaymentId,
          amountPaise: paidAmountPaise,
          currency: 'INR',
          status: 'captured',
          capturedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 7. Append immutable Escrow Transaction (hold record)
      this.escrowRepo.createTransactionInTransaction(tx, {
        orderId,
        type: 'hold',
        amountMinor: order.totalMinor,
        currency: 'INR',
        status: 'completed',
        reference: providerPaymentId,
        notes: `Verified Razorpay payment captured in escrow hold via ${source}`,
        createdAt: now,
        createdBy: actorId,
      });

      // 8. Update Escrow Ledger Summary to 'locked'
      this.escrowRepo.updateLedgerInTransaction(tx, orderId, {
        status: 'locked',
      });

      // 9. Transition Order: payment_pending → escrow_funded
      this.orderRepo.updateInTransaction(tx, orderId, {
        status: 'escrow_funded',
        paymentStatus: 'escrow_locked',
        escrowStatus: 'held_in_escrow',
        updatedAt: now,
      });

      // 10. Record Order Event
      const eventRef = this.orderRepo.db.collection(COLLECTIONS.ORDER_EVENTS).doc();
      tx.set(eventRef, {
        id: eventRef.id,
        orderId,
        actorId,
        actorRole,
        eventType: 'ORDER_ESCROW_FUNDED',
        fromStatus: 'payment_pending',
        toStatus: 'escrow_funded',
        metadata: {
          provider: 'razorpay',
          providerOrderId,
          providerPaymentId,
          amountPaise: paidAmountPaise,
          source,
        },
        createdAt: now,
        requestId: crypto.randomUUID(),
      });

      // 11. Mark Webhook Event as Processed
      if (eventId) {
        this.paymentRepo.saveWebhookEventInTransaction(tx, {
          id: eventId,
          eventId,
          provider: 'razorpay',
          eventType: 'payment.captured',
          receivedAt: now,
          processedAt: now,
          status: 'processed',
          payloadHash: payloadHash || '',
          relatedOrderId: orderId,
          relatedPaymentId: providerPaymentId,
        });
      }

      logger.info('Atomically transitioned order payment_pending -> escrow_funded', {
        orderId,
        orderNumber: order.orderNumber,
        providerPaymentId,
        amountPaise: paidAmountPaise,
        source,
      });

      return { status: 'processed' };
    });
  }
}

export const paymentService = new PaymentService();
