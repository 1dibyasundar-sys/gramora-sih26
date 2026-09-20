import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth, optionalAuth } from '@/server/auth/verify-token';
import { productService } from '@/server/services/product.service';
import { UpdateProductSchema } from '@/server/domain/product';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/v1/products/{id}
 * Retrieves full details for a product listing and its active harvest lots.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const ctx = getRequestContext(req);

  try {
    const user = await optionalAuth(req);
    const detail = await productService.getProductById(params.id, user);

    return ApiResponse.success(detail, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}

/**
 * PATCH /api/v1/products/{id}
 * Updates permitted catalog fields. Restricted to the listing owner or an admin.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validatedUpdates = UpdateProductSchema.parse(body);

    const updated = await productService.updateProduct(params.id, user, validatedUpdates);

    return ApiResponse.success(updated, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}

/**
 * DELETE /api/v1/products/{id}
 * Soft-archives a product. Restricted to the listing owner or an admin.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    await productService.archiveProduct(params.id, user);

    return ApiResponse.noContent(ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
