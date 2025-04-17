/**
 * Audit Middleware
 * 
 * This middleware intercepts API requests and responses to automatically
 * log relevant security events for auditing purposes.
 */

import { Request, Response, NextFunction } from 'express';
import { AuditService, AuditCategory, AuditSeverity, AuditActions } from '../services/auditService';
import { getClientInfo, getTenantId, getSanitizedRequestData } from '../utils/requestUtils';

// Paths that should be audited
const AUDITED_PATHS = [
  // Authentication paths
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/refresh-token',
  // User management paths
  '/api/v1/users',
  // Administrative paths
  '/api/v1/admin',
  // Tenant paths
  '/api/v1/tenants',
  // Integration paths
  '/api/v1/integrations',
  // System configuration paths
  '/api/v1/settings',
  // API key management
  '/api/v1/api-keys',
];

// Sensitive operations that should always be audited
const SENSITIVE_OPERATIONS = [
  // Methods that modify data
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

/**
 * Determines if a request should be audited based on path and method
 * 
 * @param req Express request
 * @returns Whether the request should be audited
 */
function shouldAuditRequest(req: Request): boolean {
  const path = req.path;
  const method = req.method;
  
  // Check if path is in audited paths or starts with any of them
  const isAuditedPath = AUDITED_PATHS.some(auditedPath => 
    path === auditedPath || path.startsWith(`${auditedPath}/`)
  );
  
  // Check if method is considered sensitive
  const isSensitiveOperation = SENSITIVE_OPERATIONS.includes(method);
  
  // Special conditions for specific paths or operations
  const isSpecialCase = (
    // Always audit authentication attempts
    path.includes('/auth/') || 
    // Always audit admin operations
    path.includes('/admin/') ||
    // Always audit tenant operations
    path.includes('/tenants/') ||
    // Always audit sensitive data access
    path.includes('/api/v1/sensitive/')
  );
  
  return isAuditedPath || (isSensitiveOperation && isSpecialCase);
}

/**
 * Determine audit category based on request path and method
 * 
 * @param req Express request
 * @returns The audit category
 */
function determineAuditCategory(req: Request): AuditCategory {
  const path = req.path;
  
  if (path.includes('/auth/')) {
    return AuditCategory.AUTH;
  }
  
  if (path.includes('/admin/')) {
    return AuditCategory.ADMIN;
  }
  
  if (path.includes('/tenants/') || path.includes('/tenant-')) {
    return AuditCategory.TENANT;
  }
  
  if (path.includes('/integrations/')) {
    return AuditCategory.INTEGRATION;
  }
  
  if (path.includes('/settings/') || path.includes('/config/')) {
    return AuditCategory.CONFIG;
  }
  
  if (path.includes('/users/')) {
    return AuditCategory.USER_MANAGEMENT;
  }
  
  // Default category based on method
  switch (req.method) {
    case 'GET':
      return AuditCategory.DATA_ACCESS;
    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
      return AuditCategory.DATA_MODIFICATION;
    default:
      return AuditCategory.SYSTEM;
  }
}

/**
 * Determine audit action based on request path and method
 * 
 * @param req Express request
 * @returns The audit action
 */
function determineAuditAction(req: Request): string {
  const path = req.path;
  const method = req.method;
  
  // Authentication actions
  if (path.includes('/auth/login')) {
    return AuditActions.AUTH.LOGIN_SUCCESS;
  }
  
  if (path.includes('/auth/logout')) {
    return AuditActions.AUTH.LOGOUT;
  }
  
  if (path.includes('/auth/register')) {
    return AuditActions.AUTH.REGISTER;
  }
  
  if (path.includes('/auth/refresh-token')) {
    return AuditActions.AUTH.TOKEN_REFRESH;
  }
  
  // User management actions
  if (path.includes('/users/') || path.includes('/user/')) {
    switch (method) {
      case 'POST':
        return AuditActions.ADMIN.USER_CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditActions.ADMIN.USER_UPDATE;
      case 'DELETE':
        return AuditActions.ADMIN.USER_DELETE;
      default:
        return AuditActions.DATA.READ;
    }
  }
  
  // Tenant actions
  if (path.includes('/tenants/') || path.includes('/tenant-')) {
    switch (method) {
      case 'POST':
        return AuditActions.TENANT.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditActions.TENANT.UPDATE;
      case 'DELETE':
        return AuditActions.TENANT.DELETE;
      default:
        return AuditActions.DATA.READ;
    }
  }
  
  // Default actions based on method
  switch (method) {
    case 'GET':
      return AuditActions.DATA.READ;
    case 'POST':
      return AuditActions.DATA.CREATE;
    case 'PUT':
    case 'PATCH':
      return AuditActions.DATA.UPDATE;
    case 'DELETE':
      return AuditActions.DATA.DELETE;
    default:
      return 'UNKNOWN';
  }
}

/**
 * Determine audit severity based on request path, method, and response status
 * 
 * @param req Express request
 * @param res Express response
 * @returns The audit severity
 */
function determineAuditSeverity(req: Request, res: Response): AuditSeverity {
  const path = req.path;
  const method = req.method;
  const status = res.statusCode;
  
  // Critical actions
  const isCriticalAction = (
    path.includes('/auth/') ||
    path.includes('/admin/') ||
    path.includes('/settings/') ||
    path.includes('/api-keys/') ||
    path.includes('/tenants/')
  );
  
  // Security-relevant paths
  const isSecurityPath = (
    path.includes('/permissions/') ||
    path.includes('/roles/') ||
    path.includes('/security/')
  );
  
  // Determine severity based on status code
  if (status >= 500) {
    return AuditSeverity.ERROR;
  }
  
  if (status === 401 || status === 403) {
    return AuditSeverity.WARNING;
  }
  
  // Critical actions with destructive methods
  if (isCriticalAction && (method === 'DELETE' || method === 'PUT')) {
    return AuditSeverity.WARNING;
  }
  
  // Security paths are always at least WARNING level
  if (isSecurityPath) {
    return AuditSeverity.WARNING;
  }
  
  // Default to INFO level
  return AuditSeverity.INFO;
}

/**
 * Middleware to audit API requests and responses
 * 
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auditing for static assets and non-API requests
  if (req.path.includes('/static/') || req.path.includes('/assets/') || req.path.includes('favicon.ico')) {
    return next();
  }
  
  // Check if this request should be audited
  if (!shouldAuditRequest(req)) {
    return next();
  }
  
  // Store original end function to intercept it
  const originalEnd = res.end;
  
  // Get original request time
  const requestTime = Date.now();
  
  // Intercept the response end function
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    // Restore original end function
    res.end = originalEnd;
    
    // Calculate response time
    const responseTime = Date.now() - requestTime;
    
    // Log the audit event
    try {
      // Skip if no user is authenticated (unless it's an auth endpoint)
      const isAuthEndpoint = req.path.includes('/auth/');
      
      if (!req.user && !isAuthEndpoint) {
        // Just log anonymous access attempts but don't tie to a user
        // Call the original end function
        return originalEnd.call(this, chunk, encoding, callback);
      }
      
      const userId = req.user?.id ? parseInt(req.user.id.toString()) : -1;
      const tenantId = getTenantId(req);
      const clientInfo = getClientInfo(req);
      
      // Determine audit properties
      const category = determineAuditCategory(req);
      const action = determineAuditAction(req);
      const severity = determineAuditSeverity(req, res);
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Create generic resource type and ID from path
      const pathParts = req.path.split('/').filter(Boolean);
      const resourceType = pathParts.length > 0 ? pathParts[0] : 'unknown';
      const resourceId = pathParts.length > 1 ? pathParts[1] : undefined;
      
      // Generate a meaningful description
      const description = `${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`;
      
      // Log the audit event
      AuditService.log({
        userId,
        tenantId,
        action,
        category,
        severity,
        resourceType,
        resourceId,
        description,
        metadata: {
          requestMethod: req.method,
          requestPath: req.path,
          requestQuery: req.query,
          requestBody: getSanitizedRequestData(req),
          responseStatus: res.statusCode,
          responseTime,
          userAgent: clientInfo.userAgent,
          ipAddress: clientInfo.ipAddress,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success,
        sessionId: req.sessionID
      });
    } catch (error) {
      // Log error but don't block response
      console.error('Error in audit middleware:', error);
    }
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  // Proceed with the request
  next();
}

/**
 * Middleware to log failed authentication attempts
 * Specialized middleware for authentication endpoints
 * 
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function authAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store original end function to intercept it
  const originalEnd = res.end;
  
  // Get original request time
  const requestTime = Date.now();
  
  // Intercept the response end function
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    // Restore original end function
    res.end = originalEnd;
    
    // Calculate response time
    const responseTime = Date.now() - requestTime;
    
    // Check if authentication failed
    const authFailed = res.statusCode === 401 || res.statusCode === 403;
    
    if (authFailed) {
      // Log failed authentication attempt
      try {
        const clientInfo = getClientInfo(req);
        const username = req.body?.username || 'unknown';
        
        AuditService.log({
          userId: -1, // No valid user ID for failed auth
          action: AuditActions.AUTH.LOGIN_FAILURE,
          category: AuditCategory.AUTH,
          severity: AuditSeverity.WARNING,
          resourceType: 'auth',
          description: `Failed authentication attempt for user ${username}`,
          metadata: {
            username,
            method: req.method,
            path: req.path,
            responseTime,
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          success: false
        });
      } catch (error) {
        console.error('Error in auth audit middleware:', error);
      }
    }
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  // Proceed with the request
  next();
}

/**
 * Middleware to specifically audit destructive operations
 * 
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function destructiveOperationAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only intercept DELETE and PUT operations
  if (req.method !== 'DELETE' && req.method !== 'PUT') {
    return next();
  }
  
  // Store original end function to intercept it
  const originalEnd = res.end;
  
  // Intercept the response end function
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    // Restore original end function
    res.end = originalEnd;
    
    // Log all destructive operations
    try {
      // Skip if no user is authenticated
      if (!req.user) {
        // Call the original end function
        return originalEnd.call(this, chunk, encoding, callback);
      }
      
      const userId = req.user?.id ? parseInt(req.user.id.toString()) : -1;
      const tenantId = getTenantId(req);
      const clientInfo = getClientInfo(req);
      
      // Parse path to determine resource
      const pathParts = req.path.split('/').filter(Boolean);
      const resourceType = pathParts.length > 0 ? pathParts[0] : 'unknown';
      const resourceId = pathParts.length > 1 ? pathParts[1] : undefined;
      
      // Determine operation type
      const operation = req.method === 'DELETE' ? 'deletion' : 'update';
      
      // Log the destructive operation with higher severity
      AuditService.log({
        userId,
        tenantId,
        action: req.method === 'DELETE' ? AuditActions.DATA.DELETE : AuditActions.DATA.UPDATE,
        category: AuditCategory.DATA_MODIFICATION,
        severity: AuditSeverity.WARNING, // All destructive ops are at least WARNING
        resourceType,
        resourceId,
        description: `${operation} operation on ${resourceType}${resourceId ? ` (ID: ${resourceId})` : ''}`,
        metadata: {
          requestMethod: req.method,
          requestPath: req.path,
          requestBody: getSanitizedRequestData(req),
          responseStatus: res.statusCode,
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: res.statusCode >= 200 && res.statusCode < 400
      });
    } catch (error) {
      console.error('Error in destructive operation audit middleware:', error);
    }
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  // Proceed with the request
  next();
}