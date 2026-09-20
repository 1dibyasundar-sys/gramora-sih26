import { NextRequest } from 'next/server';
import { getFirebaseAuth, getFirestore } from '../lib/firebase-admin';
import { AuthenticationError, AuthorizationError, NotFoundError, toAppError } from '../lib/errors';
import { UserRole, normalizeRole } from '@/types';
import { logger } from '../lib/logger';

export type UserAccountStatus = 'active' | 'suspended' | 'deactivated' | 'pending_onboarding';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: UserRole;
  name: string;
  phone?: string;
  organization?: string;
  verified: boolean;
  profileExists: boolean;
  status: UserAccountStatus;
  claims: Record<string, unknown>;
}

/**
 * Extracts the raw Bearer token from the Authorization header.
 */
export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies a Firebase ID token and resolves the authoritative server user profile from Firestore.
 * Identity comes from verified Firebase token.
 * Authorization & Role come from authoritative server-side user data.
 */
export async function verifyTokenAndGetUser(token: string): Promise<AuthenticatedUser> {
  const auth = getFirebaseAuth();

  try {
    // 1. Authoritative Firebase ID token verification
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = getFirestore();
    // 2. Load application user profile from Firestore
    const userDocRef = db.collection('users').doc(uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) {
      // User is authenticated in Firebase Auth but has not completed profile setup
      return {
        uid,
        email: decodedToken.email,
        role: 'consumer',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'New User',
        verified: false,
        profileExists: false,
        status: 'pending_onboarding',
        claims: decodedToken,
      };
    }

    const userData = userSnap.data();
    const userStatus: UserAccountStatus = userData?.status || 'active';

    if (userStatus === 'suspended' || userStatus === 'deactivated') {
      logger.warn(`Rejected authenticated request for ${userStatus} user`, { uid, status: userStatus });
      throw new AuthorizationError(`Account is ${userStatus}. Access to the platform is suspended.`);
    }

    return {
      uid,
      email: userData?.email || decodedToken.email,
      role: normalizeRole(userData?.role || 'consumer'),
      name: userData?.name || decodedToken.name || 'User',
      phone: userData?.phone,
      organization: userData?.organization,
      verified: !!userData?.verified,
      profileExists: true,
      status: userStatus,
      claims: decodedToken,
    };
  } catch (err) {
    logger.warn('Token verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw toAppError(err);
  }
}

/**
 * Mandatory authentication guard for API Route Handlers.
 * Throws AuthenticationError if token is missing, invalid, or expired.
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const token = extractBearerToken(req);

  if (!token) {
    throw new AuthenticationError('Missing Authorization header with Bearer token.');
  }

  return verifyTokenAndGetUser(token);
}

/**
 * Optional authentication helper. Returns null if unauthenticated, or the user if valid.
 */
export async function optionalAuth(req: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }
  try {
    return await verifyTokenAndGetUser(token);
  } catch {
    return null;
  }
}
