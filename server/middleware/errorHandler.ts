/**
 * Error Handler Middleware
 * 
 * This middleware handles errors thrown in Express routes and
 * formats them according to the API response standard.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError, isApiError } from '../utils/apiError';
import { createErrorResponse } from '../utils/apiResponse';
import { ValidationError } from '../utils/apiError';

/**
 * Global error handler middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? { 
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    } : err
  });
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.reduce((acc: Record<string, string>, curr) => {
      const path = curr.path.join('.');
      acc[path] = curr.message;
      return acc;
    }, {});
    
    return res.status(422).json(
      createErrorResponse('VALIDATION_ERROR', 'Request validation failed', details)
    );
  }

  // Handle known API errors
  if (isApiError(err)) {
    return res.status(err.statusCode).json(
      createErrorResponse(err.code, err.message, err.details)
    );
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      createErrorResponse('AUTH_INVALID_TOKEN', 'Invalid or malformed authorization token')
    );
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      createErrorResponse('AUTH_TOKEN_EXPIRED', 'Authorization token has expired')
    );
  }
  
  // Handle database constraint errors
  if (err.code === '23505') { // Postgres unique violation
    return res.status(409).json(
      createErrorResponse('RESOURCE_ALREADY_EXISTS', 'Resource already exists')
    );
  }
  
  // Handle other database errors
  if (err.code && err.code.startsWith('23')) { // Other Postgres constraint errors
    return res.status(400).json(
      createErrorResponse('DATABASE_CONSTRAINT_ERROR', 'Database constraint violation', 
        process.env.NODE_ENV === 'development' ? err.detail : undefined)
    );
  }
  
  // Default to 500 internal server error for unhandled errors
  res.status(500).json(
    createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? err.message : undefined
    )
  );
}