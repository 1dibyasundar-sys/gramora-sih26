import { FirebaseClientConfig, FirebaseClientInitStatus } from './types';

/**
 * Validates whether client Firebase environment variables are configured with actual values.
 * Placeholders (e.g. 'your-client-api-key-here') are treated as unconfigured.
 */
function isValidConfigValue(val?: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed.startsWith('your-') || trimmed.includes('placeholder')) {
    return false;
  }
  return true;
}

/**
 * Returns the public Firebase client configuration object derived strictly from
 * NEXT_PUBLIC_ environment variables.
 */
export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const config: FirebaseClientConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  if (
    !isValidConfigValue(config.apiKey) ||
    !isValidConfigValue(config.projectId) ||
    !isValidConfigValue(config.appId)
  ) {
    return null;
  }

  return config;
}

/**
 * Helper to determine if Firebase Client is configured in the current runtime.
 */
export function isFirebaseClientConfigured(): boolean {
  return getFirebaseClientConfig() !== null;
}

/**
 * Returns the client initialization status.
 */
export function getFirebaseClientStatus(): FirebaseClientInitStatus {
  if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
    return 'emulator';
  }
  return isFirebaseClientConfigured() ? 'configured' : 'unconfigured';
}
