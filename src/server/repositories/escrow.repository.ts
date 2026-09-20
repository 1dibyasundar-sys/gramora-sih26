import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerEscrowLedger, ServerEscrowTransaction } from '../domain/escrow';
import { Transaction } from 'firebase-admin/firestore';

export class EscrowRepository extends BaseFirestoreRepository<ServerEscrowLedger> {
  constructor() {
    super(COLLECTIONS.ESCROW_LEDGERS);
  }

  private get transactionCollection() {
    return this.db.collection(COLLECTIONS.ESCROW_TRANSACTIONS);
  }

  /**
   * Retrieves escrow ledger summary for a specific order.
   */
  async getLedgerByOrderId(orderId: string): Promise<ServerEscrowLedger | null> {
    return this.findById(orderId);
  }

  /**
   * Retrieves all immutable escrow transactions for an order.
   */
  async getTransactionsByOrderId(orderId: string): Promise<ServerEscrowTransaction[]> {
    const snap = await this.transactionCollection
      .where('orderId', '==', orderId)
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) } as ServerEscrowTransaction));
  }

  /**
   * Creates an escrow ledger summary document inside a transaction.
   * Uses orderId as document ID.
   */
  createLedgerInTransaction(
    tx: Transaction,
    ledger: Omit<ServerEscrowLedger, 'id'>
  ): ServerEscrowLedger {
    const docRef = this.collection.doc(ledger.orderId);
    const now = new Date().toISOString();
    const payload = {
      ...ledger,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(docRef, payload);
    return { id: docRef.id, ...(payload as object) } as ServerEscrowLedger;
  }

  /**
   * Updates an escrow ledger within a transaction.
   */
  updateLedgerInTransaction(
    tx: Transaction,
    orderId: string,
    updates: Partial<Omit<ServerEscrowLedger, 'id'>>
  ): void {
    const docRef = this.collection.doc(orderId);
    tx.update(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Appends an immutable escrow transaction record within a transaction.
   */
  createTransactionInTransaction(
    tx: Transaction,
    entry: Omit<ServerEscrowTransaction, 'id'>
  ): ServerEscrowTransaction {
    const docRef = this.transactionCollection.doc();
    const payload = {
      ...entry,
      createdAt: new Date().toISOString(),
    };
    tx.set(docRef, payload);
    return { id: docRef.id, ...(payload as object) } as ServerEscrowTransaction;
  }
}

export const escrowRepository = new EscrowRepository();
