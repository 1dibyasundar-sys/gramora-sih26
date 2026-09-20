import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { destroyCloudinaryAsset } from '@/server/lib/cloudinary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DeleteMediaBodySchema = z
  .object({
    publicId: z.string().min(1, 'publicId is required'),
    resourceType: z.enum(['image', 'raw']).default('image'),
  })
  .strict();

/**
 * POST /api/v1/media/delete
 * Securely deletes an asset from Cloudinary.
 * Validates that the publicId belongs to the caller's authorized namespace.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validated = DeleteMediaBodySchema.parse(body);

    const deleted = await destroyCloudinaryAsset(user, validated.publicId, validated.resourceType);

    return ApiResponse.success(
      {
        deleted,
        publicId: validated.publicId,
      },
      200,
      ctx.requestId
    );
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
