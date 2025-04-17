/**
 * Audit Middleware
 * 
 * Provides middleware for automatic security event logging across the application.
 * Includes specialized middleware for authentication events and destructive operations.
 */

import { Request, Response, NextFunction } from 'express';
import { AuditService, AuditCategory, AuditSeverity, AuditActions } from '../services/auditService';
import { getSanitizedRequestData, getTenantId } from '../utils/requestUtils';

/**
 * General audit middleware for API routes
 * Logs access to API endpoints and the result of operations
 */
export const auditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip logging for static assets, CORS preflight, etc.
  if (req.method === 'OPTIONS' || req.path.includes('/assets/') || req.path.includes('.js') || req.path.includes('.css')) {
    return next();
  }

  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  // Get request start time
  const startTime = Date.now();

  // Capture response data for logging
  let responseData: any = null;
  let responseStatusCode = 200;

  // Override methods to capture response data
  res.send = function (body: any): Response {
    responseData = body;
    return originalSend.apply(res, [body] as any);
  };

  res.json = function (body: any): Response {
    responseData = body;
    return originalJson.apply(res, [body] as any);
  };

  res.end = function (chunk?: any, encoding?: string, cb?: () => void): Response {
    responseStatusCode = res.statusCode;
    return originalEnd.apply(res, [chunk, encoding, cb] as any);
  };

  // Continue with request processing
  next();

  // After response is sent
  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    // Skip audit logging for successful static asset requests
    if (responseStatusCode === 200 && (
      req.path.includes('/assets/') || 
      req.path.includes('.js') || 
      req.path.includes('.css') || 
      req.path.includes('.ico')
    )) {
      return;
    }

    try {
      // Determine audit category based on HTTP method
      let category: AuditCategory;
      if (req.method === 'GET') {
        category = AuditCategory.DATA_ACCESS;
      } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        category = AuditCategory.DATA_MODIFICATION;
      } else if (req.method === 'DELETE') {
        category = AuditCategory.DATA_MODIFICATION;
      } else {
        category = AuditCategory.SYSTEM;
      }

      // Determine severity based on status code and duration
      let severity: AuditSeverity;
      if (responseStatusCode >= 500) {
        severity = AuditSeverity.ERROR;
      } else if (responseStatusCode >= 400) {
        severity = AuditSeverity.WARNING;
      } else if (duration > 5000) { // Long-running requests
        severity = AuditSeverity.WARNING;
      } else {
        severity = AuditSeverity.INFO;
      }

      // Extract resource info from URL
      const urlParts = req.path.split('/').filter(Boolean);
      let resourceType = urlParts[0] || 'api';
      let resourceId = urlParts.length > 1 ? urlParts[1] : undefined;

      // If this is a nested resource, adjust resource type
      if (urlParts.length >= 3 && !isNaN(Number(urlParts[1]))) {
        resourceType = `${urlParts[0]}/${urlParts[2]}`;
      }

      // Determine action based on HTTP method
      const action = `${resourceType}.${req.method.toLowerCase()}`;

      // Prepare audit log entry
      const auditEntry = {
        userId: req.user?.id || 0, // Anonymous user has ID 0
        action,
        category,
        severity,
        resourceType,
        resourceId,
        description: `${req.method} ${req.path}`,
        success: responseStatusCode < 400,
        metadata: {
          requestParams: req.params,
          requestQuery: req.query,
          requestBody: req.body,
          responseStatus: responseStatusCode,
          responseDuration: duration,
        }
      };

      // Log the audit event
      await AuditService.logFromRequest(req, auditEntry);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  });
};

/**
 * Specialized audit middleware for authentication-related routes
 */
export const authAuditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const originalEnd = res.end;
  const path = req.path.toLowerCase();
  
  // Continue with request processing
  next();

  // After response is sent
  res.on('finish', async () => {
    try {
      let action = '';
      let description = '';
      
      // Determine action based on path
      if (path.includes('/login')) {
        action = AuditActions.AUTH.LOGIN_SUCCESS;
        description = 'User login attempt';
      } else if (path.includes('/logout')) {
        action = AuditActions.AUTH.LOGOUT;
        description = 'User logout';
      } else if (path.includes('/register')) {
        action = AuditActions.AUTH.REGISTER;
        description = 'User registration';
      } else if (path.includes('/password/reset')) {
        action = AuditActions.AUTH.PASSWORD_RESET;
        description = 'Password reset request';
      } else if (path.includes('/password/change')) {
        action = AuditActions.AUTH.PASSWORD_CHANGE;
        description = 'Password change';
      } else if (path.includes('/token/refresh')) {
        action = AuditActions.AUTH.TOKEN_REFRESH;
        description = 'Auth token refresh';
      } else if (path.includes('/mfa/setup')) {
        action = AuditActions.AUTH.MFA_SETUP;
        description = 'MFA setup';
      } else if (path.includes('/mfa/verify')) {
        action = AuditActions.AUTH.MFA_VERIFY;
        description = 'MFA verification';
      } else if (path.includes('/sso')) {
        action = AuditActions.AUTH.SSO_AUTHENTICATE;
        description = 'SSO authentication attempt';
      } else if (path.includes('/saml')) {
        action = AuditActions.AUTH.SAML_AUTHENTICATE;
        description = 'SAML authentication attempt';
      } else if (path.includes('/oauth')) {
        action = AuditActions.AUTH.OAUTH_AUTHENTICATE;
        description = 'OAuth authentication attempt';
      } else {
        action = 'auth.unknown';
        description = `Auth operation: ${req.method} ${req.path}`;
      }

      // Determine severity
      const severity = res.statusCode >= 400 
        ? (res.statusCode >= 500 ? AuditSeverity.ERROR : AuditSeverity.WARNING)
        : AuditSeverity.INFO;

      // Create audit entry
      const auditEntry = {
        userId: req.user?.id || 0,
        action,
        category: AuditCategory.AUTH,
        severity,
        resourceType: 'auth',
        description,
        success: res.statusCode < 400,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode
        }
      };

      // Log the event
      await AuditService.logFromRequest(req, auditEntry);
    } catch (error) {
      console.error('Failed to log auth audit event:', error);
    }
  });
};

/**
 * Middleware to log destructive operations (DELETE, mass updates)
 */
export const destructiveOperationAuditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Only apply to DELETE requests and PUT/PATCH requests with certain paths
  const isDestructive = 
    req.method === 'DELETE' || 
    ((req.method === 'PUT' || req.method === 'PATCH') && 
      (req.path.includes('/delete') || req.path.includes('/remove') || req.path.includes('/reset')));

  if (!isDestructive) {
    return next();
  }

  // Store original body for logging
  const originalBody = JSON.parse(JSON.stringify(req.body || {}));
  
  // Continue with request processing
  next();

  // After response is sent
  res.on('finish', async () => {
    try {
      // Parse resource information from URL
      const urlParts = req.path.split('/').filter(Boolean);
      let resourceType = urlParts[0] || 'unknown';
      let resourceId = urlParts.length > 1 ? urlParts[1] : undefined;

      // Customize for nested resources
      if (urlParts.length > 2 && !isNaN(Number(urlParts[1]))) {
        resourceType = `${urlParts[0]}/${urlParts[2]}`;
        resourceId = urlParts.length > 3 ? urlParts[3] : undefined;
      }

      // Set severity based on results
      const severity = res.statusCode >= 400 
        ? (res.statusCode >= 500 ? AuditSeverity.ERROR : AuditSeverity.WARNING)
        : AuditSeverity.WARNING; // Destructive operations are always at least WARNING

      // Construct action string
      const action = `${resourceType}.${req.method === 'DELETE' ? 'delete' : 'update'}`;

      // Create audit entry
      const auditEntry = {
        userId: req.user?.id || 0,
        action,
        category: AuditCategory.DATA_MODIFICATION,
        severity,
        resourceType,
        resourceId,
        description: `Destructive operation: ${req.method} ${req.path}`,
        success: res.statusCode < 400,
        metadata: {
          method: req.method,
          path: req.path,
          requestBody: originalBody,
          statusCode: res.statusCode
        }
      };

      // Log the event with elevated priority
      await AuditService.logFromRequest(req, auditEntry);
    } catch (error) {
      console.error('Failed to log destructive operation audit event:', error);
    }
  });
};