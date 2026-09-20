import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { requireRole } from '@/server/auth/rbac';
import { adminService } from '@/server/services/admin.service';
import { ModerateProductSchema } from '@/server/domain/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/v1/admin/products/{id}/moderate
 * Explicit administrative command for moderating a product's listing status with audit logging.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    requireRole(user, 'admin');

    const productId = params.id;
    const body = await req.json();
    const validated = ModerateProductSchema.parse(body);

    const updatedProduct = await adminService.moderateProduct(user, productId, validated, ctx.requestId);

    return ApiResponse.success(updatedProduct, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
