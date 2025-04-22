import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  code: string;
  
  constructor(statusCode: number, message: string, code: string = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let details = undefined;

  // Log the error
  logger.error({
    err,
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] || 'unknown'
  });

  // Handle different types of errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.code;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errorCode = 'VALIDATION_ERROR';
    details = err.errors;
  } else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token Expired';
    errorCode = 'TOKEN_EXPIRED';
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid Token';
    errorCode = 'INVALID_TOKEN';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    errorCode = 'UNAUTHORIZED';
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      details: details || undefined
    }
  });
};