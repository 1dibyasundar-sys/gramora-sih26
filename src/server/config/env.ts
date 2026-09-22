import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  // Firebase Admin Credentials
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY_PATH: z.string().optional(),

  // Emulators
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Razorpay Test Mode
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_MODE: z.enum(['test', 'live']).optional().default('test'),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

/**
 * Validates and returns the server environment configuration.
 * Uses a cached singleton after initial validation.
 */
export function getServerConfig(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error(`❌ [ConfigError] Invalid server environment variables:\n${errorDetails}`);
    throw new Error(`Invalid server environment variables:\n${errorDetails}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Resets the cached server environment configuration (primarily for testing).
 */
export function resetServerConfigCache(): void {
  cachedEnv = null;
}

function isRealValue(val?: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed !== '' && !trimmed.startsWith('your-') && !trimmed.includes('placeholder');
}

/**
 * Checks whether Firebase Admin has real credentials configured (either via env vars or emulator).
 */
export function isFirebaseAdminConfigured(): boolean {
  const config = getServerConfig();
  if (config.FIRESTORE_EMULATOR_HOST || config.FIREBASE_AUTH_EMULATOR_HOST) {
    return true;
  }
  return !!(
    (isRealValue(config.FIREBASE_PROJECT_ID) &&
      isRealValue(config.FIREBASE_CLIENT_EMAIL) &&
      isRealValue(config.FIREBASE_PRIVATE_KEY)) ||
    isRealValue(config.FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
  );
}

export type FirebaseAdminStatus = 'configured' | 'not_configured' | 'emulator';

/**
 * Exposes a safe configuration status without revealing secrets.
 */
export function getFirebaseAdminStatus(): FirebaseAdminStatus {
  const config = getServerConfig();
  if (config.FIRESTORE_EMULATOR_HOST || config.FIREBASE_AUTH_EMULATOR_HOST) {
    return 'emulator';
  }
  return isFirebaseAdminConfigured() ? 'configured' : 'not_configured';
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Checks whether Cloudinary credentials are fully configured on the server.
 */
export function isCloudinaryConfigured(): boolean {
  const config = getServerConfig();
  return !!(
    isRealValue(config.CLOUDINARY_CLOUD_NAME) &&
    isRealValue(config.CLOUDINARY_API_KEY) &&
    isRealValue(config.CLOUDINARY_API_SECRET)
  );
}

/**
 * Returns validated Cloudinary credentials. Throws if unconfigured.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  const config = getServerConfig();
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured on the server. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET.'
    );
  }
  return {
    cloudName: config.CLOUDINARY_CLOUD_NAME!.trim(),
    apiKey: config.CLOUDINARY_API_KEY!.trim(),
    apiSecret: config.CLOUDINARY_API_SECRET!.trim(),
  };
}

export interface RazorpayCheckoutConfig {
  keyId: string;
  keySecret: string;
  mode: 'test' | 'live';
}

export interface RazorpayConfig extends RazorpayCheckoutConfig {
  webhookSecret: string;
}

/**
 * Checks whether Razorpay checkout credentials (Key ID and Key Secret) are configured.
 */
export function isRazorpayCheckoutConfigured(): boolean {
  const config = getServerConfig();
  return !!(
    isRealValue(config.RAZORPAY_KEY_ID) &&
    isRealValue(config.RAZORPAY_KEY_SECRET)
  );
}

/**
 * Checks whether Razorpay webhook secret is configured.
 */
export function isRazorpayWebhookConfigured(): boolean {
  const config = getServerConfig();
  return isRealValue(config.RAZORPAY_WEBHOOK_SECRET);
}

/**
 * Checks whether Razorpay credentials are fully configured on the server.
 */
export function isRazorpayConfigured(): boolean {
  return isRazorpayCheckoutConfigured() && isRazorpayWebhookConfigured();
}

/**
 * Returns validated Razorpay credentials. Throws if unconfigured.
 * Never exposes secret values in error messages.
 */
export function getRazorpayConfig(): RazorpayConfig {
  const config = getServerConfig();
  if (!isRazorpayConfigured()) {
    throw new Error(
      'Razorpay configuration is incomplete. Missing RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, or RAZORPAY_WEBHOOK_SECRET.'
    );
  }
  return {
    keyId: config.RAZORPAY_KEY_ID!.trim(),
    keySecret: config.RAZORPAY_KEY_SECRET!.trim(),
    webhookSecret: config.RAZORPAY_WEBHOOK_SECRET!.trim(),
    mode: config.RAZORPAY_MODE || 'test',
  };
}

/**
 * Returns validated Razorpay checkout credentials (Key ID and Key Secret). Throws if unconfigured.
 * Never exposes secret values in error messages.
 */
export function getRazorpayCheckoutConfig(): RazorpayCheckoutConfig {
  const config = getServerConfig();
  if (!isRazorpayCheckoutConfigured()) {
    throw new Error(
      'Razorpay checkout configuration is incomplete. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.'
    );
  }
  return {
    keyId: config.RAZORPAY_KEY_ID!.trim(),
    keySecret: config.RAZORPAY_KEY_SECRET!.trim(),
    mode: config.RAZORPAY_MODE || 'test',
  };
}

