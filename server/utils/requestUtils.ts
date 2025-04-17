/**
 * Request Utility Functions
 * 
 * Utilities for handling HTTP requests, extracting client information,
 * and managing request context.
 */

import { Request } from 'express';

/**
 * Client information extracted from a request
 */
export interface ClientInfo {
  ipAddress: string;
  userAgent: string;
  referer?: string;
  origin?: string;
}

/**
 * Extract client information from a request
 * 
 * @param req Express request object
 * @returns Client information including IP address and user agent
 */
export function getClientInfo(req: Request): ClientInfo {
  // Extract IP address, handling proxies with X-Forwarded-For
  const ipAddress = (
    req.headers['x-forwarded-for'] || 
    req.socket.remoteAddress || 
    '0.0.0.0'
  ).toString().split(',')[0].trim();
  
  // Extract user agent
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  // Extract referer and origin
  const referer = req.headers.referer;
  const origin = req.headers.origin;
  
  return {
    ipAddress,
    userAgent,
    referer,
    origin
  };
}

/**
 * Get the tenant ID from a request
 * 
 * @param req Express request object
 * @returns The tenant ID or undefined if not available
 */
export function getTenantId(req: Request): number | undefined {
  // Check if tenant ID is set in the request object
  if (req.tenant && typeof req.tenant.id === 'number') {
    return req.tenant.id;
  }
  
  // Check headers for tenant ID
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId && !Array.isArray(headerTenantId)) {
    const id = parseInt(headerTenantId);
    if (!isNaN(id)) {
      return id;
    }
  }
  
  // Check JWT token for tenant ID (if user is authenticated)
  if (req.user && 'tenantId' in req.user && typeof req.user.tenantId === 'number') {
    return req.user.tenantId;
  }
  
  return undefined;
}

/**
 * Get the complete request URL
 * 
 * @param req Express request object
 * @returns The complete URL
 */
export function getFullUrl(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host || 'localhost';
  const originalUrl = req.originalUrl || req.url;
  
  return `${protocol}://${host}${originalUrl}`;
}

/**
 * Extract sanitized request data for logging
 * 
 * @param req Express request object
 * @returns Sanitized request data
 */
export function getSanitizedRequestData(req: Request): Record<string, any> {
  // Create a copy of the request body
  const sanitizedBody = { ...req.body };
  
  // List of sensitive fields to redact
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'credential', 'auth',
    'apiKey', 'accessToken', 'refreshToken', 'private'
  ];
  
  // Redact sensitive fields
  for (const field of sensitiveFields) {
    if (field in sanitizedBody) {
      sanitizedBody[field] = '[REDACTED]';
    }
  }
  
  // Return sanitized request data
  return {
    method: req.method,
    path: req.path,
    query: req.query,
    body: sanitizedBody,
    headers: {
      ...req.headers,
      // Redact sensitive headers
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      cookie: req.headers.cookie ? '[REDACTED]' : undefined
    }
  };
}

/**
 * Check if a request is from a trusted source (internal network, same origin, etc.)
 * 
 * @param req Express request object
 * @returns Whether the request is from a trusted source
 */
export function isTrustedRequest(req: Request): boolean {
  const clientInfo = getClientInfo(req);
  
  // Check for local/internal IP addresses
  const isInternalIp = (
    clientInfo.ipAddress === '127.0.0.1' ||
    clientInfo.ipAddress === '::1' ||
    clientInfo.ipAddress.startsWith('10.') ||
    clientInfo.ipAddress.startsWith('172.16.') ||
    clientInfo.ipAddress.startsWith('172.17.') ||
    clientInfo.ipAddress.startsWith('172.18.') ||
    clientInfo.ipAddress.startsWith('172.19.') ||
    clientInfo.ipAddress.startsWith('172.20.') ||
    clientInfo.ipAddress.startsWith('172.21.') ||
    clientInfo.ipAddress.startsWith('172.22.') ||
    clientInfo.ipAddress.startsWith('172.23.') ||
    clientInfo.ipAddress.startsWith('172.24.') ||
    clientInfo.ipAddress.startsWith('172.25.') ||
    clientInfo.ipAddress.startsWith('172.26.') ||
    clientInfo.ipAddress.startsWith('172.27.') ||
    clientInfo.ipAddress.startsWith('172.28.') ||
    clientInfo.ipAddress.startsWith('172.29.') ||
    clientInfo.ipAddress.startsWith('172.30.') ||
    clientInfo.ipAddress.startsWith('172.31.') ||
    clientInfo.ipAddress.startsWith('192.168.')
  );
  
  if (isInternalIp) {
    return true;
  }
  
  // Check for same-origin requests
  const host = req.headers.host;
  if (clientInfo.origin && host) {
    try {
      const originHost = new URL(clientInfo.origin).host;
      if (originHost === host) {
        return true;
      }
    } catch (e) {
      // Invalid origin, not trusted
    }
  }
  
  // Add additional checks as needed
  
  return false;
}