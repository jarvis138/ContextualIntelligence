/**
 * Feature Flag Service
 * 
 * This service provides dynamic feature flag management for enterprise features,
 * allowing granular control of capabilities at the tenant level.
 * 
 * Features:
 * - Dynamic feature flag management
 * - Tenant-specific feature configuration
 * - User role-based feature access
 * - Feature deprecation handling
 * - Usage tracking for licensed features
 */

import { FeatureFlags } from '../../shared/feature-flags';
import { auditLogger } from '../utils/auditLogger';
import { db } from '../db';

export interface FeatureFlagConfig {
  enabled: boolean;
  tenantIds?: number[]; // If specified, feature is only enabled for these tenants
  allowedRoles?: string[]; // If specified, feature is only enabled for these roles
  configParams?: Record<string, any>; // Additional configuration parameters for the feature
  expiryDate?: Date; // If set, feature will be automatically disabled after this date
  beta?: boolean; // Indicates if the feature is in beta
  deprecated?: boolean; // Indicates if the feature is deprecated
}

class FeatureFlagService {
  private featureFlags: Map<string, FeatureFlagConfig> = new Map();
  
  constructor() {
    // Initialize with default feature flag settings
    this.initializeDefaults();
    console.log('Feature Flag Service initialized');
  }
  
  /**
   * Initialize default feature flag settings
   */
  private initializeDefaults(): void {
    // Set defaults for all feature flags
    for (const flag of Object.values(FeatureFlags)) {
      // By default, most enterprise features are disabled
      let defaultEnabled = false;
      let beta = false;
      
      // Core Phase 1 and 2 features are always enabled
      if (
        flag === FeatureFlags.MULTI_TENANT ||
        flag === FeatureFlags.ROLE_BASED_ACCESS ||
        flag === FeatureFlags.API_RATE_LIMITING ||
        flag === FeatureFlags.SSO_INTEGRATION
      ) {
        defaultEnabled = true;
      }
      
      // Phase 3 AI features enabled by default
      if (
        flag === FeatureFlags.AI_DOCUMENT_ANALYSIS ||
        flag === FeatureFlags.SENTIMENT_ANALYSIS ||
        flag === FeatureFlags.PROJECT_VISUALIZATION ||
        flag === FeatureFlags.CONTEXTUAL_INSIGHTS
      ) {
        defaultEnabled = true;
      }
      
      // Enterprise governance features are in beta
      if (
        flag === FeatureFlags.MODEL_GOVERNANCE ||
        flag === FeatureFlags.ENHANCED_SECURITY ||
        flag === FeatureFlags.TENANT_ISOLATION ||
        flag === FeatureFlags.SCALABILITY_CONTROLS
      ) {
        beta = true;
      }
      
      this.featureFlags.set(flag, {
        enabled: defaultEnabled,
        beta
      });
    }
  }
  
  /**
   * Check if a feature flag is enabled
   */
  public isEnabled(
    featureFlag: string,
    options?: {
      tenantId?: number;
      userRoles?: string[];
    }
  ): boolean {
    // Check if the feature flag exists
    if (!this.featureFlags.has(featureFlag)) {
      return false;
    }
    
    const config = this.featureFlags.get(featureFlag)!;
    
    // If the feature is globally disabled, return false
    if (!config.enabled) {
      return false;
    }
    
    // If there's an expiry date and it's passed, return false
    if (config.expiryDate && new Date() > config.expiryDate) {
      return false;
    }
    
    // If the feature is restricted to specific tenants, check tenant access
    if (config.tenantIds && config.tenantIds.length > 0) {
      if (!options?.tenantId || !config.tenantIds.includes(options.tenantId)) {
        return false;
      }
    }
    
    // If the feature is restricted to specific roles, check role access
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      if (!options?.userRoles || !config.allowedRoles.some(role => options.userRoles!.includes(role))) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Update a feature flag's configuration
   */
  public updateFeatureFlag(
    featureFlag: string,
    config: Partial<FeatureFlagConfig>,
    updatedBy: string
  ): boolean {
    // Check if the feature flag exists
    if (!this.featureFlags.has(featureFlag)) {
      return false;
    }
    
    // Get current config
    const currentConfig = this.featureFlags.get(featureFlag)!;
    
    // Apply updates
    const updatedConfig = { ...currentConfig, ...config };
    this.featureFlags.set(featureFlag, updatedConfig);
    
    // Log the update
    auditLogger.log({
      action: 'feature_flag_updated',
      actor: updatedBy,
      target: `feature:${featureFlag}`,
      targetType: 'feature_flag',
      details: {
        previous: currentConfig,
        updated: updatedConfig,
        changes: Object.keys(config)
      }
    });
    
    return true;
  }
  
  /**
   * Get the full configuration for a feature flag
   */
  public getFeatureFlag(featureFlag: string): FeatureFlagConfig | null {
    return this.featureFlags.get(featureFlag) || null;
  }
  
  /**
   * Get all feature flags
   */
  public getAllFeatureFlags(): Record<string, FeatureFlagConfig> {
    const result: Record<string, FeatureFlagConfig> = {};
    
    for (const [flag, config] of this.featureFlags.entries()) {
      result[flag] = { ...config };
    }
    
    return result;
  }
  
  /**
   * Enable a feature flag for a specific tenant
   */
  public enableForTenant(
    featureFlag: string,
    tenantId: number,
    updatedBy: string
  ): boolean {
    // Check if the feature flag exists
    if (!this.featureFlags.has(featureFlag)) {
      return false;
    }
    
    // Get current config
    const currentConfig = this.featureFlags.get(featureFlag)!;
    
    // Create a new tenant list with this tenant included
    const tenantIds = [...(currentConfig.tenantIds || [])];
    if (!tenantIds.includes(tenantId)) {
      tenantIds.push(tenantId);
    }
    
    // Update the config
    return this.updateFeatureFlag(
      featureFlag,
      { tenantIds, enabled: true },
      updatedBy
    );
  }
  
  /**
   * Disable a feature flag for a specific tenant
   */
  public disableForTenant(
    featureFlag: string,
    tenantId: number,
    updatedBy: string
  ): boolean {
    // Check if the feature flag exists
    if (!this.featureFlags.has(featureFlag)) {
      return false;
    }
    
    // Get current config
    const currentConfig = this.featureFlags.get(featureFlag)!;
    
    // If no tenant IDs are specified, we need to enable for all tenants *except* this one
    if (!currentConfig.tenantIds || currentConfig.tenantIds.length === 0) {
      // This would require knowing all tenant IDs
      // For now, just create a list with this one tenant
      const tenantIds = [tenantId];
      
      // Update the config to be enabled globally but with an exclusion list
      return this.updateFeatureFlag(
        featureFlag,
        { tenantIds, enabled: false },
        updatedBy
      );
    }
    
    // Otherwise, remove this tenant from the enabled list
    const tenantIds = currentConfig.tenantIds.filter(id => id !== tenantId);
    
    // Update the config
    return this.updateFeatureFlag(
      featureFlag,
      { tenantIds },
      updatedBy
    );
  }
  
  /**
   * Track feature usage
   */
  public trackUsage(
    featureFlag: string,
    options?: {
      tenantId?: number;
      userId?: number;
      context?: string;
    }
  ): void {
    // In a real implementation, this would store usage metrics to the database
    // For now, we'll just log it
    
    auditLogger.log({
      action: 'feature_usage',
      actor: options?.userId?.toString() || 'system',
      target: `feature:${featureFlag}`,
      targetType: 'feature_flag',
      tenant: options?.tenantId?.toString(),
      details: {
        context: options?.context
      }
    });
  }
}

// Create and export a singleton instance
export const featureFlagService = new FeatureFlagService();