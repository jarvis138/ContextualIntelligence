import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from './error-handler';

// Define permission types
export type Permission = string;
export type Role = string;

// Define role-permission mapping
const rolePermissions: Record<Role, Permission[]> = {
  'admin': ['*'], // Admin has all permissions
  'manager': [
    'users:read',
    'users:create',
    'users:update',
    'documents:read',
    'documents:create',
    'documents:update',
    'documents:delete',
    'analytics:read'
  ],
  'user': [
    'users:read:self',
    'users:update:self',
    'documents:read',
    'documents:create',
    'documents:update:own',
    'documents:delete:own'
  ],
  'support': [
    'users:read',
    'documents:read',
    'analytics:read'
  ],
  'readonly': [
    'users:read:self',
    'documents:read'
  ]
};

// Check if a role has a specific permission
const hasPermission = (role: Role, permission: Permission): boolean => {
  if (!rolePermissions[role]) {
    return false;
  }

  // Check for wildcard permission
  if (rolePermissions[role].includes('*')) {
    return true;
  }

  // Check for exact permission
  if (rolePermissions[role].includes(permission)) {
    return true;
  }

  // Check for hierarchical permissions (e.g., 'documents:*' includes 'documents:read')
  const permissionParts = permission.split(':');
  for (let i = 1; i <= permissionParts.length; i++) {
    const partialPermission = [...permissionParts.slice(0, i), '*'].join(':');
    if (rolePermissions[role].includes(partialPermission)) {
      return true;
    }
  }

  return false;
};

// Middleware to check if user has required permission
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED');
      }

      const user = req.user as any;
      const role = user.role || 'user';

      // Check if user has the required permission
      if (!hasPermission(role, permission)) {
        logger.warn('Permission denied', { 
          userId: user.id, 
          role, 
          permission, 
          path: req.path 
        });
        
        throw new ApiError(403, 'Permission denied', 'FORBIDDEN');
      }

      // For permissions with :own or :self suffix, check if the user is accessing their own resources
      if (permission.endsWith(':own') || permission.endsWith(':self')) {
        // This will be handled in the specific route handlers
        // We just set a flag to indicate that the user can only access their own resources
        req.accessControl = {
          restrictToOwn: true,
          userId: user.id
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has any of the required roles
export const requireRole = (roles: Role | Role[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED');
      }

      const user = req.user as any;
      const role = user.role || 'user';

      // Check if user has any of the required roles
      if (!allowedRoles.includes(role) && !allowedRoles.includes('*')) {
        logger.warn('Role not allowed', { 
          userId: user.id, 
          role, 
          requiredRoles: allowedRoles, 
          path: req.path 
        });
        
        throw new ApiError(403, 'Permission denied', 'FORBIDDEN');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      accessControl?: {
        restrictToOwn: boolean;
        userId: number;
      };
    }
  }
}