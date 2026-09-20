import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerInventoryLot } from '../domain/inventory';
import { Transaction } from 'firebase-admin/firestore';

export class InventoryRepository extends BaseFirestoreRepository<ServerInventoryLot> {
  constructor() {
    super(COLLECTIONS.INVENTORY_LOTS);
  }

  /**
   * Retrieves all inventory lots belonging to a specific owner (farmer or FPO).
   */
  async findByOwnerId(ownerId: string): Promise<ServerInventoryLot[]> {
    const snapshot = await this.collection.where('ownerId', '==', ownerId).get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerInventoryLot)
    );
  }

  /**
   * Retrieves an inventory record by its linked ProductLot ID.
   */
  async findByProductLotId(productLotId: string): Promise<ServerInventoryLot | null> {
    const snapshot = await this.collection.where('productLotId', '==', productLotId).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() as object) } as ServerInventoryLot;
  }

  /**
   * Retrieves all inventory lots associated with a specific catalog product.
   */
  async findByProductId(productId: string): Promise<ServerInventoryLot[]> {
    const snapshot = await this.collection.where('productId', '==', productId).get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerInventoryLot)
    );
  }

  /**
   * Executes a callback inside an atomic Firestore transaction.
   */
  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(updateFunction);
  }

  /**
   * Reads an inventory document within a transaction context.
   */
  async getInTransaction(transaction: Transaction, id: string): Promise<ServerInventoryLot | null> {
    const docRef = this.collection.doc(id);
    const snap = await transaction.get(docRef);
    if (!snap.exists) {
      return null;
    }
    return { id: snap.id, ...(snap.data() as object) } as ServerInventoryLot;
  }

  /**
   * Writes an inventory update within a transaction context.
   */
  updateInTransaction(
    transaction: Transaction,
    id: string,
    updates: Partial<Omit<ServerInventoryLot, 'id'>>
  ): void {
    const docRef = this.collection.doc(id);
    transaction.update(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const inventoryRepository = new InventoryRepository();
