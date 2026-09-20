import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { requireRole } from '@/server/auth/rbac';
import { adminService } from '@/server/services/admin.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/admin/users/{id}
 * Retrieves full user details for administrative inspection.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    requireRole(user, 'admin');

    const targetUser = await adminService.getUserById(params.id);

    return ApiResponse.success(targetUser, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
