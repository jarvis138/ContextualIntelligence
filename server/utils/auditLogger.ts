/**
 * Audit Logging Utility
 * 
 * This module provides functions for logging security-related events
 * such as authentication, token rotation, and access revocation.
 */

import { db } from '../db';
import { activities } from '@shared/schema';
import { sql } from 'drizzle-orm';

export enum AuditEventType {
  LOGIN = 'auth_login',
  LOGOUT = 'auth_logout',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_ROTATION = 'token_rotation',
  TOKEN_REVOCATION = 'token_revocation',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_DELETED = 'account_deleted',
}

interface AuditLogParams {
  userId: number;
  projectId?: number; // Optional for auth events not tied to a project
  eventType: AuditEventType;
  description: string;
  metadata?: Record<string, any>; // Additional details about the event
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent({
  userId,
  projectId = 0, // Default to 0 for system-level events
  eventType,
  description,
  metadata = {}
}: AuditLogParams): Promise<void> {
  try {
    // Sanitize metadata to remove sensitive information
    const sanitizedMetadata = sanitizeMetadata(metadata);
    
    // Create detailed description with metadata
    const detailedDescription = metadata ? 
      `${description} | ${JSON.stringify(sanitizedMetadata)}` : 
      description;

    await db.insert(activities).values({
      type: eventType,
      description: detailedDescription,
      userId,
      projectId,
      entityType: 'user',
      entityId: userId,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to prevent disrupting core functionality
  }
}

/**
 * Remove sensitive information from metadata
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };
  
  // List of fields to redact
  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken', 
    'apiKey', 'secret', 'credential', 'auth'
  ];
  
  // Redact sensitive fields
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}