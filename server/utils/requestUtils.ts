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
  // Get IP address, handling proxies
  const ipAddress = (
    req.headers['x-forwarded-for'] as string ||
    req.socket.remoteAddress ||
    'unknown'
  ).split(',')[0].trim();
  
  // Get user agent
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Get referer and origin if available
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
  // Access tenant ID from request object (set by tenant middleware)
  return req.tenantId as number | undefined;
}

/**
 * Get the complete request URL
 * 
 * @param req Express request object
 * @returns The complete URL
 */
export function getFullUrl(req: Request): string {
  // Protocol + host + originalUrl
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}${req.originalUrl}`;
}

/**
 * Extract sanitized request data for logging
 * 
 * @param req Express request object
 * @returns Sanitized request data
 */
export function getSanitizedRequestData(req: Request): Record<string, any> {
  // Copy request data for sanitization
  const requestData = {
    method: req.method,
    url: req.url,
    params: { ...req.params },
    query: { ...req.query },
    body: req.body ? { ...req.body } : undefined,
    headers: { ...req.headers }
  };
  
  // Sanitize sensitive data
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'credential', 'authorization',
    'apiKey', 'accessToken', 'refreshToken', 'private'
  ];
  
  // Sanitize headers
  for (const field of sensitiveFields) {
    if (requestData.headers[field]) {
      requestData.headers[field] = '[REDACTED]';
    }
    if (requestData.headers[`x-${field}`]) {
      requestData.headers[`x-${field}`] = '[REDACTED]';
    }
  }
  
  // Always redact authorization header
  if (requestData.headers.authorization) {
    requestData.headers.authorization = '[REDACTED]';
  }
  
  // Sanitize request body (if exists)
  if (requestData.body) {
    for (const field of sensitiveFields) {
      if (requestData.body[field]) {
        requestData.body[field] = '[REDACTED]';
      }
    }
  }
  
  return requestData;
}

/**
 * Check if a request is from a trusted source (internal network, same origin, etc.)
 * 
 * @param req Express request object
 * @returns Whether the request is from a trusted source
 */
export function isTrustedRequest(req: Request): boolean {
  // Get client IP
  const ip = getClientInfo(req).ipAddress;
  
  // Check if internal IP
  const isInternalIp = 
    ip === '127.0.0.1' || 
    ip === '::1' || 
    ip.startsWith('10.') || 
    ip.startsWith('172.16.') || 
    ip.startsWith('172.17.') || 
    ip.startsWith('172.18.') || 
    ip.startsWith('172.19.') || 
    ip.startsWith('172.20.') || 
    ip.startsWith('172.21.') || 
    ip.startsWith('172.22.') || 
    ip.startsWith('172.23.') || 
    ip.startsWith('172.24.') || 
    ip.startsWith('172.25.') || 
    ip.startsWith('172.26.') || 
    ip.startsWith('172.27.') || 
    ip.startsWith('172.28.') || 
    ip.startsWith('172.29.') || 
    ip.startsWith('172.30.') || 
    ip.startsWith('172.31.') || 
    ip.startsWith('192.168.');
  
  // Check Origin header matches Host
  const origin = req.headers.origin;
  const host = req.headers.host;
  const isSameOrigin = origin && host && (
    origin === `https://${host}` || 
    origin === `http://${host}`
  );
  
  // Check API key if present
  const hasValidApiKey = req.headers['x-api-key'] === process.env.API_KEY;
  
  return isInternalIp || isSameOrigin || hasValidApiKey;
}

// Add Express RequestHandler extensions for type safety
declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
    }
  }
}