/**
 * Authentication and Authorization Middleware
 * 
 * This middleware provides functions for authenticating requests
 * and authorizing users based on roles or permissions.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/apiError';
import { ErrorCodes } from '../utils/apiError';
import { AuthUser } from '../auth';

// JWT secret, ideally from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-not-for-production';
const JWT_ALGORITHM = 'HS256';

/**
 * Express middleware to authenticate requests using JWT
 * 
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 * @throws UnauthorizedError if authentication fails
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.token;
    
    // If no token, throw unauthorized error
    if (!token) {
      throw new UnauthorizedError(
        'Authentication required', 
        ErrorCodes.AUTH.INVALID_TOKEN
      );
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
      req.user = decoded as AuthUser;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError(
          'Authentication token has expired', 
          ErrorCodes.AUTH.TOKEN_EXPIRED
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError(
          'Invalid authentication token', 
          ErrorCodes.AUTH.INVALID_TOKEN
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Express middleware to authorize requests based on user roles
 * 
 * @param roles Array of roles allowed to access the resource
 * @returns Express middleware function
 * @throws ForbiddenError if authorization fails
 */
export function authorizeRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user exists on request (should be added by authenticateToken)
      if (!req.user) {
        throw new UnauthorizedError(
          'Authentication required',
          ErrorCodes.AUTH.INVALID_TOKEN
        );
      }
      
      // If roles are specified, check if user has one of the required roles
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        throw new ForbiddenError(
          'Insufficient permissions to access this resource',
          ErrorCodes.AUTH.INSUFFICIENT_PERMISSIONS
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Express middleware to authorize resource ownership
 * 
 * @param getUserIdFromResource Function to extract owner ID from the request
 * @returns Express middleware function
 * @throws ForbiddenError if authorization fails
 */
export function authorizeOwnership(
  getUserIdFromResource: (req: Request) => Promise<number | null> | number | null
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip ownership check for admins
      if (req.user?.role === 'admin') {
        return next();
      }
      
      // Get resource owner ID
      const resourceOwnerId = await getUserIdFromResource(req);
      
      // If resource has no owner, allow access
      if (resourceOwnerId === null) {
        return next();
      }
      
      // Check if user is the owner
      if (req.user?.id !== resourceOwnerId) {
        throw new ForbiddenError(
          'You do not have permission to access this resource',
          ErrorCodes.RESOURCE.OWNED_BY_OTHER
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}