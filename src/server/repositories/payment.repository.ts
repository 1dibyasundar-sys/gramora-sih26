import { Transaction } from 'firebase-admin/firestore';
import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { PaymentRecord, PaymentWebhookEvent } from '../domain/payment';

export class PaymentRepository extends BaseFirestoreRepository<PaymentRecord> {
  constructor() {
    super(COLLECTIONS.PAYMENTS);
  }

  private get webhookCollection() {
    return this.db.collection(COLLECTIONS.PAYMENT_WEBHOOK_EVENTS);
  }

  /**
   * Retrieves the most recent payment record associated with a Gramora order.
   */
  async findByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const snap = await this.collection
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (snap.empty) {
      return null;
    }
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as object) } as PaymentRecord;
  }

  /**
   * Retrieves payment record by Razorpay provider order ID (e.g. order_xxx).
   */
  async findByProviderOrderId(providerOrderId: string): Promise<PaymentRecord | null> {
    const snap = await this.collection
      .where('providerOrderId', '==', providerOrderId)
      .limit(1)
      .get();

    if (snap.empty) {
      return null;
    }
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as object) } as PaymentRecord;
  }

  /**
   * Retrieves payment record by Razorpay provider payment ID (e.g. pay_xxx).
   */
  async findByProviderPaymentId(providerPaymentId: string): Promise<PaymentRecord | null> {
    const snap = await this.collection
      .where('providerPaymentId', '==', providerPaymentId)
      .limit(1)
      .get();

    if (snap.empty) {
      return null;
    }
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as object) } as PaymentRecord;
  }

  /**
   * Reads a payment record inside a transaction.
   */
  async getInTransaction(tx: Transaction, id: string): Promise<PaymentRecord | null> {
    const docRef = this.collection.doc(id);
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      return null;
    }
    return { id: snap.id, ...(snap.data() as object) } as PaymentRecord;
  }

  /**
   * Creates a payment record inside a transaction.
   */
  createInTransaction(
    tx: Transaction,
    payment: Omit<PaymentRecord, 'id'>,
    customId?: string
  ): PaymentRecord {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date().toISOString();
    const payload: PaymentRecord = {
      ...payment,
      id: docRef.id,
      createdAt: payment.createdAt || now,
      updatedAt: payment.updatedAt || now,
    };
    tx.set(docRef, payload);
    return payload;
  }

  /**
   * Updates a payment record inside a transaction.
   */
  updateInTransaction(
    tx: Transaction,
    id: string,
    updates: Partial<Omit<PaymentRecord, 'id'>>
  ): void {
    const docRef = this.collection.doc(id);
    tx.update(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Reads a webhook event record inside a transaction for idempotency.
   */
  async getWebhookEventInTransaction(
    tx: Transaction,
    eventId: string
  ): Promise<PaymentWebhookEvent | null> {
    const docRef = this.webhookCollection.doc(eventId);
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      return null;
    }
    return { id: snap.id, ...(snap.data() as object) } as PaymentWebhookEvent;
  }

  /**
   * Sets or updates a webhook event inside a transaction.
   */
  saveWebhookEventInTransaction(
    tx: Transaction,
    event: PaymentWebhookEvent
  ): void {
    const docRef = this.webhookCollection.doc(event.id);
    tx.set(docRef, event);
  }

  /**
   * Retrieves a webhook event record by eventId.
   */
  async findWebhookEvent(eventId: string): Promise<PaymentWebhookEvent | null> {
    const docSnap = await this.webhookCollection.doc(eventId).get();
    if (!docSnap.exists) {
      return null;
    }
    return { id: docSnap.id, ...(docSnap.data() as object) } as PaymentWebhookEvent;
  }

  /**
   * Records a webhook event outside of a transaction.
   */
  async recordWebhookEvent(
    event: Omit<PaymentWebhookEvent, 'id'>,
    customId?: string
  ): Promise<PaymentWebhookEvent> {
    const docId = customId || event.eventId;
    const docRef = this.webhookCollection.doc(docId);
    const payload: PaymentWebhookEvent = {
      ...event,
      id: docId,
    };
    await docRef.set(payload);
    return payload;
  }
}

export const paymentRepository = new PaymentRepository();
