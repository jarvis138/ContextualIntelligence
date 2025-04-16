import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface TourContextType {
  isTourOpen: boolean;
  activeTour: string | null;
  startTour: (tourName: string) => void;
  closeTour: () => void;
}

const TourContext = createContext<TourContextType>({
  isTourOpen: false,
  activeTour: null,
  startTour: () => {},
  closeTour: () => {},
});

interface TourContextProviderProps {
  children: ReactNode;
}

export const TourContextProvider = ({ children }: TourContextProviderProps) => {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<string | null>(null);

  const startTour = useCallback((tourName: string) => {
    setActiveTour(tourName);
    setIsTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    // We don't reset activeTour immediately to allow for exit animations
    setTimeout(() => {
      setActiveTour(null);
    }, 300);
  }, []);

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