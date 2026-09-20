import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { orderService } from '@/server/services/order.service';
import { CheckoutRequestSchema } from '@/server/domain/order';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/v1/orders/checkout
 * Idempotent, transaction-safe order checkout endpoint.
 * Strict RBAC: only 'buyer', 'consumer', or 'admin' can place orders.
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
