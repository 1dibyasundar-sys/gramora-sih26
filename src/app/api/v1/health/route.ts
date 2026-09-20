import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/lib/api-response';
import { getRequestContext } from '@/server/lib/request-context';
import { getServerConfig, getFirebaseAdminStatus, isFirebaseAdminConfigured } from '@/server/config/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);

  try {
    const config = getServerConfig();
    const fbStatus = getFirebaseAdminStatus();
    const isFbOperational = fbStatus === 'configured' || fbStatus === 'emulator';
    const systemStatus = isFbOperational ? 'healthy' : 'degraded';

    return ApiResponse.success(
      {
        status: systemStatus,
        timestamp: ctx.timestamp,
        version: '1.0.0',
        service: 'smart-agri-backend',
        environment: config.NODE_ENV,
        dependencies: {
          firebase: fbStatus,
        },
      },
      200,
      ctx.requestId
    );
  } catch (error) {
    return ApiResponse.error(error, ctx.requestId);
  }
}
