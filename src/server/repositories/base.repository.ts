import { Firestore, CollectionReference } from 'firebase-admin/firestore';
import { getFirestore } from '../lib/firebase-admin';
import { CollectionName } from './collections';
import { NotFoundError } from '../lib/errors';

export interface Identifiable {
  id: string;
}

export abstract class BaseFirestoreRepository<T extends Identifiable> {
  protected readonly collectionName: CollectionName;

  constructor(collectionName: CollectionName) {
    this.collectionName = collectionName;
  }

  public get db(): Firestore {
    return getFirestore();
  }

  public get collection(): CollectionReference {
    return this.db.collection(this.collectionName);
  }

  /**
   * Retrieves an entity by its document ID. Returns null if not found.
   */
  async findById(id: string): Promise<T | null> {
    const docSnap = await this.collection.doc(id).get();
    if (!docSnap.exists) {
      return null;
    }
    return { id: docSnap.id, ...(docSnap.data() as object) } as T;
  }

  /**
   * Retrieves an entity by ID or throws a NotFoundError.
   */
  async getById(id: string): Promise<T> {
    const item = await this.findById(id);
    if (!item) {
      throw new NotFoundError(this.collectionName, id);
    }
    return item;
  }

  /**
   * Creates a new document with an explicit or auto-generated ID.
   */
  async create(data: Omit<T, 'id'>, customId?: string): Promise<T> {
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const now = new Date().toISOString();
    const payload = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload);
    return { id: docRef.id, ...(payload as object) } as T;
  }

  /**
   * Updates an existing document with partial fields.
   */
  async update(id: string, updates: Partial<Omit<T, 'id'>>): Promise<T> {
    const docRef = this.collection.doc(id);
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await docRef.update(payload);
    } catch (err) {
      const errCode = (err as { code?: number | string }).code;
      if (errCode === 5 || errCode === 'NOT_FOUND') {
        throw new NotFoundError(this.collectionName, id);
      }
      throw err;
    }

    const updatedSnap = await docRef.get();
    return { id: updatedSnap.id, ...(updatedSnap.data() as object) } as T;
  }

  /**
   * Deletes a document by ID.
   */
  async delete(id: string): Promise<boolean> {
    const docRef = this.collection.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return false;
    }
    await docRef.delete();
    return true;
  }

  /**
   * Counts documents matching a given query or the entire collection.
   */
  async count(): Promise<number> {
    const snapshot = await this.collection.count().get();
    return snapshot.data().count;
  }
}
