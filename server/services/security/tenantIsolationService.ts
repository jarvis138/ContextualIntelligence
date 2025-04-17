/**
 * Tenant Isolation Service
 * 
 * This service provides multi-tenant isolation capabilities for enterprise
 * environments, ensuring data segregation and access control across tenants.
 */

// Core imports
import { Request, Response, NextFunction } from 'express';
import { FeatureFlags } from '../../../shared/feature-flags';
import { featureFlagService } from '../feature-flag';
import { db } from '../../db';
import { auditLogger } from '../../utils/auditLogger';
import { auditTrailService, AuditCategory, AuditSeverity } from './auditTrailService';

// Export tenant context types for use by other modules
export interface TenantContext {
  tenantId: number;
  tenantName: string;
  tenantPlan: 'free' | 'standard' | 'professional' | 'enterprise' | 'custom';
  dataResidency?: string; // e.g., 'US', 'EU', 'APAC'
  customDomain?: string;
  isolationLevel: 'logical' | 'schema' | 'database';
  allowedFeatures: string[];
  limits: {
    maxUsers: number;
    maxProjects: number;
    maxStorage: number; // in GB
    maxApiRequests: number; // per day
  };
  settings: Record<string, any>;
}

export enum AccessOperation {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

export enum ResourceType {
  PROJECT = 'project',
  DOCUMENT = 'document',
  USER = 'user',
  TEAM = 'team',
  INTEGRATION = 'integration',
  TASK = 'task',
  API = 'api',
  FEATURE = 'feature',
  SETTING = 'setting',
  REPORT = 'report',
  INSIGHT = 'insight',
  ANALYTICS = 'analytics'
}

class TenantIsolationService {
  private tenantContexts: Map<number, TenantContext> = new Map();
  private currentTenantId: number | null = null;
  
  constructor() {
    console.log('Tenant Isolation Service initialized');
    
    // Initialize with some default contexts for development
    this.initializeDefaults();
  }
  
  /**
   * Initialize default tenant contexts
   */
  private initializeDefaults(): void {
    // Standard tenant context
    const defaultContext: TenantContext = {
      tenantId: 1,
      tenantName: 'Default Tenant',
      tenantPlan: 'standard',
      isolationLevel: 'logical',
      dataResidency: 'US',
      allowedFeatures: [
        FeatureFlags.DOCUMENT_ANALYSIS,
        FeatureFlags.SENTIMENT_ANALYSIS,
        FeatureFlags.PROJECT_VISUALIZATION,
        FeatureFlags.CONTEXTUAL_INSIGHTS
      ],
      limits: {
        maxUsers: 20,
        maxProjects: 50,
        maxStorage: 50,
        maxApiRequests: 10000
      },
      settings: {
        enableAudit: true,
        retentionPeriod: 90, // days
        maxFileSize: 10 // MB
      }
    };
    
    // Enterprise tenant context
    const enterpriseTenantContext: TenantContext = {
      tenantId: 2,
      tenantName: 'Enterprise Tenant',
      tenantPlan: 'enterprise',
      isolationLevel: 'database',
      dataResidency: 'EU',
      customDomain: 'enterprise.cpihub.com',
      allowedFeatures: Object.values(FeatureFlags),
      limits: {
        maxUsers: 500,
        maxProjects: 1000,
        maxStorage: 1000,
        maxApiRequests: 1000000
      },
      settings: {
        enableAudit: true,
        retentionPeriod: 365, // days
        maxFileSize: 100, // MB
        ssoEnabled: true,
        mfaRequired: true,
        dataEncryption: true,
        customBranding: true,
        aiModelGovernance: true
      }
    };
    
    // Store the contexts
    this.tenantContexts.set(defaultContext.tenantId, defaultContext);
    this.tenantContexts.set(enterpriseTenantContext.tenantId, enterpriseTenantContext);
  }
  
  /**
   * Get tenant context by ID
   */
  public getTenantContext(tenantId: number): TenantContext | null {
    return this.tenantContexts.get(tenantId) || null;
  }
  
  /**
   * Set current tenant context for the request
   */
  public setCurrentTenant(tenantId: number): void {
    if (!this.tenantContexts.has(tenantId)) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }
    
    this.currentTenantId = tenantId;
    
    // Log tenant context switch
    auditLogger.log({
      action: 'tenant_context_switched',
      actor: 'system',
      target: `tenant:${tenantId}`,
      targetType: 'tenant',
      tenant: tenantId.toString(),
      details: {
        tenantId,
        tenantName: this.tenantContexts.get(tenantId)?.tenantName
      }
    });
  }
  
  /**
   * Get current tenant context
   */
  public getCurrentTenantContext(): TenantContext | null {
    if (this.currentTenantId === null) {
      return null;
    }
    
    return this.tenantContexts.get(this.currentTenantId) || null;
  }
  
  /**
   * Clear current tenant context
   */
  public clearCurrentTenant(): void {
    const previousTenantId = this.currentTenantId;
    this.currentTenantId = null;
    
    if (previousTenantId !== null) {
      // Log tenant context cleared
      auditLogger.log({
        action: 'tenant_context_cleared',
        actor: 'system',
        target: `tenant:${previousTenantId}`,
        targetType: 'tenant',
        tenant: previousTenantId.toString()
      });
    }
  }
  
  /**
   * Check if tenant is allowed to access a feature
   */
  public canAccessFeature(tenantId: number, featureFlag: string): boolean {
    const tenantContext = this.getTenantContext(tenantId);
    if (!tenantContext) {
      return false;
    }
    
    // Check if feature is in allowed features
    return tenantContext.allowedFeatures.includes(featureFlag);
  }
  
  /**
   * Verify if tenant is within limits
   */
  public checkTenantLimits(
    tenantId: number,
    limitType: 'users' | 'projects' | 'storage' | 'apiRequests',
    currentValue: number
  ): boolean {
    const tenantContext = this.getTenantContext(tenantId);
    if (!tenantContext) {
      return false;
    }
    
    // Check specific limit type
    switch (limitType) {
      case 'users':
        return currentValue <= tenantContext.limits.maxUsers;
      case 'projects':
        return currentValue <= tenantContext.limits.maxProjects;
      case 'storage':
        return currentValue <= tenantContext.limits.maxStorage;
      case 'apiRequests':
        return currentValue <= tenantContext.limits.maxApiRequests;
      default:
        return false;
    }
  }
  
  /**
   * Get query filters for tenant-scoped data access
   */
  public getTenantQueryFilter(tenantId: number): Record<string, any> {
    const tenantContext = this.getTenantContext(tenantId);
    if (!tenantContext) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }
    
    // For logical isolation, we add a tenantId filter to all queries
    return { tenantId };
  }
  
  /**
   * Express middleware to enforce tenant isolation
   */
  public enforceTenantIsolation() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only enforce if multi-tenancy is enabled
      if (!featureFlagService.isEnabled(FeatureFlags.MULTI_TENANCY)) {
        return next();
      }
      
      // Extract tenant ID from request
      const tenantId = this.extractTenantId(req);
      
      if (tenantId === null) {
        return res.status(403).json({
          error: 'Tenant context required',
          message: 'This request requires a valid tenant context.'
        });
      }
      
      try {
        // Set the current tenant for this request
        this.setCurrentTenant(tenantId);
        
        // Add tenant context to request for downstream use
        (req as any).tenantContext = this.getCurrentTenantContext();
        
        // Continue to next middleware
        next();
        
        // Clean up after request is complete
        res.on('finish', () => {
          this.clearCurrentTenant();
        });
      } catch (error) {
        auditTrailService.logSecurityEvent(
          'tenant_isolation_error',
          AuditSeverity.ERROR,
          'system',
          'tenant',
          tenantId.toString(),
          req.ip,
          req.headers['user-agent'] as string,
          { error: (error as Error).message },
          tenantId
        );
        
        return res.status(403).json({
          error: 'Tenant isolation error',
          message: 'Error applying tenant isolation.',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
      }
    };
  }
  
  /**
   * Extract tenant ID from request
   */
  private extractTenantId(req: Request): number | null {
    // Try to extract tenant ID from various sources
    
    // 1. From request header
    const tenantHeader = req.header('X-Tenant-ID');
    if (tenantHeader && !isNaN(parseInt(tenantHeader, 10))) {
      return parseInt(tenantHeader, 10);
    }
    
    // 2. From subdomain (e.g., tenant1.cpihub.com)
    const host = req.header('Host');
    if (host && host.includes('.') && !host.startsWith('www.')) {
      const subdomain = host.split('.')[0];
      // In a real implementation, we would look up the tenant by subdomain
      // For now, we'll just use a simple mapping for demo purposes
      if (subdomain === 'enterprise') {
        return 2;
      }
    }
    
    // 3. From query parameter
    if (req.query.tenantId && !isNaN(parseInt(req.query.tenantId as string, 10))) {
      return parseInt(req.query.tenantId as string, 10);
    }
    
    // 4. From JWT token payload
    // In a real implementation, we would extract the tenant ID from the JWT token
    const user = (req as any).user;
    if (user && user.tenantId) {
      return user.tenantId;
    }
    
    // Default to tenant ID 1 for development purposes
    // In production, we would return null here instead
    return process.env.NODE_ENV === 'development' ? 1 : null;
  }
  
  /**
   * Enforce access control based on tenant, resource type, and operation
   */
  public enforceAccessControl(
    resourceType: ResourceType,
    operation: AccessOperation,
    resourceIdExtractor?: (req: Request) => string | number | null
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only enforce if multi-tenancy is enabled
      if (!featureFlagService.isEnabled(FeatureFlags.MULTI_TENANCY)) {
        return next();
      }
      
      // Get tenant context from request
      const tenantContext = (req as any).tenantContext as TenantContext | undefined;
      
      if (!tenantContext) {
        return res.status(403).json({
          error: 'Tenant context required',
          message: 'This request requires a valid tenant context.'
        });
      }
      
      // Get resource ID if provided
      const resourceId = resourceIdExtractor ? resourceIdExtractor(req) : null;
      
      // In a real implementation, we would check if the user has permission to perform
      // the operation on the resource within the tenant's context
      
      // Log the access control check
      auditTrailService.logSecurityEvent(
        'access_control_check',
        AuditSeverity.INFO,
        (req as any).user?.id || 'anonymous',
        resourceType,
        resourceId?.toString() || 'unknown',
        req.ip,
        req.headers['user-agent'] as string,
        {
          operation,
          tenantId: tenantContext.tenantId,
          tenantName: tenantContext.tenantName,
          allowed: true // In a real implementation, this would be the result of the permission check
        },
        tenantContext.tenantId
      );
      
      // For now, we'll just allow all access
      next();
    };
  }
  
  /**
   * Register a new tenant
   */
  public async registerTenant(tenantData: Omit<TenantContext, 'tenantId'>): Promise<TenantContext> {
    // In a real implementation, we would:
    // 1. Create a new tenant record in the database
    // 2. Create default resources for the tenant
    // 3. Return the new tenant context
    
    // For now, we'll just create a mock tenant
    const newTenantId = Math.max(...Array.from(this.tenantContexts.keys())) + 1;
    
    const newTenant: TenantContext = {
      tenantId: newTenantId,
      ...tenantData
    };
    
    // Store the context
    this.tenantContexts.set(newTenantId, newTenant);
    
    // Log tenant registration
    auditLogger.log({
      action: 'tenant_registered',
      actor: 'system',
      target: `tenant:${newTenantId}`,
      targetType: 'tenant',
      tenant: newTenantId.toString(),
      details: {
        tenantName: newTenant.tenantName,
        tenantPlan: newTenant.tenantPlan
      }
    });
    
    return newTenant;
  }
  
  /**
   * Update tenant details
   */
  public async updateTenant(
    tenantId: number,
    tenantData: Partial<Omit<TenantContext, 'tenantId'>>
  ): Promise<TenantContext> {
    // Get existing tenant
    const existingTenant = this.getTenantContext(tenantId);
    if (!existingTenant) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }
    
    // Update tenant data
    const updatedTenant: TenantContext = {
      ...existingTenant,
      ...tenantData
    };
    
    // Store the updated context
    this.tenantContexts.set(tenantId, updatedTenant);
    
    // Log tenant update
    auditLogger.log({
      action: 'tenant_updated',
      actor: 'system',
      target: `tenant:${tenantId}`,
      targetType: 'tenant',
      tenant: tenantId.toString(),
      details: {
        tenantName: updatedTenant.tenantName,
        tenantPlan: updatedTenant.tenantPlan,
        updatedFields: Object.keys(tenantData)
      }
    });
    
    return updatedTenant;
  }
  
  /**
   * Delete a tenant
   */
  public async deleteTenant(tenantId: number): Promise<boolean> {
    // Get existing tenant
    const existingTenant = this.getTenantContext(tenantId);
    if (!existingTenant) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }
    
    // In a real implementation, we would:
    // 1. Archive or delete tenant data
    // 2. Remove tenant resources
    // 3. Remove tenant record from database
    
    // Remove from context map
    this.tenantContexts.delete(tenantId);
    
    // Log tenant deletion
    auditLogger.log({
      action: 'tenant_deleted',
      actor: 'system',
      target: `tenant:${tenantId}`,
      targetType: 'tenant',
      tenant: tenantId.toString(),
      details: {
        tenantName: existingTenant.tenantName,
        tenantPlan: existingTenant.tenantPlan
      }
    });
    
    return true;
  }
  
  /**
   * Get database connection for tenant
   */
  public getTenantDatabase(tenantId: number): any {
    const tenantContext = this.getTenantContext(tenantId);
    if (!tenantContext) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }
    
    // In a real implementation with database isolation:
    // - For logical isolation: return the main database but set a tenant filter
    // - For schema isolation: return database with schema set to tenant's schema
    // - For database isolation: return tenant-specific database connection
    
    if (tenantContext.isolationLevel === 'logical') {
      // Return main DB but with tenant context for query filtering
      return db;
    } else {
      // For demo purposes, we'll just return the main DB for now
      // In a real implementation, we would have separate connections
      return db;
    }
  }
  
  /**
   * Validate that a resource belongs to the specified tenant
   */
  public async validateTenantResource(
    tenantId: number,
    resourceType: ResourceType,
    resourceId: string | number
  ): Promise<boolean> {
    // In a real implementation, we would:
    // 1. Query the resource by ID
    // 2. Check if the resource's tenant ID matches the specified tenant ID
    // 3. Return true/false accordingly
    
    // For demo purposes, assume the resource belongs to the tenant
    await new Promise(resolve => setTimeout(resolve, 1)); // Simulate async operation
    return true;
  }
}

// Create and export a singleton instance
export const tenantIsolationService = new TenantIsolationService();