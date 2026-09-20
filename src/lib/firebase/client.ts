import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirebaseClientConfig, isFirebaseClientConfigured } from './config';

let clientApp: FirebaseApp | null = null;
let clientAuth: Auth | null = null;

/**
 * Initializes and returns the Firebase client SDK singleton.
 * Returns null if client environment variables are not configured, preventing runtime crashes.
 */
export function getFirebaseClientApp(): FirebaseApp | null {
  if (clientApp) {
    return clientApp;
  }

  // Reuse existing app during Next.js client-side re-renders
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    clientApp = existingApps[0];
    return clientApp;
  }

  const config = getFirebaseClientConfig();
  if (!config) {
    return null;
  }

  try {
    clientApp = initializeApp(config);
    return clientApp;
  } catch (error) {
    console.warn('[FirebaseClient] Initialization deferred or failed:', error);
    return null;
  }
}

/**
 * Returns the Firebase client Auth instance.
 * Returns null if Firebase client is not configured.
 */
export function getFirebaseClientAuth(): Auth | null {
  if (clientAuth) {
    return clientAuth;
  }

  const app = getFirebaseClientApp();
  if (!app) {
    return null;
  }

  try {
    clientAuth = getAuth(app);

    // Optional client-side auth emulator connection
    const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    if (authEmulatorHost && typeof window !== 'undefined') {
      const emulatorUrl = authEmulatorHost.startsWith('http')
        ? authEmulatorHost
        : `http://${authEmulatorHost}`;
      connectAuthEmulator(clientAuth, emulatorUrl, { disableWarnings: true });
    }

    return clientAuth;
  } catch (error) {
    console.warn('[FirebaseClient] Auth initialization error:', error);
    return null;
  }
}
