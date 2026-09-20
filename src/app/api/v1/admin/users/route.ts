import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { requireRole } from '@/server/auth/rbac';
import { adminService } from '@/server/services/admin.service';
import { AdminUsersQuerySchema } from '@/server/domain/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/admin/users
 * Returns a filtered, paginated list of platform users.
 * Strictly restricted to server-verified 'admin' role.
 */
export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const user = await requireAuth(req);
    requireRole(user, 'admin');

    const searchParams = req.nextUrl.searchParams;
    const queryObj: Record<string, unknown> = {};
    searchParams.forEach((val, key) => {
      if (val !== undefined && val !== '') {
        queryObj[key] = val;
      }
    });

    const parsedQuery = AdminUsersQuerySchema.parse(queryObj);
    const result = await adminService.getUsers(parsedQuery);

    return ApiResponse.paginated(
      result.users,
      {
        hasMore: false,
        total: result.total,
      },
      200,
      ctx.requestId
    );
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
