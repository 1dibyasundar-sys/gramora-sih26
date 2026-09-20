import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { orderService } from '@/server/services/order.service';
import { OrderQuerySchema, CheckoutRequestSchema } from '@/server/domain/order';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/orders
 * Retrieves orders scoped strictly by the authenticated user's role:
 * - Buyer / Consumer: orders placed by caller.
 * - Farmer / FPO: orders containing caller's produce.
 * - Admin: all orders.
 */
export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);

    const searchParams = req.nextUrl.searchParams;
    const queryObj: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      if (value !== undefined && value !== '') {
        queryObj[key] = value;
      }
    });

    const parsedQuery = OrderQuerySchema.parse(queryObj);
    const result = await orderService.getOrders(user, parsedQuery);

    return ApiResponse.paginated(
      result.orders,
      {
        hasMore: false,
        total: result.total,
      },
      200,
      ctx.requestId
    );
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}

/**
 * POST /api/v1/orders
 * Direct checkout consignment creation endpoint.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const idempotencyKey = req.headers.get('idempotency-key') || undefined;

    const body = await req.json();
    const validatedInput = CheckoutRequestSchema.parse(body);

    const order = await orderService.checkout(user, validatedInput, idempotencyKey, ctx.requestId);

    return ApiResponse.created(order, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
