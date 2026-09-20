import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerOrderItem } from '../domain/order';
import { Transaction } from 'firebase-admin/firestore';

export class OrderItemRepository extends BaseFirestoreRepository<ServerOrderItem> {
  constructor() {
    super(COLLECTIONS.ORDER_ITEMS);
  }

  /**
   * Retrieves all items belonging to an order.
   */
  async findByOrderId(orderId: string): Promise<ServerOrderItem[]> {
    const snap = await this.collection.where('orderId', '==', orderId).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerOrderItem));
  }

  /**
   * Retrieves order items filtered by both order and seller (farmer/FPO isolation).
   */
  async findByOrderIdAndSellerId(orderId: string, sellerId: string): Promise<ServerOrderItem[]> {
    const snap = await this.collection
      .where('orderId', '==', orderId)
      .where('sellerId', '==', sellerId)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerOrderItem));
  }

  /**
   * Creates an order item record within a transaction.
   */
  createInTransaction(
    tx: Transaction,
    item: Omit<ServerOrderItem, 'id'>,
    customId?: string
  ): ServerOrderItem {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const payload = {
      ...item,
      createdAt: new Date().toISOString(),
    };
    tx.set(docRef, payload);
    return { id: docRef.id, ...(payload as object) } as ServerOrderItem;
  }
}

export const orderItemRepository = new OrderItemRepository();
