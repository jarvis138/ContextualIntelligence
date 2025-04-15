/**
 * API Error Utilities
 * 
 * This module provides standardized error classes and utilities
 * for handling errors in API routes.
 */

/**
 * Custom API error class with status code and error code
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  
  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;
    
    // This is for capturing the proper stack trace in Node.js
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends ApiError {
  constructor(message: string, code: string = 'BAD_REQUEST', details?: any) {
    super(message, 400, code, details);
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHORIZED', details?: any) {
    super(message, 401, code, details);
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access denied', code: string = 'FORBIDDEN', details?: any) {
    super(message, 403, code, details);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND', details?: any) {
    super(message, 404, code, details);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
  constructor(message: string, code: string = 'CONFLICT', details?: any) {
    super(message, 409, code, details);
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', code: string = 'VALIDATION_ERROR', details?: any) {
    super(message, 422, code, details);
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMIT_EXCEEDED', details?: any) {
    super(message, 429, code, details);
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR', details?: any) {
    super(message, 500, code, details);
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable', code: string = 'SERVICE_UNAVAILABLE', details?: any) {
    super(message, 503, code, details);
  }
}

/**
 * Helper function to check if an error is an instance of ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Error codes for specific scenarios
 */
export const ErrorCodes = {
  VALIDATION: {
    INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
    MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
    INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT'
  },
  AUTH: {
    INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
    INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS'
  },
  RESOURCE: {
    NOT_FOUND: 'RESOURCE_NOT_FOUND',
    ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    DELETED: 'RESOURCE_DELETED',
    OWNED_BY_OTHER: 'RESOURCE_OWNED_BY_OTHER'
  },
  SERVER: {
    INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
    DEPENDENCY_FAILURE: 'SERVER_DEPENDENCY_FAILURE',
    DATABASE_ERROR: 'SERVER_DATABASE_ERROR'
  }
};