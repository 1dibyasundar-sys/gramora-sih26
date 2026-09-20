import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { requireRole } from '@/server/auth/rbac';
import { adminService } from '@/server/services/admin.service';
import { VerifyUserSchema } from '@/server/domain/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/v1/admin/users/{id}/verify
 * Explicit administrative command for updating a user's verification status with audit logging.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    requireRole(user, 'admin');

    const targetUid = params.id;
    const body = await req.json();
    const validated = VerifyUserSchema.parse(body);

    const updatedUser = await adminService.verifyUser(user, targetUid, validated, ctx.requestId);

    return ApiResponse.success(updatedUser, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
