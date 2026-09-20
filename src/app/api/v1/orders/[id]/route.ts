import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { orderService } from '@/server/services/order.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/orders/[id]
 * Retrieves details for a specific consignment order.
 * Strictly checks that the caller is the buyer, a participating seller, or an admin.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const orderId = params.id;

    const order = await orderService.getOrderById(orderId, user);

    return ApiResponse.success(order, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
