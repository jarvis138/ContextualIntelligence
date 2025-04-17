/**
 * Audit Service
 * 
 * Provides comprehensive security audit logging functionality for tracking
 * all sensitive operations across the application.
 */

import { Request } from 'express';
import { db } from '../db';
import { auditLogs } from '@shared/schema';
import { getClientInfo, getTenantId, getSanitizedRequestData } from '../utils/requestUtils';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { AuditLog } from '@shared/schema';

// Audit action categories
export enum AuditCategory {
  // Authentication events
  AUTH = 'AUTH',
  // Data access events (read operations)
  DATA_ACCESS = 'DATA_ACCESS',
  // Data modification events (write operations)
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  // Admin operations
  ADMIN = 'ADMIN',
  // System-level events
  SYSTEM = 'SYSTEM',
  // Security-related events
  SECURITY = 'SECURITY',
  // User management events
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  // Configuration changes
  CONFIG = 'CONFIG',
  // Integration events
  INTEGRATION = 'INTEGRATION',
  // Tenant-related operations
  TENANT = 'TENANT'
}

// Severity levels for audit events
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Audit log entry interface
export interface AuditLogEntry {
  userId: number;
  tenantId?: number;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  resourceType: string;
  resourceId?: string | number;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  sessionId?: string;
  encryptedData?: string;
}

// Add missing fields in this interface because we're evolving the schema
interface FullAuditLogEntry extends AuditLogEntry {
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
}

/**
 * Audit Service for comprehensive security logging
 */
export class AuditService {
  /**
   * Log an audit event
   * 
   * @param entry The audit log entry details
   * @returns The created audit log entry
   */
  static async log(entry: FullAuditLogEntry): Promise<AuditLog> {
    try {
      // Sanitize metadata before storing
      if (entry.metadata) {
        entry.metadata = this.sanitizeMetadata(entry.metadata);
      }
      
      // Insert the audit log entry
      const [logEntry] = await db.insert(auditLogs).values({
        userId: entry.userId,
        tenantId: entry.tenantId,
        action: entry.action,
        category: entry.category,
        severity: entry.severity,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId?.toString(),
        description: entry.description,
        metadata: entry.metadata,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success !== undefined ? entry.success : true,
        sessionId: entry.sessionId,
        encryptedData: entry.encryptedData,
      }).returning();

      // Trigger security alerts for CRITICAL severity events
      if (entry.severity === AuditSeverity.CRITICAL) {
        this.triggerSecurityAlert(entry);
      }

      return logEntry;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Still return something to avoid breaking client code
      return {
        id: -1,
        userId: entry.userId,
        action: entry.action,
        category: entry.category,
        severity: entry.severity,
        resourceType: entry.resourceType,
        timestamp: new Date(),
      } as AuditLog;
    }
  }

  /**
   * Log an audit event from an Express request
   * 
   * @param req Express request object
   * @param entry Partial audit log entry (client info will be extracted from request)
   * @returns The created audit log entry
   */
  static async logFromRequest(req: Request, entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>): Promise<AuditLog> {
    const clientInfo = getClientInfo(req);
    const tenantId = getTenantId(req);
    
    return this.log({
      ...entry,
      tenantId,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      sessionId: req.sessionID,
    });
  }

  /**
   * Sanitize metadata to remove sensitive information
   * 
   * @param metadata The metadata object to sanitize
   * @returns Sanitized metadata
   */
  private static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'credential', 'auth',
      'apiKey', 'accessToken', 'refreshToken', 'private'
    ];
    
    const sanitizedMetadata = { ...metadata };
    
    // Recursively check and sanitize nested objects
    const sanitizeObj = (obj: Record<string, any>) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObj(obj[key]);
        } else if (
          sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase())) ||
          (typeof obj[key] === 'string' && obj[key].length > 100)
        ) {
          obj[key] = '[REDACTED]';
        }
      }
    };
    
    sanitizeObj(sanitizedMetadata);
    return sanitizedMetadata;
  }

  /**
   * Trigger a security alert for critical events
   * This could integrate with monitoring systems like PagerDuty, Slack, etc.
   * 
   * @param entry The audit log entry that triggered the alert
   */
  private static triggerSecurityAlert(entry: AuditLogEntry) {
    // This is a placeholder - in a real implementation, this would:
    // 1. Send alerts to security teams via email/SMS
    // 2. Post to security alert channels in Slack/Teams
    // 3. Trigger incident management systems
    // 4. Potentially block suspicious accounts or IP addresses
    
    console.error(`[SECURITY ALERT] ${entry.severity} - ${entry.action} - ${entry.description}`);
    
    // Record the alert in the system events table
    // Implementation depends on configuration
  }

  /**
   * Query audit logs with filters
   * 
   * @param filters Filter criteria
   * @param limit Maximum number of results to return
   * @param offset Pagination offset
   * @returns Matching audit log entries
   */
  static async query(
    filters: {
      userId?: number;
      tenantId?: number;
      action?: string;
      category?: AuditCategory;
      resourceType?: string;
      resourceId?: string | number;
      severity?: AuditSeverity;
      fromDate?: Date;
      toDate?: Date;
      success?: boolean;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      // Build the query conditions based on filters
      let query = db.select().from(auditLogs);
      
      // Apply filters if provided
      if (filters.userId !== undefined) {
        query = query.where(eq(auditLogs.userId, filters.userId));
      }
      
      if (filters.tenantId !== undefined) {
        query = query.where(eq(auditLogs.tenantId, filters.tenantId));
      }
      
      if (filters.action) {
        query = query.where(eq(auditLogs.action, filters.action));
      }
      
      if (filters.category) {
        query = query.where(eq(auditLogs.category, filters.category));
      }
      
      if (filters.resourceType) {
        query = query.where(eq(auditLogs.resourceType, filters.resourceType));
      }
      
      if (filters.resourceId !== undefined) {
        query = query.where(eq(auditLogs.resourceId, filters.resourceId.toString()));
      }
      
      if (filters.severity) {
        query = query.where(eq(auditLogs.severity, filters.severity));
      }
      
      if (filters.success !== undefined) {
        query = query.where(eq(auditLogs.success, filters.success));
      }
      
      // Date range filters
      if (filters.fromDate) {
        query = query.where(gte(auditLogs.timestamp, filters.fromDate));
      }
      
      if (filters.toDate) {
        query = query.where(lte(auditLogs.timestamp, filters.toDate));
      }
      
      // Apply pagination and sorting
      const results = await query
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);
        
      return results;
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }

  /**
   * Generate a security audit report
   * 
   * @param tenantId The tenant ID to generate a report for
   * @param fromDate Start date for the report
   * @param toDate End date for the report
   * @returns A report of security-relevant audit events
   */
  static async generateSecurityReport(
    tenantId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<object> {
    try {
      // Set default date range if not provided
      if (!fromDate) {
        // Default to last 30 days
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      }
      
      if (!toDate) {
        toDate = new Date();
      }
      
      // Get all security-relevant events
      const query = db.select().from(auditLogs)
        .where(
          and(
            // Security-relevant categories
            gte(auditLogs.timestamp, fromDate),
            lte(auditLogs.timestamp, toDate),
          )
        );
      
      // Filter by tenant if provided
      if (tenantId !== undefined) {
        query.where(eq(auditLogs.tenantId, tenantId));
      }
      
      const logs = await query.orderBy(desc(auditLogs.timestamp));
      
      // Summarize the logs
      const summary = {
        reportGeneratedAt: new Date(),
        reportTimeRange: {
          from: fromDate,
          to: toDate
        },
        tenantId,
        totalEvents: logs.length,
        eventsBySeverity: {
          critical: logs.filter(log => log.severity === AuditSeverity.CRITICAL).length,
          error: logs.filter(log => log.severity === AuditSeverity.ERROR).length,
          warning: logs.filter(log => log.severity === AuditSeverity.WARNING).length,
          info: logs.filter(log => log.severity === AuditSeverity.INFO).length,
        },
        eventsByCategory: {
          auth: logs.filter(log => log.category === AuditCategory.AUTH).length,
          security: logs.filter(log => log.category === AuditCategory.SECURITY).length,
          admin: logs.filter(log => log.category === AuditCategory.ADMIN).length,
          dataAccess: logs.filter(log => log.category === AuditCategory.DATA_ACCESS).length,
          dataModification: logs.filter(log => log.category === AuditCategory.DATA_MODIFICATION).length,
          userManagement: logs.filter(log => log.category === AuditCategory.USER_MANAGEMENT).length,
          config: logs.filter(log => log.category === AuditCategory.CONFIG).length,
          integration: logs.filter(log => log.category === AuditCategory.INTEGRATION).length,
          tenant: logs.filter(log => log.category === AuditCategory.TENANT).length,
          system: logs.filter(log => log.category === AuditCategory.SYSTEM).length,
        },
        failedEvents: logs.filter(log => !log.success).length,
        successfulEvents: logs.filter(log => log.success).length,
        criticalEvents: logs.filter(log => log.severity === AuditSeverity.CRITICAL),
        topResourcesAccessed: this.getTopResources(logs),
        topUsers: this.getTopUsers(logs),
        // Include the first 100 detailed logs
        recentEvents: logs.slice(0, 100)
      };
      
      return summary;
    } catch (error) {
      console.error('Failed to generate security report:', error);
      return {
        error: 'Failed to generate security report',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the top resources accessed from audit logs
   * 
   * @param logs The audit logs to analyze
   * @returns The top resources accessed
   */
  private static getTopResources(logs: AuditLog[]): Array<{resourceType: string, count: number}> {
    const resourceCounts = new Map<string, number>();
    
    for (const log of logs) {
      const key = log.resourceType;
      resourceCounts.set(key, (resourceCounts.get(key) || 0) + 1);
    }
    
    return Array.from(resourceCounts.entries())
      .map(([resourceType, count]) => ({ resourceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Return top 10
  }

  /**
   * Get the top users from audit logs
   * 
   * @param logs The audit logs to analyze
   * @returns The top users
   */
  private static getTopUsers(logs: AuditLog[]): Array<{userId: number, count: number}> {
    const userCounts = new Map<number, number>();
    
    for (const log of logs) {
      const key = log.userId;
      userCounts.set(key, (userCounts.get(key) || 0) + 1);
    }
    
    return Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Return top 10
  }

  /**
   * Get the count of audit logs matching the given filters
   * 
   * @param filters Filter criteria
   * @returns Count of matching audit logs
   */
  static async count(filters: {
    userId?: number;
    tenantId?: number;
    action?: string;
    category?: AuditCategory;
    resourceType?: string;
    resourceId?: string | number;
    severity?: AuditSeverity;
    fromDate?: Date;
    toDate?: Date;
    success?: boolean;
    search?: string;
  }): Promise<number> {
    try {
      // Build the query conditions based on filters
      let query = db.select({ count: count() }).from(auditLogs);
      
      // Apply filters if provided
      if (filters.userId !== undefined) {
        query = query.where(eq(auditLogs.userId, filters.userId));
      }
      
      if (filters.tenantId !== undefined) {
        query = query.where(eq(auditLogs.tenantId, filters.tenantId));
      }
      
      if (filters.action) {
        query = query.where(eq(auditLogs.action, filters.action));
      }
      
      if (filters.category) {
        query = query.where(eq(auditLogs.category, filters.category));
      }
      
      if (filters.resourceType) {
        query = query.where(eq(auditLogs.resourceType, filters.resourceType));
      }
      
      if (filters.resourceId !== undefined) {
        query = query.where(eq(auditLogs.resourceId, filters.resourceId.toString()));
      }
      
      if (filters.severity) {
        query = query.where(eq(auditLogs.severity, filters.severity));
      }
      
      if (filters.success !== undefined) {
        query = query.where(eq(auditLogs.success, filters.success));
      }
      
      // Date range filters
      if (filters.fromDate) {
        query = query.where(gte(auditLogs.timestamp, filters.fromDate));
      }
      
      if (filters.toDate) {
        query = query.where(lte(auditLogs.timestamp, filters.toDate));
      }

      // Search filter (simplified implementation)
      if (filters.search) {
        // In a real implementation, you might use more sophisticated search like ILIKE or full-text search
        // This is a simplified version that just searches the description field
        query = query.where(
          sql`${auditLogs.description} ILIKE ${`%${filters.search}%`}`
        );
      }

      // Execute the count query
      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Failed to count audit logs:', error);
      return 0;
    }
  }

  /**
   * Get an audit log entry by ID
   * 
   * @param id The ID of the audit log entry
   * @returns The audit log entry or null if not found
   */
  static async getById(id: number): Promise<AuditLog | null> {
    try {
      const results = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Failed to get audit log with ID ${id}:`, error);
      return null;
    }
  }
}

/**
 * Standard audit actions for consistency across the application
 */
export const AuditActions = {
  AUTH: {
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILURE: 'auth.login.failure',
    LOGOUT: 'auth.logout',
    TOKEN_REFRESH: 'auth.token.refresh',
    PASSWORD_CHANGE: 'auth.password.change',
    PASSWORD_RESET: 'auth.password.reset',
    REGISTER: 'auth.register',
    MFA_SETUP: 'auth.mfa.setup',
    MFA_VERIFY: 'auth.mfa.verify',
    SSO_AUTHENTICATE: 'auth.sso.authenticate',
    SAML_AUTHENTICATE: 'auth.saml.authenticate',
    OAUTH_AUTHENTICATE: 'auth.oauth.authenticate',
  },
  USER: {
    CREATE: 'user.create',
    UPDATE: 'user.update',
    DELETE: 'user.delete',
    ROLE_CHANGE: 'user.role.change',
    PROFILE_UPDATE: 'user.profile.update',
    EMAIL_CHANGE: 'user.email.change',
    STATUS_CHANGE: 'user.status.change',
  },
  ADMIN: {
    USER_CREATE: 'admin.user.create',
    USER_UPDATE: 'admin.user.update',
    USER_DELETE: 'admin.user.delete',
    USER_IMPERSONATE: 'admin.user.impersonate',
    SETTING_UPDATE: 'admin.setting.update',
    FEATURE_TOGGLE: 'admin.feature.toggle',
    SYSTEM_CONFIG: 'admin.system.config',
    MAINTENANCE_MODE: 'admin.maintenance.toggle',
  },
  DATA: {
    CREATE: 'data.create',
    READ: 'data.read',
    UPDATE: 'data.update',
    DELETE: 'data.delete',
    EXPORT: 'data.export',
    IMPORT: 'data.import',
    SENSITIVE_ACCESS: 'data.sensitive.access',
    BULK_ACTION: 'data.bulk.action',
  },
  TENANT: {
    CREATE: 'tenant.create',
    UPDATE: 'tenant.update',
    DELETE: 'tenant.delete',
    STATUS_CHANGE: 'tenant.status.change',
    DOMAIN_CHANGE: 'tenant.domain.change',
    USER_ADD: 'tenant.user.add',
    USER_REMOVE: 'tenant.user.remove',
    SETTINGS_UPDATE: 'tenant.settings.update',
    FEATURE_TOGGLE: 'tenant.feature.toggle',
  },
  INTEGRATION: {
    CONNECT: 'integration.connect',
    DISCONNECT: 'integration.disconnect',
    TOKEN_REFRESH: 'integration.token.refresh',
    SYNC: 'integration.sync',
    CONFIG_UPDATE: 'integration.config.update',
    AUTH_FAILURE: 'integration.auth.failure',
  },
  SYSTEM: {
    STARTUP: 'system.startup',
    SHUTDOWN: 'system.shutdown',
    ERROR: 'system.error',
    BACKUP: 'system.backup',
    RESTORE: 'system.restore',
    MIGRATION: 'system.migration',
    CONFIG_CHANGE: 'system.config.change',
    SECURITY_EVENT: 'system.security.event',
    PERFORMANCE_ISSUE: 'system.performance.issue',
  },
};