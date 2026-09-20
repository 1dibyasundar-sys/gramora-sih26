import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { requireAuth } from '@/server/auth/verify-token';
import { userService } from '@/server/services/user.service';
import { OnboardingSchema } from '@/server/domain/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/v1/users/onboard
 * Initial profile creation flow for a newly registered Firebase Auth user.
 * Self-assignable roles: ['farmer', 'fpo', 'buyer', 'consumer', 'logistics'].
 * ADMIN role cannot be self-assigned.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const authUser = await requireAuth(req);
    const body = await req.json();

    // Validate body strictly with Zod
    const validatedInput = OnboardingSchema.parse(body);

    const createdProfile = await userService.onboard(authUser, validatedInput);

    return ApiResponse.created(createdProfile, ctx.requestId);
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
