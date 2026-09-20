import { createHash } from 'crypto';
import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { Transaction } from 'firebase-admin/firestore';
import { ConflictError } from '../lib/errors';

export interface IdempotencyRecord {
  id: string;
  key: string;
  userId: string;
  requestHash: string;
  operation: string;
  status: 'completed' | 'in_progress';
  resourceId?: string;
  responseSnapshot?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export class IdempotencyRepository extends BaseFirestoreRepository<IdempotencyRecord> {
  constructor() {
    super(COLLECTIONS.IDEMPOTENCY_KEYS);
  }

  /**
   * Generates a deterministic SHA-256 fingerprint for a request payload.
   */
  static hashPayload(payload: unknown): string {
    const serialized = JSON.stringify(payload || {});
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Reads an idempotency record within a transaction.
   */
  async getInTransaction(tx: Transaction, key: string): Promise<IdempotencyRecord | null> {
    const docRef = this.collection.doc(key);
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      return null;
    }
    return { id: snap.id, ...(snap.data() as object) } as IdempotencyRecord;
  }

  /**
   * Sets or updates an idempotency record within a transaction.
   */
  setInTransaction(tx: Transaction, record: IdempotencyRecord): void {
    const docRef = this.collection.doc(record.key);
    tx.set(docRef, record);
  }
}

export const idempotencyRepository = new IdempotencyRepository();
