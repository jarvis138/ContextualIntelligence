/**
 * Feature Flag Service
 * 
 * This service provides feature flag management for the CPI Hub.
 * It supports both global feature flags and tenant-specific feature flags.
 */

import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { FeatureFlags, defaultFlags } from "../../shared/feature-flags";
import { logger } from "./observability";

const flagLogger = logger.createChildLogger({ component: 'FeatureFlagService' });

export class FeatureFlagService {
  // In-memory cache of feature flags for performance
  private flagCache: Map<string, boolean> = new Map();
  private tenantFlagCache: Map<string, boolean> = new Map();
  
  constructor() {
    // Initialize cache with default values from shared flags
    this.initializeCache();
  }
  
  /**
   * Initialize the feature flag cache with default values
   */
  private initializeCache() {
    try {
      // Set defaults from the shared feature flags file
      Object.entries(defaultFlags).forEach(([key, value]) => {
        this.flagCache.set(key, value.enabled);
      });
      
      flagLogger.debug('Feature flag cache initialized with defaults', {
        flagCount: this.flagCache.size
      });
    } catch (error) {
      flagLogger.error('Error initializing feature flag cache', { error });
    }
  }
  
  /**
   * Check if a feature flag is enabled
   * @param flagKey The key of the feature flag
   * @param tenantId Optional tenant ID for tenant-specific flags
   * @returns boolean indicating if the flag is enabled
   */
  public isEnabled(flagKey: string, tenantId?: number): boolean {
    try {
      // For tenant-specific flags, use the composite key format "tenantId:flagKey"
      const cacheKey = tenantId ? `${tenantId}:${flagKey}` : flagKey;
      
      // Check cache first
      if (tenantId && this.tenantFlagCache.has(cacheKey)) {
        return this.tenantFlagCache.get(cacheKey) ?? false;
      } else if (!tenantId && this.flagCache.has(flagKey)) {
        return this.flagCache.get(flagKey) ?? false;
      }
      
      // Default to the shared definition if available
      const defaultValue = defaultFlags[flagKey]?.enabled ?? false;
      
      // Cache and return default
      if (tenantId) {
        this.tenantFlagCache.set(cacheKey, defaultValue);
      } else {
        this.flagCache.set(flagKey, defaultValue);
      }
      
      return defaultValue;
    } catch (error) {
      flagLogger.error('Error checking feature flag', { flagKey, tenantId, error });
      return false;
    }
  }
  
  /**
   * Set the state of a feature flag
   * @param flagKey The key of the feature flag
   * @param enabled Whether the flag should be enabled
   * @param tenantId Optional tenant ID for tenant-specific flags
   */
  public async setFlag(flagKey: string, enabled: boolean, tenantId?: number): Promise<void> {
    try {
      // For tenant-specific flags, use the composite key format "tenantId:flagKey"
      const cacheKey = tenantId ? `${tenantId}:${flagKey}` : flagKey;
      
      // Update cache immediately
      if (tenantId) {
        this.tenantFlagCache.set(cacheKey, enabled);
      } else {
        this.flagCache.set(flagKey, enabled);
      }
      
      // Update database flags for persistence (if we had a flags table)
      // This functionality would typically interact with the database
      
      flagLogger.info('Feature flag updated', {
        flagKey,
        tenantId: tenantId || 'global',
        enabled
      });
    } catch (error) {
      flagLogger.error('Error setting feature flag', { flagKey, tenantId, enabled, error });
      throw error;
    }
  }
  
  /**
   * Get flag settings including additional configuration
   * @param flagKey The key of the feature flag
   * @param tenantId Optional tenant ID for tenant-specific flags
   * @returns Settings object for the flag
   */
  public getSettings(flagKey: string, tenantId?: number): Record<string, any> {
    try {
      // Default to the shared definition settings if available
      const defaultSettings = defaultFlags[flagKey]?.settings ?? {};
      
      // In a real implementation, we would look up tenant-specific settings
      // from the database if tenantId is provided
      
      return defaultSettings;
    } catch (error) {
      flagLogger.error('Error getting feature flag settings', { flagKey, tenantId, error });
      return {};
    }
  }
  
  /**
   * Reload feature flags from the database
   * This is useful after configuration changes
   */
  public async reloadFlags(): Promise<void> {
    try {
      // Clear caches
      this.flagCache.clear();
      this.tenantFlagCache.clear();
      
      // Re-initialize with defaults
      this.initializeCache();
      
      // In a real implementation, we would load flags from the database here
      
      flagLogger.info('Feature flags reloaded');
    } catch (error) {
      flagLogger.error('Error reloading feature flags', { error });
      throw error;
    }
  }
}

// Export a singleton instance
export const featureFlagService = new FeatureFlagService();