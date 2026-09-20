import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth, optionalAuth } from '@/server/auth/verify-token';
import { requireRole, requireExactRole } from '@/server/auth/rbac';
import { productLotService } from '@/server/services/product-lot.service';
import { CreateProductLotSchema } from '@/server/domain/product';
import { BadRequestError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/product-lots
 * Lists lots filtered by productId or seller.
 */
export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const sellerId = searchParams.get('sellerId');

    if (productId) {
      const lots = await productLotService.getLotsByProduct(productId);
      return ApiResponse.success(lots, 200, ctx.requestId);
    }

    if (sellerId === 'me') {
      const user = await requireAuth(req);
      const lots = await productLotService.getLotsBySeller(user);
      return ApiResponse.success(lots, 200, ctx.requestId);
    }

    const user = await optionalAuth(req);
    if (user) {
      const lots = await productLotService.getLotsBySeller(user);
      return ApiResponse.success(lots, 200, ctx.requestId);
    }

    throw new BadRequestError('Must specify ?productId= or authenticate with seller credentials.');
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}

/**
 * POST /api/v1/product-lots
 * Creates a new harvest lot and corresponding physical inventory lot.
 * Restricted strictly to 'farmer' and 'fpo' product owners.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    requireExactRole(user, 'farmer', 'fpo');
    const body = await req.json();
    const validatedInput = CreateProductLotSchema.parse(body);

    const result = await productLotService.createLot(user, validatedInput);

    return ApiResponse.created(result, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
