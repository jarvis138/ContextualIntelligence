import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { UserPreferences, defaultPreferences, savePreferences, loadPreferences } from '@/lib/user-preferences';

interface PreferencesContextType {
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences, S extends keyof UserPreferences[K], V extends UserPreferences[K][S]>(
    category: K, 
    setting: S, 
    value: V
  ) => void;
  resetPreferences: () => void;
  hasLoaded: boolean;
}

const PreferencesContext = createContext<PreferencesContextType>({
  preferences: defaultPreferences,
  setPreference: () => {},
  resetPreferences: () => {},
  hasLoaded: false,
});

export const usePreferences = () => useContext(PreferencesContext);

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadedPreferences = loadPreferences();
    setPreferences(loadedPreferences);
    setHasLoaded(true);
  }, []);
  
  // Update preference setting
  const setPreference = <K extends keyof UserPreferences, S extends keyof UserPreferences[K], V extends UserPreferences[K][S]>(
    category: K, 
    setting: S, 
    value: V
  ) => {
    setPreferences(prev => {
      // Create new object to ensure reactivity
      const newPreferences = { 
        ...prev, 
        [category]: { 
          ...prev[category], 
          [setting]: value 
        } 
      };
      
      // Save to localStorage
      savePreferences(newPreferences);
      
      return newPreferences;
    });
  };
  
  // Reset preferences to default values
  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    savePreferences(defaultPreferences);
  };
  
  return (
    <PreferencesContext.Provider 
      value={{ 
        preferences, 
        setPreference, 
        resetPreferences,
        hasLoaded
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};