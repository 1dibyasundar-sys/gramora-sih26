import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerInventoryReservation } from '../domain/order';
import { Transaction } from 'firebase-admin/firestore';

export class InventoryReservationRepository extends BaseFirestoreRepository<ServerInventoryReservation> {
  constructor() {
    super(COLLECTIONS.INVENTORY_RESERVATIONS);
  }

  /**
   * Retrieves all reservations associated with an order.
   */
  async findByOrderId(orderId: string): Promise<ServerInventoryReservation[]> {
    const snap = await this.collection.where('orderId', '==', orderId).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerInventoryReservation));
  }

  /**
   * Retrieves all active reservations for an order within a transaction.
   */
  async findActiveByOrderIdInTransaction(
    tx: Transaction,
    orderId: string
  ): Promise<ServerInventoryReservation[]> {
    const queryRef = this.collection
      .where('orderId', '==', orderId)
      .where('status', '==', 'active');
    const snap = await tx.get(queryRef);
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerInventoryReservation));
  }

  /**
   * Creates a new inventory reservation inside a transaction.
   */
  createInTransaction(
    tx: Transaction,
    reservation: Omit<ServerInventoryReservation, 'id'>,
    customId?: string
  ): ServerInventoryReservation {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const payload = {
      ...reservation,
      createdAt: new Date().toISOString(),
    };
    tx.set(docRef, payload);
    return { id: docRef.id, ...(payload as object) } as ServerInventoryReservation;
  }

  /**
   * Updates reservation state inside a transaction (e.g. status: 'released' | 'consumed').
   */
  updateInTransaction(
    tx: Transaction,
    id: string,
    updates: Partial<Omit<ServerInventoryReservation, 'id'>>
  ): void {
    const docRef = this.collection.doc(id);
    tx.update(docRef, {
      ...updates,
    });
  }
}

export const inventoryReservationRepository = new InventoryReservationRepository();
