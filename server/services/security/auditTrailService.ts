/**
 * Audit Trail Service
 * 
 * This service provides enterprise-grade audit trail capabilities for AI operations
 * and sensitive actions. It ensures that all operations can be tracked and reviewed
 * for compliance and governance purposes.
 * 
 * Features:
 * - Comprehensive audit logging of AI operations
 * - Tamper-evident audit trail
 * - Support for different audit detail levels
 * - Retention policy management
 * - Export capabilities for compliance reporting
 */

import crypto from 'crypto';
import { featureFlagService } from '../feature-flag';
import { FeatureFlags } from '../../../shared/feature-flags';
import { db } from '../../db';
import { auditLogger } from '../../utils/auditLogger';

// Types of audit events
export type AuditEventType = 
  | 'ai_request'
  | 'ai_response'
  | 'model_access'
  | 'data_access'
  | 'configuration_change'
  | 'security_event'
  | 'user_authentication'
  | 'admin_action'
  | 'data_export'
  | 'data_import';

// Audit detail levels
export type AuditDetailLevel = 'basic' | 'standard' | 'comprehensive';

// Audit event format
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: number;
  tenantId?: number;
  actionName: string;
  resourceType?: string;
  resourceId?: string;
  sourceIp?: string;
  userAgent?: string;
  success: boolean;
  details: Record<string, any>;
  previousHash?: string;
  hash?: string;
}

// Define audit trail configuration
interface AuditTrailConfig {
  detailLevel: AuditDetailLevel;
  retentionPeriodDays: number;
  captureInputOutput: boolean;
  captureModelMetadata: boolean;
  exportFormat: 'basic' | 'structured';
  enabled: boolean;
}

// Default configuration
const DEFAULT_CONFIG: AuditTrailConfig = {
  detailLevel: 'standard',
  retentionPeriodDays: 90,
  captureInputOutput: true,
  captureModelMetadata: true,
  exportFormat: 'structured',
  enabled: true
};

export class AuditTrailService {
  private config: AuditTrailConfig;
  private lastEventHash: string | null = null;
  private inMemoryAudits: AuditEvent[] = [];
  private persistenceReady = false;
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    // Set up persistence as soon as possible
    this.initializePersistence();
    console.log('Audit Trail Service initialized');
  }
  
  /**
   * Initialize persistence for audit events
   */
  private async initializePersistence(): Promise<void> {
    try {
      // In a real implementation, this would create/verify the audit tables
      // For now, we'll just set a flag that persistence is ready
      this.persistenceReady = true;
      
      // Log the initialization
      auditLogger.log({
        action: 'audit_trail_initialized',
        actor: 'system',
        target: 'audit_system',
        details: {
          detailLevel: this.config.detailLevel,
          retentionPeriodDays: this.config.retentionPeriodDays
        }
      });
    } catch (error) {
      console.error('Failed to initialize audit trail persistence:', error);
      
      // Log the failure
      auditLogger.log({
        action: 'audit_trail_initialization_failed',
        actor: 'system',
        target: 'audit_system',
        details: { error: String(error) }
      });
    }
  }
  
  /**
   * Update the audit trail configuration
   */
  public updateConfig(config: Partial<AuditTrailConfig>): AuditTrailConfig {
    this.config = { ...this.config, ...config };
    
    // Log the configuration change
    auditLogger.log({
      action: 'audit_config_updated',
      actor: 'system',
      target: 'audit_system',
      details: { newConfig: this.config }
    });
    
    return { ...this.config };
  }
  
  /**
   * Get the current audit trail configuration
   */
  public getConfig(): AuditTrailConfig {
    return { ...this.config };
  }
  
  /**
   * Record an audit event
   */
  public async recordEvent(event: Omit<AuditEvent, 'id' | 'hash' | 'previousHash' | 'timestamp'>): Promise<string> {
    // Check if audit trail is enabled
    if (!this.isAuditTrailEnabled()) {
      return 'audit_disabled';
    }
    
    // Generate event ID
    const eventId = crypto.randomUUID();
    const timestamp = new Date();
    
    // Create the complete audit event
    const auditEvent: AuditEvent = {
      id: eventId,
      timestamp,
      ...event,
      previousHash: this.lastEventHash || '',
      hash: '' // Will be calculated after
    };
    
    // Calculate the hash for this event (including the previous hash for tamper evidence)
    auditEvent.hash = this.calculateEventHash(auditEvent);
    
    // Store the event
    await this.storeEvent(auditEvent);
    
    // Update the last event hash
    this.lastEventHash = auditEvent.hash;
    
    return eventId;
  }
  
  /**
   * Record an AI model usage event
   */
  public async recordModelUsage(
    userId: number,
    tenantId: number,
    modelId: string,
    modelVersion: string,
    operation: string,
    input: any,
    output: any,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<string> {
    // Filter input/output based on configuration
    const filteredInput = this.config.captureInputOutput ? input : '[REDACTED]';
    const filteredOutput = this.config.captureInputOutput ? output : '[REDACTED]';
    
    // Create details object based on detail level
    let details: Record<string, any> = {
      operation,
      success
    };
    
    // Add model metadata if configured
    if (this.config.captureModelMetadata) {
      details.model = {
        id: modelId,
        version: modelVersion
      };
    }
    
    // Add additional details based on detail level
    if (this.config.detailLevel !== 'basic') {
      details.input = filteredInput;
      details.output = filteredOutput;
    }
    
    // For comprehensive detail level, include all metadata
    if (this.config.detailLevel === 'comprehensive' && metadata) {
      details = { ...details, ...metadata };
    }
    
    // Record the event
    return this.recordEvent({
      eventType: 'ai_request',
      userId,
      tenantId,
      actionName: 'model_usage',
      resourceType: 'ai_model',
      resourceId: modelId,
      success,
      details
    });
  }
  
  /**
   * Calculate a hash for an audit event
   */
  private calculateEventHash(event: AuditEvent): string {
    // Create a string representation of the event without the hash
    const { hash, ...eventWithoutHash } = event;
    const eventString = JSON.stringify(eventWithoutHash);
    
    // Calculate SHA-256 hash
    return crypto
      .createHash('sha256')
      .update(eventString)
      .digest('hex');
  }
  
  /**
   * Store an audit event
   */
  private async storeEvent(event: AuditEvent): Promise<void> {
    // Keep in memory
    this.inMemoryAudits.push(event);
    
    // Limit in-memory storage
    if (this.inMemoryAudits.length > 1000) {
      this.inMemoryAudits = this.inMemoryAudits.slice(-1000);
    }
    
    // If persistence is ready, store to database
    if (this.persistenceReady) {
      try {
        // In a real implementation, this would store to the database
        // For now, we'll just log it
        console.log(`Audit event recorded: ${event.id}`);
      } catch (error) {
        console.error('Failed to persist audit event:', error);
      }
    }
  }
  
  /**
   * Search for audit events matching criteria
   */
  public async searchEvents(
    criteria: {
      eventTypes?: AuditEventType[];
      userId?: number;
      tenantId?: number;
      actionName?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    },
    pagination: { page: number; pageSize: number }
  ): Promise<{ events: AuditEvent[]; total: number }> {
    // Check if audit trail is enabled
    if (!this.isAuditTrailEnabled()) {
      return { events: [], total: 0 };
    }
    
    // In a real implementation, this would query the database
    // For now, we'll search the in-memory events
    
    // Filter events based on criteria
    let filteredEvents = [...this.inMemoryAudits];
    
    if (criteria.eventTypes && criteria.eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(e => criteria.eventTypes!.includes(e.eventType));
    }
    
    if (criteria.userId !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.userId === criteria.userId);
    }
    
    if (criteria.tenantId !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.tenantId === criteria.tenantId);
    }
    
    if (criteria.actionName) {
      filteredEvents = filteredEvents.filter(e => e.actionName === criteria.actionName);
    }
    
    if (criteria.resourceType) {
      filteredEvents = filteredEvents.filter(e => e.resourceType === criteria.resourceType);
    }
    
    if (criteria.resourceId) {
      filteredEvents = filteredEvents.filter(e => e.resourceId === criteria.resourceId);
    }
    
    if (criteria.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= criteria.startDate!);
    }
    
    if (criteria.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= criteria.endDate!);
    }
    
    if (criteria.success !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.success === criteria.success);
    }
    
    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Paginate
    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const paginatedEvents = filteredEvents.slice(start, end);
    
    return {
      events: paginatedEvents,
      total: filteredEvents.length
    };
  }
  
  /**
   * Export audit events to a format suitable for compliance reporting
   */
  public async exportEvents(
    criteria: {
      eventTypes?: AuditEventType[];
      startDate: Date;
      endDate: Date;
      tenantId?: number;
    },
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    // Check if audit trail is enabled
    if (!this.isAuditTrailEnabled()) {
      return '[]';
    }
    
    // Search for events matching criteria
    const { events } = await this.searchEvents(criteria, { page: 0, pageSize: 10000 });
    
    // Return formatted output
    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    } else {
      // CSV format
      const headers = 'id,timestamp,eventType,userId,tenantId,actionName,resourceType,resourceId,success\n';
      const rows = events.map(e => 
        `${e.id},${e.timestamp.toISOString()},${e.eventType},${e.userId || ''},${e.tenantId || ''},${e.actionName},${e.resourceType || ''},${e.resourceId || ''},${e.success}`
      ).join('\n');
      
      return headers + rows;
    }
  }
  
  /**
   * Verify the integrity of the audit trail
   */
  public async verifyIntegrity(): Promise<{ valid: boolean; issues: any[] }> {
    // Check if audit trail is enabled
    if (!this.isAuditTrailEnabled()) {
      return { valid: false, issues: [{ message: 'Audit trail is disabled' }] };
    }
    
    const issues: any[] = [];
    let lastHash: string | null = null;
    
    // In a real implementation, this would load events from the database in chunks
    // For now, we'll verify the in-memory events
    
    // Sort events by timestamp (oldest first)
    const sortedEvents = [...this.inMemoryAudits].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    for (const event of sortedEvents) {
      // Check if previous hash matches
      if (lastHash !== null && event.previousHash !== lastHash) {
        issues.push({
          eventId: event.id,
          timestamp: event.timestamp,
          message: 'Previous hash mismatch',
          expected: lastHash,
          actual: event.previousHash
        });
      }
      
      // Verify the hash of this event
      const calculatedHash = this.calculateEventHash(event);
      if (calculatedHash !== event.hash) {
        issues.push({
          eventId: event.id,
          timestamp: event.timestamp,
          message: 'Event hash mismatch',
          expected: calculatedHash,
          actual: event.hash
        });
      }
      
      // Update last hash
      lastHash = event.hash;
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Check if audit trail is enabled
   */
  private isAuditTrailEnabled(): boolean {
    return (
      this.config.enabled && 
      featureFlagService.isEnabled(FeatureFlags.AUDIT_TRAIL)
    );
  }
  
  /**
   * Clean up old audit records based on retention policy
   */
  public async cleanupOldRecords(): Promise<number> {
    // Check if audit trail is enabled
    if (!this.isAuditTrailEnabled()) {
      return 0;
    }
    
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.retentionPeriodDays);
    
    // In a real implementation, this would delete from the database
    // For now, we'll just clean up the in-memory events
    
    const initialCount = this.inMemoryAudits.length;
    this.inMemoryAudits = this.inMemoryAudits.filter(
      e => e.timestamp > retentionDate
    );
    
    const deletedCount = initialCount - this.inMemoryAudits.length;
    
    // Log the cleanup
    if (deletedCount > 0) {
      auditLogger.log({
        action: 'audit_records_cleanup',
        actor: 'system',
        target: 'audit_system',
        details: {
          deletedCount,
          retentionPeriodDays: this.config.retentionPeriodDays,
          retentionDate: retentionDate.toISOString()
        }
      });
    }
    
    return deletedCount;
  }
}

// Create and export a singleton instance
export const auditTrailService = new AuditTrailService();