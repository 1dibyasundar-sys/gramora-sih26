import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth, optionalAuth } from '@/server/auth/verify-token';
import { requireRole, requireExactRole } from '@/server/auth/rbac';
import { productService } from '@/server/services/product.service';
import { CreateProductSchema, ProductQuerySchema } from '@/server/domain/product';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/products
 * Public / optional-auth catalog search and list endpoint.
 */
export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const searchParams = req.nextUrl.searchParams;
    const queryObj: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      if (value !== undefined && value !== '') {
        queryObj[key] = value;
      }
    });

    const parsedQuery = ProductQuerySchema.parse(queryObj);
    const result = await productService.getProducts(parsedQuery);

    return ApiResponse.paginated(
      result.products,
      {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        total: result.products.length,
      },
      200,
      ctx.requestId
    );
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}

/**
 * POST /api/v1/products
 * Creates a new agricultural catalog product listing.
 * Strictly restricted to authenticated 'farmer' and 'fpo' roles (no admin bypass).
 * sellerId is authoritatively derived from the verified token UID.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    requireExactRole(user, 'farmer', 'fpo');

    const body = await req.json();
    const validatedInput = CreateProductSchema.parse(body);

    const createdProduct = await productService.createProduct(user, validatedInput);

    return ApiResponse.created(createdProduct, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
