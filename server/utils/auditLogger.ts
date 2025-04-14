/**
 * Audit Logger
 * 
 * Centralized logging system for security-related and document processing events
 * to maintain a complete audit trail of system activities.
 */

import { storage } from '../storage';

// Types of audit events
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILED = 'auth.login.failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_TOKEN_REFRESH = 'auth.token.refresh',
  AUTH_TOKEN_REVOKED = 'auth.token.revoked',
  AUTH_PERMISSION_DENIED = 'auth.permission.denied',
  
  // Account events
  ACCOUNT_CREATED = 'account.created',
  ACCOUNT_UPDATED = 'account.updated',
  ACCOUNT_DELETED = 'account.deleted',
  ACCOUNT_PASSWORD_CHANGED = 'account.password.changed',
  ACCOUNT_PASSWORD_RESET = 'account.password.reset',
  
  // Project events
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',
  PROJECT_MEMBER_ADDED = 'project.member.added',
  PROJECT_MEMBER_REMOVED = 'project.member.removed',
  PROJECT_PERMISSION_CHANGED = 'project.permission.changed',
  
  // Document events
  DOCUMENT_CREATED = 'document.created',
  DOCUMENT_UPDATED = 'document.updated',
  DOCUMENT_DELETED = 'document.deleted',
  DOCUMENT_ACCESSED = 'document.accessed',
  DOCUMENT_SHARED = 'document.shared',
  DOCUMENT_PERMISSION_CHANGED = 'document.permission.changed',
  DOCUMENT_PROCESSED = 'document.processed',
  DOCUMENT_PROCESSING_FAILED = 'document.processing.failed',
  DOCUMENT_VERSION_CREATED = 'document.version.created',
  DOCUMENT_STATE_CHANGED = 'document.state.changed',
  DOCUMENT_METADATA_UPDATED = 'document.metadata.updated',
  
  // Email specific events
  EMAIL_PROCESSED = 'email.processed',
  EMAIL_THREAD_DETECTED = 'email.thread.detected',
  EMAIL_ATTACHMENT_EXTRACTED = 'email.attachment.extracted',
  EMAIL_ATTACHMENT_PROCESSED = 'email.attachment.processed',
  EMAIL_ATTACHMENT_FAILED = 'email.attachment.failed',
  EMAIL_THREAD_LINKED = 'email.thread.linked',
  
  // Correlation events
  ENTITY_CORRELATION_STARTED = 'entity.correlation.started',
  ENTITY_CORRELATION_COMPLETED = 'entity.correlation.completed',
  ENTITY_RELATIONSHIP_CREATED = 'entity.relationship.created',
  ENTITY_RELATIONSHIP_UPDATED = 'entity.relationship.updated',
  ENTITY_CORRELATION_FAILED = 'entity.correlation.failed',
  
  // Integration events
  INTEGRATION_CONNECTED = 'integration.connected',
  INTEGRATION_DISCONNECTED = 'integration.disconnected',
  INTEGRATION_SYNC_STARTED = 'integration.sync.started',
  INTEGRATION_SYNC_COMPLETED = 'integration.sync.completed',
  INTEGRATION_SYNC_FAILED = 'integration.sync.failed',
  INTEGRATION_PERMISSION_CHANGED = 'integration.permission.changed',
  
  // System events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_CONFIG_CHANGED = 'system.config.changed',
  SYSTEM_MAINTENANCE_STARTED = 'system.maintenance.started',
  SYSTEM_MAINTENANCE_COMPLETED = 'system.maintenance.completed',
  SYSTEM_CORRELATION_STARTED = 'system.correlation.started',
  SYSTEM_CORRELATION_COMPLETE = 'system.correlation.complete',
  SYSTEM_CORRELATION_FAILED = 'system.correlation.failed',
  
  // Data events
  DATA_EXPORT_STARTED = 'data.export.started',
  DATA_EXPORT_COMPLETED = 'data.export.completed',
  DATA_EXPORT_FAILED = 'data.export.failed',
  DATA_IMPORT_STARTED = 'data.import.started',
  DATA_IMPORT_COMPLETED = 'data.import.completed',
  DATA_IMPORT_FAILED = 'data.import.failed',
  DATA_NORMALIZATION_STARTED = 'data.normalization.started',
  DATA_NORMALIZATION_COMPLETED = 'data.normalization.completed',
  DATA_NORMALIZATION_FAILED = 'data.normalization.failed',
  
  // AI processing events
  AI_ANALYSIS_STARTED = 'ai.analysis.started',
  AI_ANALYSIS_COMPLETED = 'ai.analysis.completed',
  AI_ANALYSIS_FAILED = 'ai.analysis.failed',
  AI_INSIGHT_GENERATED = 'ai.insight.generated',
  
  // Search events
  SEARCH_PERFORMED = 'search.performed',
  SEARCH_INDEX_UPDATED = 'search.index.updated',
  SEARCH_INDEX_FAILED = 'search.index.failed'
}

// Severity levels for audit events
export enum AuditEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Interface for audit events
export interface AuditEvent {
  id?: number;
  timestamp?: Date;
  eventType: AuditEventType;
  userId?: number;
  projectId?: number;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  severity?: AuditEventSeverity;
  metadata?: any;
}

/**
 * Log an audit event
 */
export function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Set default values
    const timestamp = event.timestamp || new Date();
    const severity = event.severity || getSeverityForEventType(event.eventType);
    
    // Format the event for storage
    const formattedEvent = {
      ...event,
      timestamp,
      severity,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null
    };
    
    // Log to console for development
    console.log(`[AUDIT] [${severity.toUpperCase()}] ${event.eventType}: ${event.description}`);
    
    // In a real implementation, this would store in the database
    // For now, we'll just return a resolved promise
    return Promise.resolve();
  } catch (error) {
    console.error('Error logging audit event:', error);
    return Promise.resolve();
  }
}

/**
 * Get the default severity for an event type
 */
function getSeverityForEventType(eventType: AuditEventType): AuditEventSeverity {
  // Authentication failures and security events are higher severity
  if (
    eventType === AuditEventType.AUTH_LOGIN_FAILED ||
    eventType === AuditEventType.AUTH_PERMISSION_DENIED ||
    eventType === AuditEventType.AUTH_TOKEN_REVOKED
  ) {
    return AuditEventSeverity.WARNING;
  }
  
  // System errors and security issues are critical
  if (
    eventType === AuditEventType.SYSTEM_ERROR ||
    eventType === AuditEventType.DOCUMENT_PROCESSING_FAILED ||
    eventType === AuditEventType.INTEGRATION_SYNC_FAILED ||
    eventType === AuditEventType.AI_ANALYSIS_FAILED
  ) {
    return AuditEventSeverity.ERROR;
  }
  
  // Account deletions and major system changes are critical
  if (
    eventType === AuditEventType.ACCOUNT_DELETED ||
    eventType === AuditEventType.SYSTEM_CONFIG_CHANGED
  ) {
    return AuditEventSeverity.CRITICAL;
  }
  
  // Default to info level
  return AuditEventSeverity.INFO;
}