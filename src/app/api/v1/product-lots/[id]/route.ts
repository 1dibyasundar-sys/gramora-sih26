import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { productLotService } from '@/server/services/product-lot.service';
import { UpdateProductLotSchema } from '@/server/domain/product';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/v1/product-lots/{id}
 * Retrieves lot details.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const ctx = getRequestContext(req);

  try {
    const lot = await productLotService.getLotById(params.id);
    return ApiResponse.success(lot, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}

/**
 * PATCH /api/v1/product-lots/{id}
 * Updates lot details. Restricted to the lot owner or an admin.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validatedUpdates = UpdateProductLotSchema.parse(body);

    const updated = await productLotService.updateLot(params.id, user, validatedUpdates);

    return ApiResponse.success(updated, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
