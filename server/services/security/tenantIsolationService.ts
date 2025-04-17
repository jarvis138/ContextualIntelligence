/**
 * Tenant Isolation Service
 * 
 * This service provides enterprise-grade multi-tenant isolation capabilities
 * for AI processing and data. It ensures that data and processing resources
 * are properly segregated between different tenants.
 * 
 * Features:
 * - Strict tenant isolation for data and processing
 * - Support for dedicated resources per tenant
 * - Tenant-specific configuration management
 * - Validation of cross-tenant data access
 */

import { featureFlagService } from '../feature-flag';
import { FeatureFlags } from '../../../shared/feature-flags';
import { auditLogger } from '../../utils/auditLogger';

// Isolation levels
export type IsolationLevel = 'basic' | 'standard' | 'strict';

// Tenant isolation configuration
interface TenantIsolationConfig {
  isolationLevel: IsolationLevel;
  dedicatedResources: boolean;
  separateProcessingQueues: boolean;
  separateModelInstances: boolean;
  dataPartitioning: 'logical' | 'physical';
  encryptionEnabled: boolean;
  accessControlEnabled: boolean;
}

// Default isolation configuration
const DEFAULT_CONFIG: TenantIsolationConfig = {
  isolationLevel: 'standard',
  dedicatedResources: false,
  separateProcessingQueues: true,
  separateModelInstances: false,
  dataPartitioning: 'logical',
  encryptionEnabled: true,
  accessControlEnabled: true
};

export class TenantIsolationService {
  private tenantConfigs: Map<number, TenantIsolationConfig> = new Map();
  private activeIsolationContexts: Map<string, { tenantId: number, timestamp: Date }> = new Map();
  
  constructor() {
    console.log('Tenant Isolation Service initialized');
  }
  
  /**
   * Get isolation configuration for a tenant
   */
  public getTenantConfig(tenantId: number): TenantIsolationConfig {
    // If there's no specific configuration for this tenant, use the default
    if (!this.tenantConfigs.has(tenantId)) {
      return { ...DEFAULT_CONFIG };
    }
    
    return { ...this.tenantConfigs.get(tenantId)! };
  }
  
  /**
   * Configure isolation settings for a specific tenant
   */
  public configureTenant(tenantId: number, config: Partial<TenantIsolationConfig>): TenantIsolationConfig {
    const currentConfig = this.getTenantConfig(tenantId);
    const newConfig = { ...currentConfig, ...config };
    
    this.tenantConfigs.set(tenantId, newConfig);
    
    // Log the configuration change
    auditLogger.log({
      action: 'tenant_isolation_configured',
      actor: 'system', // This would normally be an admin or system ID
      target: `tenant:${tenantId}`,
      targetType: 'tenant',
      details: {
        isolationLevel: newConfig.isolationLevel,
        dedicatedResources: newConfig.dedicatedResources,
        separateProcessingQueues: newConfig.separateProcessingQueues
      }
    });
    
    return newConfig;
  }
  
  /**
   * Begin a tenant-isolated execution context
   * This should be called at the beginning of any operation that processes tenant data
   */
  public beginIsolatedContext(contextId: string, tenantId: number): boolean {
    if (!this.isTenantIsolationEnabled()) {
      return true; // No isolation enforcement
    }
    
    // Check if this context is already being used by another tenant
    if (this.activeIsolationContexts.has(contextId)) {
      const existingContext = this.activeIsolationContexts.get(contextId)!;
      
      // If the context is being reused by the same tenant, that's fine
      if (existingContext.tenantId === tenantId) {
        return true;
      }
      
      // Log the isolation breach attempt
      auditLogger.log({
        action: 'tenant_isolation_breach_attempt',
        actor: 'system',
        target: `tenant:${tenantId}`,
        targetType: 'tenant',
        details: {
          contextId,
          existingTenantId: existingContext.tenantId,
          requestingTenantId: tenantId
        }
      });
      
      return false; // Reject the context switch
    }
    
    // Register the new isolation context
    this.activeIsolationContexts.set(contextId, {
      tenantId,
      timestamp: new Date()
    });
    
    return true;
  }
  
  /**
   * End a tenant-isolated execution context
   */
  public endIsolatedContext(contextId: string): void {
    this.activeIsolationContexts.delete(contextId);
  }
  
  /**
   * Validate that the current context belongs to the expected tenant
   */
  public validateTenantContext(contextId: string, tenantId: number): boolean {
    if (!this.isTenantIsolationEnabled()) {
      return true; // No isolation enforcement
    }
    
    // If the context isn't registered, that's a problem
    if (!this.activeIsolationContexts.has(contextId)) {
      // Log the missing context
      auditLogger.log({
        action: 'tenant_isolation_context_missing',
        actor: 'system',
        target: `tenant:${tenantId}`,
        targetType: 'tenant',
        details: {
          contextId,
          requestingTenantId: tenantId
        }
      });
      
      return false;
    }
    
    const existingContext = this.activeIsolationContexts.get(contextId)!;
    
    // Check if the tenant matches
    if (existingContext.tenantId !== tenantId) {
      // Log the isolation breach attempt
      auditLogger.log({
        action: 'tenant_isolation_breach_attempt',
        actor: 'system',
        target: `tenant:${tenantId}`,
        targetType: 'tenant',
        details: {
          contextId,
          existingTenantId: existingContext.tenantId,
          requestingTenantId: tenantId
        }
      });
      
      return false;
    }
    
    return true;
  }
  
  /**
   * Get the tenant ID for the current context
   */
  public getContextTenant(contextId: string): number | null {
    if (!this.activeIsolationContexts.has(contextId)) {
      return null;
    }
    
    return this.activeIsolationContexts.get(contextId)!.tenantId;
  }
  
  /**
   * Check if data access between tenants is allowed
   */
  public isDataAccessAllowed(sourceTenantId: number, targetTenantId: number): boolean {
    // If tenant isolation is not enabled, allow all access
    if (!this.isTenantIsolationEnabled()) {
      return true;
    }
    
    // If it's the same tenant, access is allowed
    if (sourceTenantId === targetTenantId) {
      return true;
    }
    
    // Get the isolation levels for both tenants
    const sourceConfig = this.getTenantConfig(sourceTenantId);
    const targetConfig = this.getTenantConfig(targetTenantId);
    
    // In strict isolation mode, cross-tenant access is always denied
    if (sourceConfig.isolationLevel === 'strict' || targetConfig.isolationLevel === 'strict') {
      return false;
    }
    
    // In standard isolation mode, cross-tenant access requires additional checks
    // (e.g., explicit sharing or entitlements)
    if (sourceConfig.isolationLevel === 'standard' || targetConfig.isolationLevel === 'standard') {
      // For now, default to disallowing access in standard mode
      // In a real implementation, this would check sharing permissions
      return false;
    }
    
    // In basic isolation mode, cross-tenant access may be allowed
    // Additional rules could be applied here
    
    return false; // Default to denying access for safety
  }
  
  /**
   * Check if tenant isolation is enabled
   */
  private isTenantIsolationEnabled(): boolean {
    return featureFlagService.isEnabled(FeatureFlags.TENANT_ISOLATION);
  }
  
  /**
   * Apply tenant isolation to an AI request
   */
  public isolateAIRequest(request: any, tenantId: number): any {
    if (!this.isTenantIsolationEnabled()) {
      return request; // No isolation to apply
    }
    
    const config = this.getTenantConfig(tenantId);
    
    // Create a deep copy of the request to avoid modifying the original
    const isolatedRequest = JSON.parse(JSON.stringify(request));
    
    // Add tenant context to the request
    isolatedRequest.tenantId = tenantId;
    
    // Apply isolation-level specific modifications
    if (config.isolationLevel === 'strict') {
      // For strict isolation, ensure no cross-tenant data appears in the request
      // Additional logic for strict isolation would go here
      
      // For example, add a special header for routing to dedicated infrastructure
      isolatedRequest.headers = isolatedRequest.headers || {};
      isolatedRequest.headers['X-Tenant-Isolation'] = 'strict';
      
      // Flag for dedicated resources
      if (config.dedicatedResources) {
        isolatedRequest.headers['X-Dedicated-Resources'] = 'true';
      }
      
      // Flag for separate model instances
      if (config.separateModelInstances) {
        isolatedRequest.headers['X-Separate-Model-Instances'] = 'true';
      }
    }
    
    // Add isolation metadata
    isolatedRequest.isolationMetadata = {
      level: config.isolationLevel,
      tenantId,
      timestamp: new Date().toISOString()
    };
    
    return isolatedRequest;
  }
  
  /**
   * Clean up stale isolation contexts
   */
  public cleanupStaleContexts(maxAgeMinutes: number = 60): void {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - (maxAgeMinutes * 60 * 1000));
    
    for (const [contextId, context] of this.activeIsolationContexts.entries()) {
      if (context.timestamp < staleCutoff) {
        this.activeIsolationContexts.delete(contextId);
      }
    }
  }
}

// Create and export a singleton instance
export const tenantIsolationService = new TenantIsolationService();