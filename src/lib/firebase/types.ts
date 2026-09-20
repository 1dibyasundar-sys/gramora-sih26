/**
 * Public Client-Side Firebase Configuration Interface.
 * STRICTLY for browser environment variables (NEXT_PUBLIC_ prefix).
 * NEVER contains server secrets, private keys, or service-account details.
 */
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export type FirebaseClientInitStatus = 'unconfigured' | 'configured' | 'emulator';
