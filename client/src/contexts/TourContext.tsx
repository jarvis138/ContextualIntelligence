import React, { createContext, useContext, useState, ReactNode } from 'react';
import tourConfig from '@/config/tourSteps';

interface TourContextType {
  isTourOpen: boolean;
  activeTour: string | null;
  startTour: (tourName: string) => void;
  closeTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourContextProviderProps {
  children: ReactNode;
}

export const TourContextProvider = ({ children }: TourContextProviderProps) => {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<string | null>(null);

  const startTour = (tourName: string) => {
    if (tourConfig[tourName]) {
      setActiveTour(tourName);
      setIsTourOpen(true);
    } else {
      console.error(`Tour "${tourName}" not found in config`);
    }
  };

  const closeTour = () => {
    setIsTourOpen(false);
    // Keep the active tour in state so we can restart it if needed
  };

  return (
    <TourContext.Provider value={{ isTourOpen, activeTour, startTour, closeTour }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTourContext = (): TourContextType => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTourContext must be used within a TourContextProvider');
  }
  return context;
};