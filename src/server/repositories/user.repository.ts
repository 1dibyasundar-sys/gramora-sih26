import { BaseFirestoreRepository } from './base.repository';
import { COLLECTIONS } from './collections';
import { ServerUserProfile, UserAccountStatus } from '../domain/user';
import { NotFoundError } from '../lib/errors';

export class UserRepository extends BaseFirestoreRepository<ServerUserProfile> {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  /**
   * Look up a user profile by Firebase UID.
   */
  async findByUid(uid: string): Promise<ServerUserProfile | null> {
    return this.findById(uid);
  }

  /**
   * Look up a user profile by email.
   */
  async findByEmail(email: string): Promise<ServerUserProfile | null> {
    const snapshot = await this.collection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() as object) } as ServerUserProfile;
  }

  /**
   * Creates an authoritative application profile bound to the verified Firebase Auth UID.
   */
  async createProfile(
    uid: string,
    profileData: Omit<ServerUserProfile, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ): Promise<ServerUserProfile> {
    const now = new Date().toISOString();
    const docRef = this.collection.doc(uid);

    const fullRecord: ServerUserProfile = {
      ...profileData,
      id: uid,
      uid,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(fullRecord);
    return fullRecord;
  }

  /**
   * Updates non-security profile fields for a user.
   */
  async updateProfile(
    uid: string,
    updates: Partial<Omit<ServerUserProfile, 'id' | 'uid' | 'createdAt' | 'updatedAt'>>
  ): Promise<ServerUserProfile> {
    return this.update(uid, updates);
  }

  /**
   * Updates the account lifecycle status (active/suspended/deactivated).
   */
  async setStatus(uid: string, status: UserAccountStatus): Promise<ServerUserProfile> {
    return this.update(uid, { status });
  }
}

export const userRepository = new UserRepository();
