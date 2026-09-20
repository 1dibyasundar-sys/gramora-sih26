import { NextRequest } from 'next/server';

export interface RequestContext {
  requestId: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Extracts or generates a deterministic request context from an incoming Next.js API request.
 */
export function getRequestContext(req: NextRequest): RequestContext {
  const incomingId = req.headers.get('x-request-id');
  const requestId = incomingId && /^[a-zA-Z0-9-_]{8,64}$/.test(incomingId)
    ? incomingId
    : crypto.randomUUID();

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;
  const userAgent = req.headers.get('user-agent') || undefined;

  return {
    requestId,
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
  };
}
