import { ZodError } from 'zod';

/**
 * Machine-readable application error codes.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR'
  | 'INSUFFICIENT_INVENTORY'
  | 'INVALID_STATUS_TRANSITION'
  | 'PRODUCT_NOT_AVAILABLE'
  | 'MOQ_NOT_MET'
  | 'ORDER_NOT_CANCELLABLE'
  | 'INDEX_REQUIRED'
  | 'SERVICE_UNAVAILABLE';


/**
 * Base typed application error.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown> | unknown[];

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown> | unknown[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required. Missing or invalid authorization token.') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action or access this resource.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string) {
    super(
      id ? `${resource} with ID '${id}' was not found.` : `${resource} not found.`,
      404,
      'NOT_FOUND'
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict or concurrent modification detected.', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Input validation failed.', details?: unknown[]) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please retry later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected server error occurred.') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'The requested service is temporarily unavailable or unconfigured.') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/**
 * Safely converts any unknown caught error into an AppError,
 * suppressing stack traces and sensitive internal driver details.
 */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) {
    return err;
  }

  // Handle Zod validation errors seamlessly
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return new ValidationError('Request payload validation failed.', formattedIssues);
  }

  if (err instanceof Error) {
    const errorWithCode = err as { code?: string | number };
    const errCode = errorWithCode.code;

    // Check for common Firebase Auth error codes
    if (errCode === 'auth/id-token-expired') {
      return new AuthenticationError('Firebase authentication token has expired. Please refresh your session.');
    }
    if (errCode === 'auth/id-token-revoked') {
      return new AuthenticationError('Firebase authentication token has been revoked. Please sign in again.');
    }
    if (errCode === 'auth/argument-error' || errCode === 'auth/invalid-id-token') {
      return new AuthenticationError('Invalid authentication token provided.');
    }
    if (errCode === 'auth/user-not-found') {
      return new NotFoundError('Authenticated user record');
    }

    // Check for Firestore gRPC error codes
    if (errCode === 5 || errCode === 'NOT_FOUND') {
      return new NotFoundError('Requested database entity');
    }
    if (errCode === 6 || errCode === 'ALREADY_EXISTS') {
      return new ConflictError('A resource with this identifier already exists.');
    }
    if (errCode === 7 || errCode === 'PERMISSION_DENIED') {
      return new AuthorizationError('Database access permission denied.');
    }

    // Never leak stack traces, database credentials or internal driver details
    return new InternalServerError(
      process.env.NODE_ENV === 'development' ? err.message : 'An internal server error occurred.'
    );
  }

  return new InternalServerError();
}
