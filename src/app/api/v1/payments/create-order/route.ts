import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { paymentService } from '@/server/services/payment.service';
import { CreatePaymentOrderSchema } from '@/server/domain/payment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/v1/payments/create-order
 * Initiates an authoritative external Razorpay order for an existing Gramora consignment.
 * Strict RBAC: only the purchasing 'buyer' or 'consumer' who placed the order can initiate payment.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validated = CreatePaymentOrderSchema.parse(body);

    const paymentConfig = await paymentService.createPaymentOrder(
      validated.orderId,
      user,
      ctx.requestId
    );

    return ApiResponse.success({ payment: paymentConfig }, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
