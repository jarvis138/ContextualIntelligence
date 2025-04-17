/**
 * Audit Logger
 * 
 * This utility provides audit logging functionality for enterprise security
 * and compliance requirements, including detailed event recording and exportable logs.
 */

// Core imports
import fs from 'fs';
import path from 'path';
import { FeatureFlags } from '../../shared/feature-flags';
import { featureFlagService } from '../services/feature-flag';

// Define event types and interfaces
export interface AuditLogEvent {
  // Action that was performed
  action: string;
  
  // Actor who performed the action (user ID, system, etc.)
  actor: string;
  
  // Target of the action (e.g., "user:123", "document:456", "feature:xyz")
  target: string;
  
  // Type of target (e.g., "user", "document", "feature_flag")
  targetType: string;
  
  // Tenant context, if applicable
  tenant?: string;
  
  // IP address, if available
  ipAddress?: string;
  
  // Additional details about the action
  details?: Record<string, any>;
  
  // Severity level (default is 'info')
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  
  // Success status
  success?: boolean;
  
  // Optional session ID for correlation
  sessionId?: string;
  
  // Optional request ID for correlation
  requestId?: string;
}

// Define log storage location
const LOG_DIR = process.env.AUDIT_LOG_DIR || './logs/audit';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

class AuditLogger {
  private logStream: fs.WriteStream | null = null;
  private currentLogFile: string = '';
  
  constructor() {
    this.initializeLogDirectory();
    this.rotateLogsIfNeeded();
    this.openLogStream();
    
    // Handle process exit to properly close the stream
    process.on('exit', () => this.closeLogStream());
  }
  
  /**
   * Initialize log directory if it doesn't exist
   */
  private initializeLogDirectory(): void {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }
  
  /**
   * Open log stream for writing
   */
  private openLogStream(): void {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const logFileName = `audit-${timestamp}.log`;
    this.currentLogFile = path.join(LOG_DIR, logFileName);
    
    this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    this.logStream.on('error', (err) => {
      console.error('Error writing to audit log:', err);
    });
  }
  
  /**
   * Close log stream
   */
  private closeLogStream(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
  
  /**
   * Rotate logs if needed based on size
   */
  private rotateLogsIfNeeded(): void {
    try {
      // Get log files
      const logFiles = fs.readdirSync(LOG_DIR)
        .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
        .map(file => path.join(LOG_DIR, file))
        .filter(file => fs.statSync(file).isFile());
      
      // Sort by modification time (oldest first)
      logFiles.sort((a, b) => {
        return fs.statSync(a).mtime.getTime() - fs.statSync(b).mtime.getTime();
      });
      
      // Delete oldest logs if we have too many
      while (logFiles.length >= MAX_LOG_FILES) {
        const oldestLog = logFiles.shift();
        if (oldestLog) {
          fs.unlinkSync(oldestLog);
        }
      }
      
      // Check current log size and rotate if needed
      if (this.currentLogFile && fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size >= MAX_LOG_SIZE) {
          this.closeLogStream();
          this.openLogStream();
        }
      }
    } catch (error) {
      console.error('Error rotating audit logs:', error);
    }
  }
  
  /**
   * Log an audit event
   */
  public async log(event: AuditLogEvent): Promise<void> {
    // Make sure required fields are present
    if (!event.action || !event.actor || !event.target || !event.targetType) {
      console.error('Invalid audit event - missing required fields');
      return;
    }
    
    // Add timestamp and format log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
      // Set defaults for optional fields
      severity: event.severity || 'info',
      success: event.success === undefined ? true : event.success,
    };
    
    // Write to log file if auditing is enabled
    if (featureFlagService.isEnabled(FeatureFlags.AUDITING)) {
      try {
        this.rotateLogsIfNeeded();
        
        if (this.logStream) {
          this.logStream.write(JSON.stringify(logEntry) + '\n');
        }
        
        // Store in database (would be implemented in a real system)
        await this.storeAuditLog(logEntry);
      } catch (error) {
        console.error('Failed to write audit log:', error);
      }
    }
    
    // Always log critical events to console regardless of audit settings
    if (event.severity === 'critical' || event.severity === 'error') {
      console.error(`AUDIT [${logEntry.severity}]: ${logEntry.action} by ${logEntry.actor} on ${logEntry.target}`);
    } else if (process.env.NODE_ENV === 'development') {
      // In development, log all events to console
      console.log(`AUDIT [${logEntry.severity}]: ${logEntry.action} by ${logEntry.actor} on ${logEntry.target}`);
    }
  }
  
  /**
   * Store audit log in database
   */
  private async storeAuditLog(logData: {
    timestamp: Date;
    action: string;
    actor: string;
    target: string;
    targetType: string;
    tenant?: string;
    severity?: string;
    details?: Record<string, any>;
    success?: boolean;
  }): Promise<void> {
    // In a real implementation, this would store the log in a database
    // For now, we'll just pretend we've stored it
    return Promise.resolve();
  }
  
  /**
   * Log user activity
   */
  public logUserActivity(
    userId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: Record<string, any>,
    tenant?: string,
    ipAddress?: string
  ): void {
    this.log({
      action,
      actor: userId,
      target: `${targetType}:${targetId}`,
      targetType,
      tenant,
      ipAddress,
      details,
      severity: 'info'
    });
  }
  
  /**
   * Log security events
   */
  public logSecurityEvent(
    action: string,
    actor: string,
    targetType: string,
    targetId: string,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'warning',
    details?: Record<string, any>,
    tenant?: string,
    ipAddress?: string
  ): void {
    this.log({
      action: `security_${action}`,
      actor,
      target: `${targetType}:${targetId}`,
      targetType,
      tenant,
      ipAddress,
      details,
      severity
    });
  }
  
  /**
   * Log data access
   */
  public logDataAccess(
    userId: string,
    targetType: string,
    targetId: string,
    accessType: 'read' | 'list' | 'query' | 'export',
    details?: Record<string, any>,
    tenant?: string,
    ipAddress?: string
  ): void {
    this.log({
      action: `data_${accessType}`,
      actor: userId,
      target: `${targetType}:${targetId}`,
      targetType,
      tenant,
      ipAddress,
      details,
      severity: 'info'
    });
  }
  
  /**
   * Log administrative actions
   */
  public logAdminAction(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: Record<string, any>,
    tenant?: string,
    ipAddress?: string
  ): void {
    this.log({
      action: `admin_${action}`,
      actor: adminId,
      target: `${targetType}:${targetId}`,
      targetType,
      tenant,
      ipAddress,
      details,
      severity: 'warning'
    });
  }
  
  /**
   * Log API usage
   */
  public logApiUsage(
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    details?: Record<string, any>,
    tenant?: string,
    ipAddress?: string
  ): void {
    this.log({
      action: 'api_request',
      actor: userId,
      target: endpoint,
      targetType: 'api_endpoint',
      tenant,
      ipAddress,
      details: {
        method,
        statusCode,
        responseTime,
        ...details
      },
      severity: statusCode >= 400 ? 'warning' : 'info',
      success: statusCode < 400
    });
  }
  
  /**
   * Log authentication events
   */
  public logAuthEvent(
    userId: string,
    action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'mfa_verified' | 'token_issued',
    success: boolean,
    details?: Record<string, any>,
    tenant?: string,
    ipAddress?: string
  ): void {
    this.log({
      action: `auth_${action}`,
      actor: userId,
      target: `user:${userId}`,
      targetType: 'user',
      tenant,
      ipAddress,
      details,
      severity: success ? 'info' : 'warning',
      success
    });
  }
  
  /**
   * Log system events
   */
  public logSystemEvent(
    action: string,
    details?: Record<string, any>,
    severity: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): void {
    this.log({
      action: `system_${action}`,
      actor: 'system',
      target: 'system',
      targetType: 'system',
      details,
      severity
    });
  }
}

// Create and export the singleton instance
export const auditLogger = new AuditLogger();