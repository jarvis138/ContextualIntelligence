/**
 * API Validation Middleware
 * 
 * This module provides middleware functions for validating API requests
 * using Zod schema validation.
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/apiError';

/**
 * Format Zod validation errors into a more user-friendly structure
 * 
 * @param error Zod validation error
 * @returns Formatted validation error details
 */
function formatZodError(error: ZodError) {
  return error.errors.reduce((acc: Record<string, string>, curr) => {
    const path = curr.path.join('.');
    acc[path] = curr.message;
    return acc;
  }, {});
}

/**
 * Create middleware for validating request body using a Zod schema
 * 
 * @param schema Zod schema for validation
 * @returns Express middleware function
 */
export function validateBody<T extends AnyZodObject>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        next(new ValidationError('Request validation failed', 'VALIDATION_BODY_ERROR', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Create middleware for validating request query parameters using a Zod schema
 * 
 * @param schema Zod schema for validation
 * @returns Express middleware function
 */
export function validateQuery<T extends AnyZodObject>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        next(new ValidationError('Query validation failed', 'VALIDATION_QUERY_ERROR', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Create middleware for validating request parameters using a Zod schema
 * 
 * @param schema Zod schema for validation
 * @returns Express middleware function
 */
export function validateParams<T extends AnyZodObject>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        next(new ValidationError('Parameter validation failed', 'VALIDATION_PARAMS_ERROR', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Create middleware for validating the entire request (body, query, and params) using a Zod schema
 * 
 * @param schemas Object containing schemas for body, query, and params
 * @returns Express middleware function
 */
export function validateRequest({
  body,
  query,
  params
}: {
  body?: AnyZodObject,
  query?: AnyZodObject,
  params?: AnyZodObject
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (body) {
        body.parse(req.body);
      }
      
      if (query) {
        query.parse(req.query);
      }
      
      if (params) {
        params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        next(new ValidationError('Request validation failed', 'VALIDATION_ERROR', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}