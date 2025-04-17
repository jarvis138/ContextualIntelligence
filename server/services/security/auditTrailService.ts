/**
 * Audit Trail Service
 * 
 * This service provides comprehensive audit trail capabilities for tracking user 
 * and system actions, ensuring regulatory compliance, and supporting security 
 * investigations.
 */

// Core imports
import { FeatureFlags } from '../../../shared/feature-flags';
import { featureFlagService } from '../feature-flag';
import { db } from '../../db';
import { encryptionService, KeyScope, EncryptionMode } from './encryptionService';
import { auditLogger } from '../../utils/auditLogger';

// Define audit categories
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  ADMIN_ACTION = 'admin_action',
  SYSTEM = 'system',
  SECURITY = 'security',
  PAYMENT = 'payment',
  API = 'api',
  USER = 'user',
  INTEGRATION = 'integration'
}

// Define audit severity levels
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Define the audit record interface
export interface AuditRecord {
  id?: number;
  timestamp: Date;
  userId: number | string | null;
  tenantId: number | null;
  action: string;
  category: AuditCategory;
  resourceType: string;
  resourceId: string | number | null;
  ipAddress: string | null;
  userAgent: string | null;
  description: string;
  details: Record<string, any>;
  severity: AuditSeverity;
  success: boolean;
  encrypted: boolean;
  sessionId: string | null;
  requestId: string | null;
}

// Define audit trail options
export interface AuditTrailOptions {
  retentionPeriodDays?: number;
  encryptDetails?: boolean;
  encryptionScope?: KeyScope;
  includeUserAgent?: boolean;
  serverSideOnly?: boolean;
  includeSessionData?: boolean;
  redactSensitiveData?: boolean;
  includeStackTrace?: boolean;
}

// Default constants
const DEFAULT_RETENTION_DAYS = 90;
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'key',
  'secret',
  'credential',
  'access_token',
  'refresh_token',
  'auth',
  'authorization',
  'sessionId',
  'ssn',
  'creditCard',
  'cvv',
  'social_security',
  'private_key',
  'otp'
];

class AuditTrailService {
  private defaultOptions: AuditTrailOptions = {
    retentionPeriodDays: DEFAULT_RETENTION_DAYS,
    encryptDetails: true,
    encryptionScope: KeyScope.TENANT,
    includeUserAgent: true,
    serverSideOnly: false,
    includeSessionData: true,
    redactSensitiveData: true,
    includeStackTrace: false
  };
  
  constructor() {
    console.log('Audit Trail Service initialized');
    
    // Set up any scheduled tasks (e.g., purging old records)
    // In a real implementation, we would use a scheduler like node-cron
  }
  
  /**
   * Record an audit trail event
   */
  public async record(auditRecord: Omit<AuditRecord, 'id' | 'timestamp' | 'encrypted'>, options?: Partial<AuditTrailOptions>): Promise<number | null> {
    // Only record if auditing is enabled
    if (!featureFlagService.isEnabled(FeatureFlags.AUDITING)) {
      return null;
    }
    
    // Merge options with defaults
    const mergedOptions: AuditTrailOptions = {
      ...this.defaultOptions,
      ...options
    };
    
    // Create a complete audit record
    const fullRecord: AuditRecord = {
      ...auditRecord,
      timestamp: new Date(),
      encrypted: mergedOptions.encryptDetails ?? this.defaultOptions.encryptDetails!
    };
    
    // Redact sensitive data if needed
    if (mergedOptions.redactSensitiveData && fullRecord.details) {
      fullRecord.details = this.redactSensitiveData(fullRecord.details);
    }
    
    // Encrypt details if needed
    let encryptedDetails = null;
    if (mergedOptions.encryptDetails && fullRecord.details) {
      try {
        const encryptedData = encryptionService.encrypt(
          fullRecord.details,
          EncryptionMode.DATABASE,
          mergedOptions.encryptionScope ?? KeyScope.TENANT,
          fullRecord.tenantId?.toString()
        );
        encryptedDetails = JSON.stringify(encryptedData);
        
        // Replace the details with a placeholder in the original record
        fullRecord.details = { __encrypted: true };
      } catch (error) {
        console.error('Failed to encrypt audit details:', error);
        // Continue with unencrypted details if encryption fails
        fullRecord.encrypted = false;
      }
    }
    
    // In a real implementation, we would store this record in the database
    // For now, we'll just log it and return a mock ID
    
    console.log(`AUDIT [${fullRecord.severity}]: ${fullRecord.action} by ${fullRecord.userId || 'system'} on ${fullRecord.resourceType}:${fullRecord.resourceId || 'unknown'}`);
    
    // Use the existing auditLogger to log the simplified record
    auditLogger.log({
      action: fullRecord.action,
      actor: fullRecord.userId?.toString() || 'system',
      target: `${fullRecord.resourceType}:${fullRecord.resourceId || 'unknown'}`,
      targetType: fullRecord.resourceType,
      severity: fullRecord.severity,
      success: fullRecord.success,
      tenant: fullRecord.tenantId?.toString(),
      ipAddress: fullRecord.ipAddress || undefined,
      details: fullRecord.encrypted ? { __encrypted: true } : fullRecord.details,
      sessionId: fullRecord.sessionId || undefined,
      requestId: fullRecord.requestId || undefined
    });
    
    // Store in database (would be implemented in a real system)
    // Here we'd use the encrypted details if we encrypted them
    
    // Return a mock ID for now
    return Date.now();
  }
  
  /**
   * Query audit records with filtering
   */
  public async query(
    filters: {
      tenantId?: number;
      userId?: number | string;
      category?: AuditCategory;
      action?: string;
      resourceType?: string;
      resourceId?: string | number;
      severity?: AuditSeverity;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
      includeDetails?: boolean;
    },
    pagination: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    records: AuditRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    // In a real implementation, we would query the database
    // For now, return an empty array
    
    return {
      records: [],
      total: 0,
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 10,
      totalPages: 0
    };
  }
  
  /**
   * Retrieve a single audit record by ID
   */
  public async getById(id: number, tenantId?: number): Promise<AuditRecord | null> {
    // In a real implementation, we would query the database
    // For now, return null
    return null;
  }
  
  /**
   * Export audit records to a specified format
   */
  public async exportRecords(
    format: 'csv' | 'json' | 'pdf',
    filters: {
      tenantId?: number;
      category?: AuditCategory;
      startDate: Date;
      endDate: Date;
      includeDetails?: boolean;
    }
  ): Promise<{ data: any; filename: string }> {
    // In a real implementation, we would export the records
    // For now, return empty data
    
    const filename = `audit_export_${new Date().toISOString().replace(/:/g, '-')}.${format}`;
    
    return {
      data: format === 'json' ? '[]' : '',
      filename
    };
  }
  
  /**
   * Purge old audit records based on retention policy
   */
  public async purgeOldRecords(retentionPeriodDays: number = DEFAULT_RETENTION_DAYS): Promise<number> {
    if (!featureFlagService.isEnabled(FeatureFlags.AUDITING)) {
      return 0;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPeriodDays);
    
    // In a real implementation, we would delete old records from the database
    // For now, log the action and return 0
    
    console.log(`Purging audit records older than ${cutoffDate.toISOString()}`);
    
    return 0;
  }
  
  /**
   * Redact sensitive data from audit details
   */
  private redactSensitiveData(details: Record<string, any>): Record<string, any> {
    if (!details || typeof details !== 'object') {
      return details;
    }
    
    const redactedDetails = { ...details };
    
    // Redact sensitive fields recursively
    this.redactRecursive(redactedDetails, SENSITIVE_FIELDS);
    
    return redactedDetails;
  }
  
  /**
   * Recursively search and redact sensitive data
   */
  private redactRecursive(obj: any, sensitiveFields: string[]): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    for (const key of Object.keys(obj)) {
      const lcKey = key.toLowerCase();
      
      // Check if this field should be redacted
      const shouldRedact = sensitiveFields.some(field => lcKey.includes(field.toLowerCase()));
      
      if (shouldRedact && typeof obj[key] !== 'object') {
        // Redact the value
        if (typeof obj[key] === 'string') {
          obj[key] = '********';
        } else if (typeof obj[key] === 'number') {
          obj[key] = 0;
        } else if (typeof obj[key] === 'boolean') {
          obj[key] = false;
        }
      } else if (obj[key] && typeof obj[key] === 'object') {
        // Recursively check nested objects
        this.redactRecursive(obj[key], sensitiveFields);
      }
    }
  }
  
  /**
   * Apply customized retention policy based on regulatory requirements
   */
  public async applyCustomRetentionPolicy(
    categories: AuditCategory[],
    retentionPeriodDays: number
  ): Promise<number> {
    if (!featureFlagService.isEnabled(FeatureFlags.AUDITING)) {
      return 0;
    }
    
    // In a real implementation, we would apply a custom retention policy to specific categories
    // For now, log the action and return 0
    
    console.log(`Applying custom retention policy of ${retentionPeriodDays} days to categories: ${categories.join(', ')}`);
    
    return 0;
  }
  
  /**
   * Generate a compliance report for regulatory purposes
   */
  public async generateComplianceReport(
    regulationType: 'GDPR' | 'HIPAA' | 'SOC2' | 'PCI',
    startDate: Date,
    endDate: Date
  ): Promise<{ reportData: any; reportFile: string }> {
    // In a real implementation, we would generate a compliance report
    // For now, log the action and return empty data
    
    console.log(`Generating ${regulationType} compliance report from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    return {
      reportData: {},
      reportFile: `${regulationType.toLowerCase()}_report_${new Date().toISOString().replace(/:/g, '-')}.pdf`
    };
  }
  
  /**
   * Set up real-time alerts for specific audit events
   */
  public async configureAlerts(
    alertConfig: {
      name: string;
      description: string;
      category: AuditCategory;
      severity: AuditSeverity;
      actions: string[];
      notifyEmail?: string[];
      notifyWebhook?: string;
    }
  ): Promise<{ id: string }> {
    // In a real implementation, we would configure real-time alerts
    // For now, log the action and return a mock ID
    
    console.log(`Configuring audit alert for ${alertConfig.category} events with ${alertConfig.severity} severity`);
    
    return {
      id: `alert_${Date.now()}`
    };
  }
  
  /**
   * Log authentication events
   */
  public async logAuthEvent(
    userId: string | number,
    action: 'login' | 'logout' | 'login_failed' | 'password_change' | 'password_reset' | 'mfa' | 'token_issue',
    success: boolean,
    resourceId: string | number | null = null,
    description: string = '',
    details: Record<string, any> = {},
    ipAddress: string | null = null,
    userAgent: string | null = null,
    tenantId: number | null = null,
    sessionId: string | null = null
  ): Promise<number | null> {
    return this.record({
      userId,
      tenantId,
      action: `auth_${action}`,
      category: AuditCategory.AUTHENTICATION,
      resourceType: 'user',
      resourceId: resourceId || userId.toString(),
      ipAddress,
      userAgent,
      description: description || `Authentication ${action} ${success ? 'successful' : 'failed'}`,
      details,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      success,
      sessionId,
      requestId: null
    });
  }
  
  /**
   * Log data access events
   */
  public async logDataAccess(
    userId: string | number,
    resourceType: string,
    resourceId: string | number | null,
    action: 'read' | 'list' | 'search' | 'export',
    description: string = '',
    details: Record<string, any> = {},
    ipAddress: string | null = null,
    userAgent: string | null = null,
    tenantId: number | null = null,
    sessionId: string | null = null
  ): Promise<number | null> {
    return this.record({
      userId,
      tenantId,
      action: `data_${action}`,
      category: AuditCategory.DATA_ACCESS,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      description: description || `Data ${action} on ${resourceType}${resourceId ? `:${resourceId}` : ''}`,
      details,
      severity: AuditSeverity.INFO,
      success: true,
      sessionId,
      requestId: null
    });
  }
  
  /**
   * Log data modification events
   */
  public async logDataModification(
    userId: string | number,
    resourceType: string,
    resourceId: string | number | null,
    action: 'create' | 'update' | 'delete' | 'restore' | 'archive',
    success: boolean = true,
    description: string = '',
    details: Record<string, any> = {},
    ipAddress: string | null = null,
    userAgent: string | null = null,
    tenantId: number | null = null,
    sessionId: string | null = null
  ): Promise<number | null> {
    return this.record({
      userId,
      tenantId,
      action: `data_${action}`,
      category: AuditCategory.DATA_MODIFICATION,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      description: description || `Data ${action} on ${resourceType}${resourceId ? `:${resourceId}` : ''}`,
      details,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      success,
      sessionId,
      requestId: null
    });
  }
  
  /**
   * Log admin actions
   */
  public async logAdminAction(
    userId: string | number,
    resourceType: string,
    resourceId: string | number | null,
    action: string,
    success: boolean = true,
    description: string = '',
    details: Record<string, any> = {},
    ipAddress: string | null = null,
    userAgent: string | null = null,
    tenantId: number | null = null,
    sessionId: string | null = null
  ): Promise<number | null> {
    return this.record({
      userId,
      tenantId,
      action: `admin_${action}`,
      category: AuditCategory.ADMIN_ACTION,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      description: description || `Admin ${action} on ${resourceType}${resourceId ? `:${resourceId}` : ''}`,
      details,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      success,
      sessionId,
      requestId: null
    });
  }
  
  /**
   * Log security events
   */
  public async logSecurityEvent(
    action: string,
    severity: AuditSeverity,
    userId: string | number | null,
    resourceType: string,
    resourceId: string | number | null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    details: Record<string, any> = {},
    tenantId: number | null = null,
    sessionId: string | null = null
  ): Promise<number | null> {
    return this.record({
      userId,
      tenantId,
      action: `security_${action}`,
      category: AuditCategory.SECURITY,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      description: `Security event: ${action} on ${resourceType}${resourceId ? `:${resourceId}` : ''}`,
      details,
      severity,
      success: severity !== AuditSeverity.ERROR && severity !== AuditSeverity.CRITICAL,
      sessionId,
      requestId: null
    });
  }
  
  /**
   * Log system events
   */
  public async logSystemEvent(
    action: string,
    resourceType: string,
    resourceId: string | number | null = null,
    details: Record<string, any> = {},
    severity: AuditSeverity = AuditSeverity.INFO,
    tenantId: number | null = null
  ): Promise<number | null> {
    return this.record({
      userId: 'system',
      tenantId,
      action: `system_${action}`,
      category: AuditCategory.SYSTEM,
      resourceType,
      resourceId,
      ipAddress: null,
      userAgent: null,
      description: `System event: ${action} on ${resourceType}${resourceId ? `:${resourceId}` : ''}`,
      details,
      severity,
      success: severity !== AuditSeverity.ERROR && severity !== AuditSeverity.CRITICAL,
      sessionId: null,
      requestId: null
    });
  }
}

// Create and export the singleton instance
export const auditTrailService = new AuditTrailService();