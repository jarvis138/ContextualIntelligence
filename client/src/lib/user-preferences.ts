/**
 * User preferences configuration for Novexa 
 * Controls notification settings, theme preferences, and application behavior
 */

import { z } from "zod";

// Theme related types
export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "violet" | "green" | "orange" | "red" | "neutral";
export type BorderRadius = "none" | "small" | "medium" | "large" | "full";
export type AnimationSpeed = "none" | "slow" | "medium" | "fast";

// Notification settings schemas
export const notificationSchema = z.object({
  email: z.object({
    enabled: z.boolean().default(true),
    dailyDigest: z.boolean().default(true),
    mentions: z.boolean().default(true),
    documentUpdates: z.boolean().default(true),
    projectUpdates: z.boolean().default(true),
    taskAssignments: z.boolean().default(true),
    teamAnnouncements: z.boolean().default(true),
    securityAlerts: z.boolean().default(true),
  }),
  inApp: z.object({
    enabled: z.boolean().default(true),
    mentions: z.boolean().default(true),
    documentUpdates: z.boolean().default(true),
    projectUpdates: z.boolean().default(true),
    taskAssignments: z.boolean().default(true),
    teamAnnouncements: z.boolean().default(true),
    securityAlerts: z.boolean().default(true),
    sound: z.boolean().default(true),
  }),
  desktop: z.object({
    enabled: z.boolean().default(true),
    mentions: z.boolean().default(true),
    documentUpdates: z.boolean().default(true),
    projectUpdates: z.boolean().default(false),
    taskAssignments: z.boolean().default(true),
    teamAnnouncements: z.boolean().default(false),
    securityAlerts: z.boolean().default(true),
  }),
  slack: z.object({
    enabled: z.boolean().default(false),
    mentions: z.boolean().default(true),
    documentUpdates: z.boolean().default(false),
    projectUpdates: z.boolean().default(false),
    taskAssignments: z.boolean().default(true),
    teamAnnouncements: z.boolean().default(false),
    securityAlerts: z.boolean().default(false),
  }),
});

// User interface preferences schema
export const uiPreferencesSchema = z.object({
  theme: z.object({
    mode: z.enum(["light", "dark", "system"]).default("system"),
    accentColor: z.enum(["blue", "violet", "green", "orange", "red", "neutral"]).default("blue"),
    borderRadius: z.enum(["none", "small", "medium", "large", "full"]).default("medium"),
    animations: z.enum(["none", "slow", "medium", "fast"]).default("medium"),
    reduceMotion: z.boolean().default(false),
    contrastMode: z.boolean().default(false),
  }),
  layout: z.object({
    sidebarCollapsed: z.boolean().default(false),
    denseMode: z.boolean().default(false),
    defaultView: z.enum(["grid", "list", "table"]).default("grid"),
    showDocumentPreview: z.boolean().default(true),
  }),
  ai: z.object({
    autoSuggestions: z.boolean().default(true),
    showConfidence: z.boolean().default(true),
    autoCreateTasks: z.boolean().default(false),
  }),
});

// Full user preference schema
export const userPreferencesSchema = z.object({
  notifications: notificationSchema,
  ui: uiPreferencesSchema,
  privacy: z.object({
    shareUsageData: z.boolean().default(true),
    documentIndexing: z.boolean().default(true),
  }),
  accessibility: z.object({
    screenReader: z.boolean().default(false),
    highContrast: z.boolean().default(false),
    largeText: z.boolean().default(false),
    reducedMotion: z.boolean().default(false),
  }),
});

// Type for the user preferences
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Default user preferences
export const defaultPreferences: UserPreferences = {
  notifications: {
    email: {
      enabled: true,
      dailyDigest: true,
      mentions: true,
      documentUpdates: true,
      projectUpdates: true,
      taskAssignments: true,
      teamAnnouncements: true,
      securityAlerts: true,
    },
    inApp: {
      enabled: true,
      mentions: true,
      documentUpdates: true,
      projectUpdates: true,
      taskAssignments: true,
      teamAnnouncements: true,
      securityAlerts: true,
      sound: true,
    },
    desktop: {
      enabled: true,
      mentions: true,
      documentUpdates: true,
      projectUpdates: false,
      taskAssignments: true,
      teamAnnouncements: false,
      securityAlerts: true,
    },
    slack: {
      enabled: false,
      mentions: true,
      documentUpdates: false,
      projectUpdates: false,
      taskAssignments: true,
      teamAnnouncements: false,
      securityAlerts: false,
    },
  },
  ui: {
    theme: {
      mode: "system",
      accentColor: "blue",
      borderRadius: "medium",
      animations: "medium",
      reduceMotion: false,
      contrastMode: false,
    },
    layout: {
      sidebarCollapsed: false,
      denseMode: false,
      defaultView: "grid",
      showDocumentPreview: true,
    },
    ai: {
      autoSuggestions: true,
      showConfidence: true,
      autoCreateTasks: false,
    },
  },
  privacy: {
    shareUsageData: true,
    documentIndexing: true,
  },
  accessibility: {
    screenReader: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
  },
};

// Helper functions
export function getUserPreferences(): UserPreferences {
  try {
    const storedPreferences = localStorage.getItem('userPreferences');
    if (storedPreferences) {
      const parsedPreferences = JSON.parse(storedPreferences);
      return userPreferencesSchema.parse(parsedPreferences);
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  
  return defaultPreferences;
}

export function saveUserPreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

export function updateUserPreferences(updates: Partial<UserPreferences>): UserPreferences {
  const currentPreferences = getUserPreferences();
  const newPreferences = {
    ...currentPreferences,
    ...updates,
    notifications: {
      ...currentPreferences.notifications,
      ...(updates.notifications || {}),
    },
    ui: {
      ...currentPreferences.ui,
      ...(updates.ui || {}),
    },
    privacy: {
      ...currentPreferences.privacy,
      ...(updates.privacy || {}),
    },
    accessibility: {
      ...currentPreferences.accessibility,
      ...(updates.accessibility || {}),
    },
  };
  
  saveUserPreferences(newPreferences);
  return newPreferences;
}

// Apply theme preferences based on saved settings
export function applyThemePreferences(): void {
  const preferences = getUserPreferences();
  const { mode, accentColor, borderRadius, contrastMode, reduceMotion } = preferences.ui.theme;
  
  // Apply theme mode
  if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Apply accent color
  document.documentElement.style.setProperty('--color-primary', `var(--color-${accentColor}-500)`);
  document.documentElement.style.setProperty('--color-primary-foreground', `var(--color-${accentColor}-50)`);
  
  // Apply border radius
  const radiusMap = {
    none: '0px',
    small: '0.25rem',
    medium: '0.375rem',
    large: '0.5rem',
    full: '9999px',
  };
  document.documentElement.style.setProperty('--radius', radiusMap[borderRadius]);
  
  // Apply contrast mode
  if (contrastMode) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }
  
  // Apply reduced motion
  if (reduceMotion) {
    document.documentElement.classList.add('reduce-motion');
  } else {
    document.documentElement.classList.remove('reduce-motion');
  }
}