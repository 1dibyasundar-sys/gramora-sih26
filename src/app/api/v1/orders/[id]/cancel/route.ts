import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { orderService } from '@/server/services/order.service';
import { CancelOrderSchema } from '@/server/domain/order';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/v1/orders/[id]/cancel
 * Command-based order cancellation endpoint.
 * Releases all active stock reservations atomically and initiates escrow refund.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const orderId = params.id;

    let reason: string | undefined;
    try {
      const body = await req.json();
      const validated = CancelOrderSchema.parse(body);
      reason = validated.reason;
    } catch {
      // Body is optional for simple cancellation
    }

    const cancelledOrder = await orderService.cancelOrder(orderId, user, reason, ctx.requestId);

    return ApiResponse.success(cancelledOrder, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
