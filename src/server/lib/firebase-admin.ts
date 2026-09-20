import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, Auth } from 'firebase-admin/auth';
import { getServerConfig, isFirebaseAdminConfigured } from '../config/env';
import { logger } from './logger';
import { AppError } from './errors';

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;
let authClient: Auth | null = null;

/**
 * Initializes and returns the Firebase Admin SDK singleton.
 * Prevents multiple initializations during Next.js fast refresh.
 */
export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if an app has already been initialized across hot-reloads
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const config = getServerConfig();

  // Support local Firebase Emulators if configured
  if (config.FIRESTORE_EMULATOR_HOST && !process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = config.FIRESTORE_EMULATOR_HOST;
  }
  if (config.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = config.FIREBASE_AUTH_EMULATOR_HOST;
  }

  if (!isFirebaseAdminConfigured()) {
    // In development or build phase without credentials, initialize with safe project identifier
    logger.warn('Firebase Admin credentials not fully configured. Server operating in degraded/unconfigured state.');
    adminApp = initializeApp({
      projectId: config.FIREBASE_PROJECT_ID || 'smart-agri-marketplace-dev',
    });
    return adminApp;
  }

  try {
    if (config.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
      adminApp = initializeApp({
        credential: cert(config.FIREBASE_SERVICE_ACCOUNT_KEY_PATH),
        projectId: config.FIREBASE_PROJECT_ID,
      });
    } else if (config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY) {
      // Clean up accidental quotes, literal \n, and carriage returns
      const formattedPrivateKey = config.FIREBASE_PRIVATE_KEY
        .replace(/^["']|["']$/g, '')
        .replace(/\\n/g, '\n')
        .replace(/\r/g, '');

      adminApp = initializeApp({
        credential: cert({
          projectId: config.FIREBASE_PROJECT_ID,
          clientEmail: config.FIREBASE_CLIENT_EMAIL,
          privateKey: formattedPrivateKey,
        }),
        projectId: config.FIREBASE_PROJECT_ID,
      });
    } else {
      adminApp = initializeApp({
        projectId: config.FIREBASE_PROJECT_ID || 'smart-agri-marketplace-dev',
      });
    }

    logger.info('Firebase Admin SDK initialized successfully', {
      projectId: config.FIREBASE_PROJECT_ID,
    });
    return adminApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError('Firebase Admin initialization failure', 500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Returns the authoritative server-side Firestore instance.
 */
export function getFirestore(): Firestore {
  if (firestoreDb) {
    return firestoreDb;
  }

  // Safety guard against test pollution
  const isTestContext = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('__tests__') || arg.includes('.test.ts'));
  if (isTestContext && process.env.LIVE_FIREBASE_TESTS !== 'true') {
    throw new Error('SAFETY GUARD: Access to live Firestore is blocked during tests to prevent production data pollution. Set LIVE_FIREBASE_TESTS=true to explicitly allow.');
  }

  const app = getFirebaseAdminApp();
  firestoreDb = getAdminFirestore(app);
  // Configure ignoreUndefinedProperties for clean Firestore document updates
  try {
    firestoreDb.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Settings may already be locked if initialized
  }
  return firestoreDb;
}

/**
 * Returns the server-side Firebase Auth instance for token verification.
 */
export function getFirebaseAuth(): Auth {
  if (authClient) {
    return authClient;
  }
  const app = getFirebaseAdminApp();
  authClient = getAdminAuth(app);
  return authClient;
}
