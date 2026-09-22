import crypto from 'crypto';
import {
  getRazorpayCheckoutConfig,
  isRazorpayCheckoutConfigured,
  RazorpayCheckoutConfig,
} from '../config/env';
import { AppError, ServiceUnavailableError } from './errors';
import { logger } from './logger';

export interface CreateOrderParams {
  amountPaise: number;
  currency: 'INR';
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
  createdAt: number;
}

export class RazorpayClient {
  private configSupplier: () => RazorpayCheckoutConfig;

  constructor(configSupplier: () => RazorpayCheckoutConfig = getRazorpayCheckoutConfig) {
    this.configSupplier = configSupplier;
  }

  /**
   * Verifies an incoming webhook signature using HMAC-SHA256 with the RAW request body.
   * Utilizes timing-safe string comparison to prevent timing attacks.
   */
  static verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    if (!rawBody || !signature || !secret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
      const receivedBuffer = Buffer.from(signature, 'utf-8');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err) {
      logger.warn('Error during webhook signature verification', {
        err: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Verifies standard client checkout payment signature: HMAC-SHA256(order_id + '|' + payment_id, secret)
   */
  static verifyPaymentSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    secret: string;
  }): boolean {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, secret } = params;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !secret) {
      return false;
    }

    try {
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
      const receivedBuffer = Buffer.from(razorpaySignature, 'utf-8');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err) {
      logger.warn('Error during payment signature verification', {
        err: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Server-authoritative creation of an external Razorpay Order.
   * Directly communicates with https://api.razorpay.com/v1/orders using Basic Auth.
   */
  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
    if (!isRazorpayCheckoutConfigured()) {
      throw new ServiceUnavailableError(
        'Razorpay payment gateway is not configured on this server environment.'
      );
    }

    const config = this.configSupplier();
    const authHeader = `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`;

    const bodyPayload = {
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes || {},
      payment_capture: 1, // Automatically capture authorized payments
    };

    logger.info('Creating Razorpay order on provider API', {
      receipt: params.receipt,
      amountPaise: params.amountPaise,
      currency: params.currency,
    });

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let parsedError: Record<string, unknown> = {};
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        // Non-JSON response
      }

      logger.error('Razorpay order creation failed on provider API', {
        statusCode: response.status,
        providerError: parsedError.error || errorText,
      });

      throw new AppError(
        `Payment provider rejected order creation: ${(parsedError.error as { description?: string })?.description || 'Provider service error'}`,
        502,
        'SERVICE_UNAVAILABLE'
      );
    }

    const data = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
      receipt?: string;
      status: string;
      created_at: number;
    };

    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: data.status,
      createdAt: data.created_at,
    };
  }
}

export const razorpayClient = new RazorpayClient();
