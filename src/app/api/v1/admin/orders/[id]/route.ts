import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { requireRole } from '@/server/auth/rbac';
import { adminService } from '@/server/services/admin.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/admin/orders/{id}
 * Retrieves detailed order information including line items, buyer, seller, and escrow status.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    requireRole(user, 'admin');

    const result = await adminService.getOrderDetails(params.id);

    return ApiResponse.success(result, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
