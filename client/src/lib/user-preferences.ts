import { AnimationSpeed } from './animations';

// Define preference types

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'violet' | 'green' | 'orange' | 'red' | 'neutral';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full';
export type ViewMode = 'table' | 'grid' | 'list';

/**
 * User preferences schema
 */
export interface UserPreferences {
  theme: {
    mode: ThemeMode;
    accentColor: AccentColor;
    borderRadius: BorderRadius;
    animations: AnimationSpeed;
    reduceMotion: boolean;
    contrastMode: boolean;
  };
  layout: {
    sidebarCollapsed: boolean;
    denseMode: boolean;
    defaultView: ViewMode;
    showDocumentPreview: boolean;
  };
  ai: {
    aiSuggestions: boolean;
    personalization: boolean;
    collectUsageData: boolean;
  };
}

/**
 * Default user preferences
 */
export const defaultPreferences: UserPreferences = {
  theme: {
    mode: 'system',
    accentColor: 'blue', // Changed to #0B4C79 
    borderRadius: 'medium',
    animations: 'medium',
    reduceMotion: false,
    contrastMode: false,
  },
  layout: {
    sidebarCollapsed: false,
    denseMode: false,
    defaultView: 'table',
    showDocumentPreview: true,
  },
  ai: {
    aiSuggestions: true,
    personalization: true,
    collectUsageData: false,
  }
};

const PREFERENCES_STORAGE_KEY = 'novexa-user-preferences';

/**
 * Save user preferences to localStorage
 */
export const savePreferences = (preferences: UserPreferences): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save user preferences:', error);
  }
};

/**
 * Load user preferences from localStorage
 */
export const loadPreferences = (): UserPreferences => {
  if (typeof window === 'undefined') return defaultPreferences;
  
  try {
    const storedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    
    if (!storedPreferences) {
      return defaultPreferences;
    }
    
    const parsedPreferences = JSON.parse(storedPreferences) as UserPreferences;
    
    // Merge with default preferences to handle missing properties
    // if the stored preferences are from an older version
    return {
      theme: { ...defaultPreferences.theme, ...parsedPreferences.theme },
      layout: { ...defaultPreferences.layout, ...parsedPreferences.layout },
      ai: { ...defaultPreferences.ai, ...parsedPreferences.ai },
    };
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    return defaultPreferences;
  }
};

/**
 * Apply theme according to user preferences
 */
export const applyTheme = (preferences: UserPreferences): void => {
  if (typeof window === 'undefined' || !preferences) return;
  
  const root = document.documentElement;
  
  // Apply theme mode
  if (preferences.theme.mode === 'dark' || 
     (preferences.theme.mode === 'system' && 
      window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Apply high contrast if enabled
  if (preferences.theme.contrastMode) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
  
  // Apply reduced motion if enabled or system preference
  if (preferences.theme.reduceMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
  
  // Apply border radius
  root.style.setProperty('--radius', getBorderRadiusValue(preferences.theme.borderRadius));
}

/**
 * Get CSS value for border radius
 */
const getBorderRadiusValue = (radius: BorderRadius): string => {
  switch (radius) {
    case 'none': return '0';
    case 'small': return '0.25rem';
    case 'medium': return '0.5rem';
    case 'large': return '0.75rem';
    case 'full': return '9999px';
    default: return '0.5rem';
  }
};