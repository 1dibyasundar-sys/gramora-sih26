import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { userService } from '@/server/services/user.service';
import { UpdateProfileSchema } from '@/server/domain/user';
import { toAppError } from '@/server/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/users/me
 * Retrieves the profile of the authenticated user.
 * Identity is derived strictly from the verified Firebase ID token.
 */
export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const authUser = await requireAuth(req);
    const profile = await userService.getMe(authUser);

    return ApiResponse.success(profile, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}

/**
 * PATCH /api/v1/users/me
 * Updates non-security profile fields for the authenticated user.
 * Privileged fields (uid, role, permissions, status) are strictly rejected.
 */
export async function PATCH(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const authUser = await requireAuth(req);
    const body = await req.json();

    // Validate body strictly with Zod. Unknown or prohibited fields trigger 422 ValidationError.
    const validatedInput = UpdateProfileSchema.parse(body);

    const updatedProfile = await userService.updateMe(authUser, validatedInput);

    return ApiResponse.success(updatedProfile, 200, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
