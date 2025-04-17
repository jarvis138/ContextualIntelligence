/**
 * Feature Flag Definitions
 * 
 * This file defines all available feature flags for the CPI Hub.
 * These flags control the availability of features, especially for enterprise capabilities.
 */

// Export all feature flag names as a constant object
export const FeatureFlags = {
  // Phase 1 & 2 Core Features (always enabled)
  MULTI_TENANT: 'multi_tenant',
  ROLE_BASED_ACCESS: 'role_based_access',
  API_RATE_LIMITING: 'api_rate_limiting',
  SSO_INTEGRATION: 'sso_integration',
  CUSTOM_BRANDING: 'custom_branding',
  ADVANCED_SEARCH: 'advanced_search',
  AUDITING: 'auditing',
  REPORTING: 'reporting',
  
  // Phase 3 AI Features
  AI_DOCUMENT_ANALYSIS: 'ai_document_analysis',
  SENTIMENT_ANALYSIS: 'sentiment_analysis',
  PROJECT_VISUALIZATION: 'project_visualization',
  CONTEXTUAL_INSIGHTS: 'contextual_insights',
  ENTITY_RELATIONSHIP: 'entity_relationship',
  TOPIC_MODELING: 'topic_modeling',
  AUTOMATIC_CATEGORIZATION: 'automatic_categorization',
  SIMILARITY_MATCHING: 'similarity_matching',
  
  // Enterprise Governance & Security
  MODEL_GOVERNANCE: 'model_governance',
  ENHANCED_SECURITY: 'enhanced_security',
  TENANT_ISOLATION: 'tenant_isolation',
  AUDIT_TRAIL: 'audit_trail',
  DATA_RESIDENCY: 'data_residency',
  DATA_ENCRYPTION: 'data_encryption',
  
  // Enterprise Scalability Features
  SCALABILITY_CONTROLS: 'scalability_controls',
  DISTRIBUTED_PROCESSING: 'distributed_processing',
  PRIORITY_PROCESSING: 'priority_processing',
  BATCH_PROCESSING: 'batch_processing',
  ASYNC_PROCESSING: 'async_processing',
  
  // Enterprise Administration Features
  ENTERPRISE_ADMIN: 'enterprise_admin',
  USAGE_ANALYTICS: 'usage_analytics',
  MODEL_REGISTRY: 'model_registry',
  LICENSE_MANAGEMENT: 'license_management',
  SYSTEM_HEALTH: 'system_health',
  
  // Enterprise Integration Features
  ENTERPRISE_INTEGRATIONS: 'enterprise_integrations',
  DATA_EXPORT: 'data_export',
  WEBHOOK_SUPPORT: 'webhook_support',
  API_ACCESS_CONTROL: 'api_access_control',
  CUSTOM_AUTHENTICATION: 'custom_authentication',
  
  // Beta/Experimental Features
  SUMMARIZATION: 'summarization',
  RELEVANCE_RANKING: 'relevance_ranking',
  KNOWLEDGE_EXTRACTION: 'knowledge_extraction',
  GENERATIVE_AI: 'generative_ai',
  MULTI_MODEL_SUPPORT: 'multi_model_support'
} as const;

// Create a union type of all feature flag values
export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];

// Define feature flag categories
export enum FeatureFlagCategory {
  CORE = 'Core Features',
  AI = 'AI Features',
  GOVERNANCE = 'Governance & Security',
  SCALABILITY = 'Scalability',
  ADMINISTRATION = 'Administration',
  INTEGRATION = 'Integration',
  EXPERIMENTAL = 'Experimental'
}

// Map feature flags to their categories
export const featureFlagCategories: Record<FeatureFlag, FeatureFlagCategory> = {
  // Core
  [FeatureFlags.MULTI_TENANT]: FeatureFlagCategory.CORE,
  [FeatureFlags.ROLE_BASED_ACCESS]: FeatureFlagCategory.CORE,
  [FeatureFlags.API_RATE_LIMITING]: FeatureFlagCategory.CORE,
  [FeatureFlags.SSO_INTEGRATION]: FeatureFlagCategory.CORE,
  [FeatureFlags.CUSTOM_BRANDING]: FeatureFlagCategory.CORE,
  [FeatureFlags.ADVANCED_SEARCH]: FeatureFlagCategory.CORE,
  [FeatureFlags.AUDITING]: FeatureFlagCategory.CORE,
  [FeatureFlags.REPORTING]: FeatureFlagCategory.CORE,
  
  // AI Features
  [FeatureFlags.AI_DOCUMENT_ANALYSIS]: FeatureFlagCategory.AI,
  [FeatureFlags.SENTIMENT_ANALYSIS]: FeatureFlagCategory.AI,
  [FeatureFlags.PROJECT_VISUALIZATION]: FeatureFlagCategory.AI,
  [FeatureFlags.CONTEXTUAL_INSIGHTS]: FeatureFlagCategory.AI,
  [FeatureFlags.ENTITY_RELATIONSHIP]: FeatureFlagCategory.AI,
  [FeatureFlags.TOPIC_MODELING]: FeatureFlagCategory.AI,
  [FeatureFlags.AUTOMATIC_CATEGORIZATION]: FeatureFlagCategory.AI,
  [FeatureFlags.SIMILARITY_MATCHING]: FeatureFlagCategory.AI,
  
  // Governance
  [FeatureFlags.MODEL_GOVERNANCE]: FeatureFlagCategory.GOVERNANCE,
  [FeatureFlags.ENHANCED_SECURITY]: FeatureFlagCategory.GOVERNANCE,
  [FeatureFlags.TENANT_ISOLATION]: FeatureFlagCategory.GOVERNANCE,
  [FeatureFlags.AUDIT_TRAIL]: FeatureFlagCategory.GOVERNANCE,
  [FeatureFlags.DATA_RESIDENCY]: FeatureFlagCategory.GOVERNANCE,
  [FeatureFlags.DATA_ENCRYPTION]: FeatureFlagCategory.GOVERNANCE,
  
  // Scalability
  [FeatureFlags.SCALABILITY_CONTROLS]: FeatureFlagCategory.SCALABILITY,
  [FeatureFlags.DISTRIBUTED_PROCESSING]: FeatureFlagCategory.SCALABILITY,
  [FeatureFlags.PRIORITY_PROCESSING]: FeatureFlagCategory.SCALABILITY,
  [FeatureFlags.BATCH_PROCESSING]: FeatureFlagCategory.SCALABILITY,
  [FeatureFlags.ASYNC_PROCESSING]: FeatureFlagCategory.SCALABILITY,
  
  // Administration
  [FeatureFlags.ENTERPRISE_ADMIN]: FeatureFlagCategory.ADMINISTRATION,
  [FeatureFlags.USAGE_ANALYTICS]: FeatureFlagCategory.ADMINISTRATION,
  [FeatureFlags.MODEL_REGISTRY]: FeatureFlagCategory.ADMINISTRATION,
  [FeatureFlags.LICENSE_MANAGEMENT]: FeatureFlagCategory.ADMINISTRATION,
  [FeatureFlags.SYSTEM_HEALTH]: FeatureFlagCategory.ADMINISTRATION,
  
  // Integration
  [FeatureFlags.ENTERPRISE_INTEGRATIONS]: FeatureFlagCategory.INTEGRATION,
  [FeatureFlags.DATA_EXPORT]: FeatureFlagCategory.INTEGRATION,
  [FeatureFlags.WEBHOOK_SUPPORT]: FeatureFlagCategory.INTEGRATION,
  [FeatureFlags.API_ACCESS_CONTROL]: FeatureFlagCategory.INTEGRATION,
  [FeatureFlags.CUSTOM_AUTHENTICATION]: FeatureFlagCategory.INTEGRATION,
  
  // Experimental
  [FeatureFlags.SUMMARIZATION]: FeatureFlagCategory.EXPERIMENTAL,
  [FeatureFlags.RELEVANCE_RANKING]: FeatureFlagCategory.EXPERIMENTAL,
  [FeatureFlags.KNOWLEDGE_EXTRACTION]: FeatureFlagCategory.EXPERIMENTAL,
  [FeatureFlags.GENERATIVE_AI]: FeatureFlagCategory.EXPERIMENTAL,
  [FeatureFlags.MULTI_MODEL_SUPPORT]: FeatureFlagCategory.EXPERIMENTAL
};