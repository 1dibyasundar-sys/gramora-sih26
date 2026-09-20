import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { paymentService } from '@/server/services/payment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/v1/webhooks/razorpay
 * Authoritative external webhook receiver from Razorpay.
 * Strictly verifies the raw body HMAC-SHA256 signature using RAZORPAY_WEBHOOK_SECRET.
 * Does NOT require Firebase Auth since Razorpay delivers this directly.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const result = await paymentService.processWebhook(rawBody, signature, ctx.requestId);

    return NextResponse.json(
      {
        received: true,
        status: result.status,
        ...(result.reason ? { reason: result.reason } : {}),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': ctx.requestId,
        },
      }
    );
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
