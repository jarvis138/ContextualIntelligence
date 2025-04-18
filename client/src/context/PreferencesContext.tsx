import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  UserPreferences, 
  defaultPreferences, 
  getUserPreferences, 
  updateUserPreferences,
  applyThemePreferences
} from '@/lib/user-preferences';

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user preferences on component mount
  useEffect(() => {
    const loadPreferences = () => {
      const savedPreferences = getUserPreferences();
      setPreferences(savedPreferences);
      setIsInitialized(true);
    };

    loadPreferences();
  }, []);

  // Apply theme preferences whenever they change
  useEffect(() => {
    if (isInitialized) {
      applyThemePreferences();
    }
  }, [isInitialized, preferences.ui.theme]);

  // Update user preferences
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    const newPreferences = updateUserPreferences(updates);
    setPreferences(newPreferences);
  };

  // Reset preferences to defaults
  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    updateUserPreferences(defaultPreferences);
  };

  const value = {
    preferences,
    updatePreferences,
    resetPreferences
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};