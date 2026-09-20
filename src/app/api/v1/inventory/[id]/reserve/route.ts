import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { inventoryService } from '@/server/services/inventory.service';
import { ReserveStockSchema } from '@/server/domain/inventory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: { id: string };
}

/**
 * POST /api/v1/inventory/{id}/reserve
 * Concurrency-safe atomic reservation. Prevents stock overselling.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validatedInput = ReserveStockSchema.parse(body);

    const updatedLot = await inventoryService.reserveStock(
      params.id,
      validatedInput.quantity,
      user,
      validatedInput.orderReference,
      validatedInput.idempotencyKey
    );

    return ApiResponse.success(updatedLot, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
