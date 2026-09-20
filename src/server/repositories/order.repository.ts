import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerOrder, ServerOrderStatus } from '../domain/order';
import { Transaction, Query } from 'firebase-admin/firestore';

export class OrderRepository extends BaseFirestoreRepository<ServerOrder> {
  constructor() {
    super(COLLECTIONS.ORDERS);
  }

  /**
   * Retrieves orders placed by a specific buyer.
   */
  async findByBuyerId(
    buyerId: string,
    status?: ServerOrderStatus | 'all',
    maxLimit: number = 50
  ): Promise<ServerOrder[]> {
    let query = this.collection.where('buyerId', '==', buyerId);

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    // Order by createdAt descending
    const snap = await query.orderBy('createdAt', 'desc').limit(maxLimit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerOrder));
  }

  /**
   * Retrieves orders where a specific producer/FPO is listed as a seller.
   */
  async findBySellerId(
    sellerId: string,
    status?: ServerOrderStatus | 'all',
    maxLimit: number = 50
  ): Promise<ServerOrder[]> {
    let query = this.collection.where('sellerIds', 'array-contains', sellerId);

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snap = await query.orderBy('createdAt', 'desc').limit(maxLimit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerOrder));
  }

  /**
   * Retrieves all orders (administrative view).
   */
  async findAllOrders(
    status?: ServerOrderStatus | 'all',
    maxLimit: number = 50
  ): Promise<ServerOrder[]> {
    let query: Query = this.collection;

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snap = await query.orderBy('createdAt', 'desc').limit(maxLimit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerOrder));
  }

  /**
   * Executes a callback inside an atomic Firestore transaction.
   */
  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(updateFunction);
  }

  /**
   * Reads an order document within a transaction.
   */
  async getInTransaction(transaction: Transaction, id: string): Promise<ServerOrder | null> {
    const docRef = this.collection.doc(id);
    const snap = await transaction.get(docRef);
    if (!snap.exists) {
      return null;
    }
    return { id: snap.id, ...(snap.data() as object) } as ServerOrder;
  }

  /**
   * Creates an order document inside a transaction.
   */
  createInTransaction(
    transaction: Transaction,
    order: Omit<ServerOrder, 'id'>,
    customId?: string
  ): ServerOrder {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date().toISOString();
    const payload = {
      ...order,
      createdAt: order.createdAt || now,
      updatedAt: order.updatedAt || now,
    };
    transaction.set(docRef, payload);
    return { id: docRef.id, ...(payload as object) } as ServerOrder;
  }

  /**
   * Writes an order update within a transaction context.
   */
  updateInTransaction(
    transaction: Transaction,
    id: string,
    updates: Partial<Omit<ServerOrder, 'id'>>
  ): void {
    const docRef = this.collection.doc(id);
    transaction.update(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const orderRepository = new OrderRepository();
