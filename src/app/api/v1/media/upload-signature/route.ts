import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { createUploadSignature } from '@/server/lib/cloudinary';
import { productRepository } from '@/server/repositories/product.repository';
import { NotFoundError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UploadSignatureBodySchema = z
  .object({
    targetType: z.enum(['product', 'avatar']),
    productId: z.string().optional(),
    contentType: z.string().optional(),
    fileSizeBytes: z.number().int().positive().optional(),
  })
  .strict();

/**
 * POST /api/v1/media/upload-signature
 * Generates signed Cloudinary upload parameters for browser direct uploads.
 * Server strictly authenticates identity, role, and resource ownership.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validated = UploadSignatureBodySchema.parse(body);

    let productOwnerId: string | undefined;

    // If an existing product ID was specified, verify it exists and record its owner
    if (validated.targetType === 'product' && validated.productId) {
      const product = await productRepository.findById(validated.productId);
      if (!product) {
        throw new NotFoundError('Product', validated.productId);
      }
      productOwnerId = product.sellerId;
    }

    const signaturePayload = createUploadSignature(user, validated, productOwnerId);

    return ApiResponse.success(signaturePayload, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
