import { NextResponse } from 'next/server';
import { AppError, toAppError } from './errors';
import { logger } from './logger';

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: {
    nextCursor?: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export class ApiResponse {
  /**
   * Generates a standardized 200/201 JSON success response.
   */
  static success<T>(
    data: T,
    status: number = 200,
    requestId?: string
  ): NextResponse<ApiSuccessResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (requestId) {
      headers['x-request-id'] = requestId;
    }
    return NextResponse.json({ data }, { status, headers });
  }

  /**
   * Generates a standardized 201 Created JSON response.
   */
  static created<T>(
    data: T,
    requestId?: string
  ): NextResponse<ApiSuccessResponse<T>> {
    return this.success(data, 201, requestId);
  }

  /**
   * Generates a standardized 204 No Content response.
   */
  static noContent(requestId?: string): NextResponse {
    const headers: Record<string, string> = {};
    if (requestId) {
      headers['x-request-id'] = requestId;
    }
    return new NextResponse(null, { status: 204, headers });
  }

  /**
   * Generates a standardized cursor-paginated collection response.
   */
  static paginated<T>(
    data: T[],
    meta: { nextCursor?: string | null; hasMore: boolean; total?: number },
    status: number = 200,
    requestId?: string
  ): NextResponse<ApiPaginatedResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (requestId) {
      headers['x-request-id'] = requestId;
    }
    return NextResponse.json({ data, meta }, { status, headers });
  }

  /**
   * Formats any error into a standardized error envelope with appropriate HTTP status code.
   */
  static error(
    err: unknown,
    requestId: string = crypto.randomUUID()
  ): NextResponse<ApiErrorResponse> {
    const appErr = toAppError(err);

    // Structured server log for non-operational or severe errors
    if (appErr.statusCode >= 500) {
      logger.error(`Internal server error processing request ${requestId}: ${appErr.message}`, {
        requestId,
        code: appErr.code,
        statusCode: appErr.statusCode,
      });
    } else {
      logger.warn(`API error for request ${requestId}: [${appErr.code}] ${appErr.message}`, {
        requestId,
        code: appErr.code,
        statusCode: appErr.statusCode,
      });
    }

    const payload: ApiErrorResponse = {
      error: {
        code: appErr.code,
        message: appErr.message,
        requestId,
        ...(appErr.details ? { details: appErr.details } : {}),
      },
    };

    return NextResponse.json(payload, {
      status: appErr.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
    });
  }
}
