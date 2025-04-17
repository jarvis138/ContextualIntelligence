/**
 * Feature Flags System
 * 
 * This module provides a centralized way to manage feature flags throughout the application.
 * Feature flags allow for controlled rollout of features and easy toggling of functionality.
 */

import { z } from 'zod';

// Define the structure of a feature flag
export const featureFlagSchema = z.object({
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  // For more complex scenarios, we might want percentage rollouts
  rolloutPercentage: z.number().min(0).max(100).optional(),
  // For targeted rollouts based on user attributes
  enabledForUserIds: z.array(z.number()).optional(),
  enabledForRoles: z.array(z.string()).optional(),
});

export type FeatureFlag = z.infer<typeof featureFlagSchema>;

// Define all application feature flags here
export const FeatureFlags = {
  // Core features
  ADVANCED_SEARCH: 'advanced-search',
  DOCUMENT_RELATIONSHIPS: 'document-relationships',
  AI_INSIGHTS: 'ai-insights',
  REAL_TIME_COLLABORATION: 'real-time-collaboration',
  
  // UI features
  CUSTOM_DASHBOARDS: 'custom-dashboards',
  DARK_MODE: 'dark-mode',
  VISUALIZATION_TOOLS: 'visualization-tools',
  
  // Infrastructure features
  ENHANCED_LOGGING: 'enhanced-logging',
  METRICS_DASHBOARD: 'metrics-dashboard',
  DISTRIBUTED_TRACING: 'distributed-tracing',
  
  // AI and ML features
  DOCUMENT_SUMMARIZATION: 'document-summarization',
  ENTITY_RECOGNITION: 'entity-recognition',
  SENTIMENT_ANALYSIS: 'sentiment-analysis',
  TOPIC_MODELING: 'topic-modeling',
  
  // Enterprise features (Phase 3)
  MODEL_GOVERNANCE: 'model-governance',
  ENHANCED_SECURITY: 'enhanced-security',
  TENANT_ISOLATION: 'tenant-isolation',
  AUDIT_TRAIL: 'audit-trail',
  SCALABILITY_CONTROLS: 'scalability-controls',
  ADMIN_DASHBOARD: 'admin-dashboard',
  
  // Integration features
  SLACK_INTEGRATION: 'slack-integration',
  GOOGLE_DRIVE_INTEGRATION: 'google-drive-integration',
  MICROSOFT_GRAPH_INTEGRATION: 'microsoft-graph-integration',
  EMAIL_INTEGRATION: 'email-integration',
} as const;

export type FeatureFlagName = keyof typeof FeatureFlags;

// Initial flag definitions with default values
// In a real application, these would be loaded from a database or configuration
export const defaultFlags: Record<string, FeatureFlag> = {
  [FeatureFlags.ADVANCED_SEARCH]: {
    name: FeatureFlags.ADVANCED_SEARCH,
    description: 'Enable advanced search capabilities including semantic search',
    enabled: false,
  },
  [FeatureFlags.DOCUMENT_RELATIONSHIPS]: {
    name: FeatureFlags.DOCUMENT_RELATIONSHIPS,
    description: 'Enable visualization of relationships between documents',
    enabled: false,
  },
  [FeatureFlags.AI_INSIGHTS]: {
    name: FeatureFlags.AI_INSIGHTS,
    description: 'Enable AI-generated insights about projects and documents',
    enabled: false,
    settings: {
      level: 'standard', // Can be 'basic', 'standard', or 'enterprise'
      maxTokens: 2000,
      temperature: 0.2,
      allowedModels: ['gpt-4o'],
      enabledFeatures: ['insights', 'summarization', 'entity-extraction']
    }
  },
  [FeatureFlags.REAL_TIME_COLLABORATION]: {
    name: FeatureFlags.REAL_TIME_COLLABORATION,
    description: 'Enable real-time collaboration features',
    enabled: false,
  },
  [FeatureFlags.CUSTOM_DASHBOARDS]: {
    name: FeatureFlags.CUSTOM_DASHBOARDS,
    description: 'Allow users to create and customize dashboards',
    enabled: false,
  },
  [FeatureFlags.DARK_MODE]: {
    name: FeatureFlags.DARK_MODE,
    description: 'Enable dark mode UI theme',
    enabled: true, // On by default
  },
  [FeatureFlags.VISUALIZATION_TOOLS]: {
    name: FeatureFlags.VISUALIZATION_TOOLS,
    description: 'Enable advanced data visualization tools',
    enabled: false,
  },
  [FeatureFlags.ENHANCED_LOGGING]: {
    name: FeatureFlags.ENHANCED_LOGGING,
    description: 'Enable enhanced application logging',
    enabled: true, // On by default
  },
  [FeatureFlags.METRICS_DASHBOARD]: {
    name: FeatureFlags.METRICS_DASHBOARD,
    description: 'Enable metrics dashboard for monitoring',
    enabled: false,
  },
  [FeatureFlags.DISTRIBUTED_TRACING]: {
    name: FeatureFlags.DISTRIBUTED_TRACING,
    description: 'Enable distributed tracing of requests',
    enabled: false,
  },
  [FeatureFlags.DOCUMENT_SUMMARIZATION]: {
    name: FeatureFlags.DOCUMENT_SUMMARIZATION,
    description: 'Enable AI-based document summarization',
    enabled: false,
    settings: {
      level: 'standard', // Can be 'basic', 'standard', or 'enterprise'
      maxTokens: 1000,
      temperature: 0.1,
      summaryLength: 'medium', // Can be 'short', 'medium', or 'long'
      includeKeyPoints: true
    }
  },
  [FeatureFlags.ENTITY_RECOGNITION]: {
    name: FeatureFlags.ENTITY_RECOGNITION,
    description: 'Enable entity recognition in documents',
    enabled: false,
    settings: {
      level: 'standard', // Can be 'basic', 'standard', or 'enterprise'
      entityTypes: ['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'PRODUCT', 'EVENT'],
      confidence: 0.75,
      useLargeContext: true,
      maxEntitiesPerDocument: 50
    }
  },
  [FeatureFlags.SENTIMENT_ANALYSIS]: {
    name: FeatureFlags.SENTIMENT_ANALYSIS,
    description: 'Enable sentiment analysis of text',
    enabled: false,
    settings: {
      level: 'standard', // Can be 'basic', 'standard', or 'enterprise'
      includeEmotions: true,
      detailLevel: 'detailed', // Can be 'basic', 'standard', or 'detailed'
      confidenceThreshold: 0.6, 
      aggregationMethod: 'weighted' // Can be 'simple', 'weighted', or 'contextual'
    }
  },
  [FeatureFlags.TOPIC_MODELING]: {
    name: FeatureFlags.TOPIC_MODELING,
    description: 'Enable topic modeling of document collections',
    enabled: false,
    settings: {
      level: 'standard', // Can be 'basic', 'standard', or 'enterprise'
      maxTopics: 10,
      minDocumentsPerTopic: 3,
      enableClustering: true,
      similarityThreshold: 0.7,
      useHierarchicalTopics: false,
      includeMetadata: true
    }
  },
  // Enterprise features
  [FeatureFlags.MODEL_GOVERNANCE]: {
    name: FeatureFlags.MODEL_GOVERNANCE,
    description: 'Enable enterprise model governance with versioning, audit trails, and performance monitoring',
    enabled: false,
    settings: {
      level: 'enterprise', // Enterprise-only feature
      enableVersioning: true,
      enableAuditTrail: true,
      enablePerformanceMonitoring: true,
      approvalWorkflowRequired: true,
      complianceReporting: true,
      biasDetection: true,
      modelRegistryEnabled: true,
      usageQuotas: {
        enabled: true,
        defaultTokenLimit: 1000000
      }
    }
  },
  [FeatureFlags.ENHANCED_SECURITY]: {
    name: FeatureFlags.ENHANCED_SECURITY,
    description: 'Enable enhanced enterprise security controls for data and AI processing',
    enabled: false,
    settings: {
      level: 'enterprise', // Enterprise-only feature
      dataEncryptionAtRest: true,
      piiDetection: true,
      sensitiveDataMasking: true,
      aiRequestSanitization: true,
      dataLineageTracking: true,
      complianceTagging: true
    }
  },
  [FeatureFlags.TENANT_ISOLATION]: {
    name: FeatureFlags.TENANT_ISOLATION,
    description: 'Enable complete tenant isolation for AI processing and data segregation',
    enabled: false,
    settings: {
      level: 'enterprise', // Enterprise-only feature
      isolationMode: 'strict', // Can be 'basic', 'standard', or 'strict'
      separateModelInstances: true,
      dedicatedProcessingQueues: true,
      independentDataStorage: true
    }
  },
  [FeatureFlags.AUDIT_TRAIL]: {
    name: FeatureFlags.AUDIT_TRAIL,
    description: 'Enable comprehensive audit trail for all AI operations',
    enabled: false,
    settings: {
      level: 'enterprise', // Enterprise-only feature
      detailLevel: 'comprehensive', // Can be 'basic', 'standard', or 'comprehensive'
      retentionPeriodDays: 365,
      captureInputOutput: true,
      captureModelMetadata: true,
      exportFormat: 'structured' // Can be 'basic' or 'structured'
    }
  },
  [FeatureFlags.SCALABILITY_CONTROLS]: {
    name: FeatureFlags.SCALABILITY_CONTROLS,
    description: 'Enable enterprise-grade scalability controls for AI processing',
    enabled: false,
    settings: {
      level: 'enterprise', // Enterprise-only feature
      distributedProcessing: true,
      asyncProcessingQueues: true,
      priorityBasedQueuing: true,
      horizontalScaling: true,
      loadBalancing: true,
      autoScalingEnabled: true
    }
  },
  [FeatureFlags.ADMIN_DASHBOARD]: {
    name: FeatureFlags.ADMIN_DASHBOARD,
    description: 'Enable comprehensive admin dashboard for AI feature management',
    enabled: false,
    settings: {
      level: 'enterprise', // Enterprise-only feature
      aiUsageMetrics: true,
      modelPerformanceTracking: true,
      tenantManagement: true,
      quotaConfiguration: true,
      aiFeatureConfiguration: true
    }
  },
  [FeatureFlags.SLACK_INTEGRATION]: {
    name: FeatureFlags.SLACK_INTEGRATION,
    description: 'Enable Slack integration',
    enabled: true, // On by default
  },
  [FeatureFlags.GOOGLE_DRIVE_INTEGRATION]: {
    name: FeatureFlags.GOOGLE_DRIVE_INTEGRATION,
    description: 'Enable Google Drive integration',
    enabled: true, // On by default
  },
  [FeatureFlags.MICROSOFT_GRAPH_INTEGRATION]: {
    name: FeatureFlags.MICROSOFT_GRAPH_INTEGRATION,
    description: 'Enable Microsoft Graph integration',
    enabled: true, // On by default
  },
  [FeatureFlags.EMAIL_INTEGRATION]: {
    name: FeatureFlags.EMAIL_INTEGRATION,
    description: 'Enable email integration',
    enabled: true, // On by default
  },
};

// Add the feature flags to the database schema
export interface FeatureFlagModel {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number;
  enabledForUserIds?: number[];
  enabledForRoles?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FeatureFlagService - Manages feature flags
 * 
 * In a real implementation, this would load flags from a database
 * and might handle dynamic updates via admin UI or API.
 */
class FeatureFlagService {
  private flags: Record<string, FeatureFlag> = { ...defaultFlags };
  
  constructor() {
    // In a real implementation, we would load flags from storage here
    console.log('Feature flag service initialized with default values');
  }
  
  /**
   * Check if a feature is enabled globally
   */
  isEnabled(flagName: string): boolean {
    const flag = this.flags[flagName];
    return flag ? flag.enabled : false;
  }
  
  /**
   * Check if a feature is enabled for a specific user
   */
  isEnabledForUser(flagName: string, userId: number, userRoles: string[] = []): boolean {
    const flag = this.flags[flagName];
    
    if (!flag) return false;
    
    // If the flag is disabled globally, it's disabled for everyone
    if (!flag.enabled) return false;
    
    // If there are no specific user or role restrictions, the flag is enabled for everyone
    if (!flag.enabledForUserIds && !flag.enabledForRoles) return true;
    
    // Check if the user is specifically enabled
    if (flag.enabledForUserIds && flag.enabledForUserIds.includes(userId)) {
      return true;
    }
    
    // Check if any of the user's roles are enabled
    if (flag.enabledForRoles && userRoles.some(role => flag.enabledForRoles!.includes(role))) {
      return true;
    }
    
    // If there are restrictions but the user doesn't match any, the flag is disabled for this user
    if (flag.enabledForUserIds || flag.enabledForRoles) {
      return false;
    }
    
    // Default to the global enabled state
    return flag.enabled;
  }
  
  /**
   * Update a feature flag (admin function)
   */
  updateFlag(flagName: string, updates: Partial<FeatureFlag>): FeatureFlag {
    const flag = this.flags[flagName];
    
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }
    
    this.flags[flagName] = {
      ...flag,
      ...updates,
    };
    
    console.log(`Feature flag ${flagName} updated:`, this.flags[flagName]);
    
    // In a real implementation, we would persist this to storage
    return this.flags[flagName];
  }
  
  /**
   * Get all feature flags (admin function)
   */
  getAllFlags(): FeatureFlag[] {
    return Object.values(this.flags);
  }
  
  /**
   * Get a specific feature flag by name (admin function)
   */
  getFlag(flagName: string): FeatureFlag | undefined {
    return this.flags[flagName];
  }
}

// Singleton instance
export const featureFlagService = new FeatureFlagService();