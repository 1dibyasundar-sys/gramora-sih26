import crypto from 'crypto';
import { getCloudinaryConfig, isCloudinaryConfigured, CloudinaryConfig } from '../config/env';
import { BadRequestError, ServiceUnavailableError, AuthorizationError } from './errors';
import { AuthenticatedUser } from '../auth/verify-token';
import { normalizeRole } from '@/types';
import { logger } from './logger';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface CloudinarySignaturePayload {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
  allowedFormats: string[];
  maxFileSize: number;
}

export interface CloudinaryAssetMetadata {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: string;
}

export interface UploadSignatureRequest {
  targetType: 'product' | 'avatar';
  productId?: string;
  contentType?: string;
  fileSizeBytes?: number;
}

/**
 * Computes a Cloudinary SHA-1 signature according to the official specification.
 * 1. Parameters are sorted alphabetically by key name.
 * 2. Formatted as key1=val1&key2=val2.
 * 3. Appends api_secret and creates SHA-1 hex digest.
 */
export function generateCloudinarySignature(
  paramsToSign: Record<string, string | number>,
  apiSecret: string
): string {
  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  const stringToSign = `${serialized}${apiSecret}`;
  return crypto.createHash('sha1').update(stringToSign).digest('hex');
}

/**
 * Resolves the deterministic, unguessable folder namespace for a given upload target.
 */
export function getDeterministicFolder(
  targetType: 'product' | 'avatar',
  user: AuthenticatedUser,
  productOwnerId?: string
): string {
  if (targetType === 'product') {
    const ownerId = user.role === 'admin' && productOwnerId ? productOwnerId : user.uid;
    return `gramora/products/${ownerId}`;
  }
  if (targetType === 'avatar') {
    return `gramora/users/${user.uid}`;
  }
  throw new BadRequestError(`Unsupported upload targetType: ${targetType}`);
}

/**
 * Validates request parameters and user permissions before issuing signed upload parameters.
 */
export function validateUploadAuthorization(
  user: AuthenticatedUser,
  request: UploadSignatureRequest,
  productOwnerId?: string
): void {
  const role = normalizeRole(user.role);

  // Validate targetType
  if (request.targetType !== 'product' && request.targetType !== 'avatar') {
    throw new BadRequestError(`Invalid upload targetType: '${request.targetType}'. Must be 'product' or 'avatar'.`);
  }

  // Role permissions for product images: strictly farmer, fpo, or admin
  if (request.targetType === 'product') {
    if (role !== 'farmer' && role !== 'fpo' && role !== 'admin') {
      throw new AuthorizationError(
        `Role '${user.role}' is not authorized to upload product images. Only farmers, FPOs, and administrators can upload catalog assets.`
      );
    }

    // If existing product ownership is specified, ensure seller owns it (or is admin)
    if (productOwnerId && role !== 'admin' && productOwnerId !== user.uid) {
      throw new AuthorizationError(
        'Access denied. You cannot upload images for a product listing owned by another seller.'
      );
    }
  }

  // Content type / MIME validation if supplied
  if (request.contentType) {
    const normalizedType = request.contentType.toLowerCase().trim();
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(normalizedType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
      throw new BadRequestError(
        `Unsupported image type: '${request.contentType}'. Allowed types: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`
      );
    }
  }

  // File size validation if supplied
  if (request.fileSizeBytes !== undefined) {
    if (request.fileSizeBytes <= 0) {
      throw new BadRequestError('File size must be greater than zero bytes.');
    }
    if (request.fileSizeBytes > MAX_IMAGE_FILE_SIZE_BYTES) {
      throw new BadRequestError(
        `File size exceeds maximum allowed limit of ${MAX_IMAGE_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
      );
    }
  }
}

/**
 * Generates signed Cloudinary upload credentials for client direct uploads.
 */
export function createUploadSignature(
  user: AuthenticatedUser,
  request: UploadSignatureRequest,
  productOwnerId?: string
): CloudinarySignaturePayload {
  if (!isCloudinaryConfigured()) {
    throw new ServiceUnavailableError(
      'Cloudinary image management service is not configured. Upload signatures cannot be generated.'
    );
  }

  validateUploadAuthorization(user, request, productOwnerId);

  const config = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = getDeterministicFolder(request.targetType, user, productOwnerId);

  // Parameters to sign (strictly matching what browser will submit)
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const signature = generateCloudinarySignature(paramsToSign, config.apiSecret);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

  logger.info('Generated Cloudinary signed upload signature', {
    uid: user.uid,
    targetType: request.targetType,
    folder,
  });

  return {
    signature,
    timestamp,
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    folder,
    uploadUrl,
    allowedFormats: [...ALLOWED_IMAGE_FORMATS],
    maxFileSize: MAX_IMAGE_FILE_SIZE_BYTES,
  };
}

/**
 * Validates that an asset publicId belongs to the caller's authorized namespace.
 */
export function assertAssetOwnership(
  user: AuthenticatedUser,
  publicId: string
): void {
  const role = normalizeRole(user.role);
  if (role === 'admin') {
    return; // Admin can manage all assets
  }

  const expectedProductPrefix = `gramora/products/${user.uid}/`;
  const expectedUserPrefix = `gramora/users/${user.uid}/`;

  if (!publicId.startsWith(expectedProductPrefix) && !publicId.startsWith(expectedUserPrefix)) {
    throw new AuthorizationError(
      'Access denied. You do not own this Cloudinary asset and cannot delete or modify it.'
    );
  }
}

/**
 * Destroys an asset in Cloudinary securely after verifying ownership.
 */
export async function destroyCloudinaryAsset(
  user: AuthenticatedUser,
  publicId: string,
  resourceType: 'image' | 'raw' = 'image'
): Promise<boolean> {
  if (!isCloudinaryConfigured()) {
    logger.warn('Skipping Cloudinary asset destroy: credentials not configured', { publicId });
    return false;
  }

  assertAssetOwnership(user, publicId);

  const config = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    public_id: publicId,
    timestamp,
  };

  const signature = generateCloudinarySignature(paramsToSign, config.apiSecret);

  try {
    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await res.json().catch(() => ({}));
    logger.info('Cloudinary destroy response', { publicId, result: result.result });
    return result.result === 'ok';
  } catch (err) {
    logger.error('Failed to destroy Cloudinary asset', {
      publicId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
