/**
 * Feature Flag Hook
 * 
 * This hook provides a way to check if a feature flag is enabled in React components.
 * It connects to the server-side feature flag system and caches results for performance.
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

// Feature flag types from shared library
export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number;
  enabledForUserIds?: number[];
  enabledForRoles?: string[];
}

// Interface for the feature flag context
interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  isFlagsLoading: boolean;
  flagsError: Error | null;
  refreshFlags: () => Promise<void>;
}

// Create context for feature flags
const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

// This would normally import from shared, but we'll redefine here for simplicity
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
  
  // Integration features
  SLACK_INTEGRATION: 'slack-integration',
  GOOGLE_DRIVE_INTEGRATION: 'google-drive-integration',
  MICROSOFT_GRAPH_INTEGRATION: 'microsoft-graph-integration',
  EMAIL_INTEGRATION: 'email-integration',
} as const;

/**
 * Feature Flag Provider Component
 * 
 * Provides feature flag information to all child components
 */
export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  
  // Query for fetching feature flags from the server
  const { 
    data: featureFlags,
    error: flagsError,
    isLoading: isFlagsLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/feature-flags'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Only fetch if user is logged in
    enabled: !!user,
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
  
  // Update flags when data changes
  useEffect(() => {
    if (featureFlags) {
      const newFlags: Record<string, boolean> = {};
      
      // Process feature flags from the server
      featureFlags.forEach((flag: FeatureFlag) => {
        // Check if the flag is enabled for this user
        let isEnabled = flag.enabled;
        
        // Apply rollout percentage if defined
        if (isEnabled && flag.rolloutPercentage !== undefined) {
          // Generate a consistent hash for the user ID for stable percentage rollout
          const userIdHash = user?.id ? hashCode(user.id.toString()) : Math.random();
          const normalizedHash = (userIdHash % 100) / 100; // Normalize to 0-1
          
          isEnabled = normalizedHash <= (flag.rolloutPercentage / 100);
        }
        
        // Check user-specific enabling
        if (!isEnabled && flag.enabledForUserIds && user?.id) {
          isEnabled = flag.enabledForUserIds.includes(user.id);
        }
        
        // Check role-specific enabling
        if (!isEnabled && flag.enabledForRoles && user?.role) {
          isEnabled = flag.enabledForRoles.includes(user.role);
        }
        
        newFlags[flag.name] = isEnabled;
      });
      
      setFlags(newFlags);
    }
  }, [featureFlags, user]);
  
  // If no flags are loaded, provide some reasonable defaults
  useEffect(() => {
    if (!featureFlags && !isFlagsLoading) {
      const defaultFlags: Record<string, boolean> = {
        // Core features (default off)
        [FeatureFlags.ADVANCED_SEARCH]: false,
        [FeatureFlags.DOCUMENT_RELATIONSHIPS]: false,
        [FeatureFlags.AI_INSIGHTS]: false,
        [FeatureFlags.REAL_TIME_COLLABORATION]: false,
        
        // UI features (default on for some basics)
        [FeatureFlags.CUSTOM_DASHBOARDS]: false,
        [FeatureFlags.DARK_MODE]: true,
        [FeatureFlags.VISUALIZATION_TOOLS]: false,
        
        // Infrastructure (default off for advanced)
        [FeatureFlags.ENHANCED_LOGGING]: false,
        [FeatureFlags.METRICS_DASHBOARD]: false,
        [FeatureFlags.DISTRIBUTED_TRACING]: false,
        
        // AI features (default off)
        [FeatureFlags.DOCUMENT_SUMMARIZATION]: false,
        [FeatureFlags.ENTITY_RECOGNITION]: false,
        [FeatureFlags.SENTIMENT_ANALYSIS]: false,
        [FeatureFlags.TOPIC_MODELING]: false,
        
        // Integration features (depends on configuration)
        [FeatureFlags.SLACK_INTEGRATION]: false,
        [FeatureFlags.GOOGLE_DRIVE_INTEGRATION]: false,
        [FeatureFlags.MICROSOFT_GRAPH_INTEGRATION]: false,
        [FeatureFlags.EMAIL_INTEGRATION]: false,
      };
      
      setFlags(defaultFlags);
    }
  }, [featureFlags, isFlagsLoading]);
  
  // Function to refresh flags
  const refreshFlags = async () => {
    await refetch();
  };
  
  return (
    <FeatureFlagContext.Provider value={{ 
      flags, 
      isFlagsLoading, 
      flagsError: flagsError as Error | null,
      refreshFlags
    }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook for accessing feature flags
 * 
 * @param flagName Name of the feature flag to check
 * @returns Boolean indicating if the feature is enabled
 */
export function useFeatureFlag(flagName: string): boolean {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error('useFeatureFlag must be used within a FeatureFlagProvider');
  }
  
  return context.flags[flagName] || false;
}

/**
 * Hook for accessing all feature flags
 * 
 * @returns Object with all feature flags and loading state
 */
export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  
  return context;
}

/**
 * Helper function to generate a numeric hash from a string
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}