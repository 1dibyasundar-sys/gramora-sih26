import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { paymentService } from '@/server/services/payment.service';
import { VerifyPaymentSchema } from '@/server/domain/payment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/v1/payments/verify
 * Verifies Razorpay Checkout HMAC signature and triggers atomic state transition to escrow_funded.
 * Strict RBAC: only the authenticated buyer or admin can verify payment for an order.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validated = VerifyPaymentSchema.parse(body);

    const result = await paymentService.verifyClientPayment(
      validated,
      user,
      ctx.requestId
    );

    return ApiResponse.success(result, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
