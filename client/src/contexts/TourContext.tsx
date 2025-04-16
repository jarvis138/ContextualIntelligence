import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TourProvider as ReactourProvider } from 'reactour';

interface TourContextType {
  isTourOpen: boolean;
  startTour: (tourName?: string) => void;
  closeTour: () => void;
  currentTour: string | null;
  // Track which tours have been completed
  completedTours: Record<string, boolean>;
  markTourAsCompleted: (tourName: string) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [completedTours, setCompletedTours] = useState<Record<string, boolean>>({});

  // Load completed tours from localStorage on initial render
  useEffect(() => {
    try {
      const savedTours = localStorage.getItem('cpi_completed_tours');
      if (savedTours) {
        setCompletedTours(JSON.parse(savedTours));
      }
    } catch (error) {
      console.error('Error loading completed tours from localStorage', error);
    }
  }, []);

  // Save completed tours to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('cpi_completed_tours', JSON.stringify(completedTours));
    } catch (error) {
      console.error('Error saving completed tours to localStorage', error);
    }
  }, [completedTours]);

  // Check if it's the user's first visit to show welcome tour
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('cpi_has_visited');
    if (!hasVisitedBefore) {
      // Set a small delay to let the UI render first
      const timer = setTimeout(() => {
        startTour('welcome');
        localStorage.setItem('cpi_has_visited', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = (tourName: string = 'welcome') => {
    setCurrentTour(tourName);
    setIsTourOpen(true);
  };

  const closeTour = () => {
    setIsTourOpen(false);
  };

  const markTourAsCompleted = (tourName: string) => {
    setCompletedTours((prev) => ({ ...prev, [tourName]: true }));
  };

  // Tour styling options
  const tourStyles = {
    popover: (base: any) => ({
      ...base,
      '--reactour-accent': 'var(--primary)',
      borderRadius: 8,
      boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)',
    }),
    maskArea: (base: any) => ({
      ...base,
      rx: 8,
    }),
    badge: (base: any) => ({
      ...base,
      background: 'var(--primary)',
    }),
    close: (base: any) => ({
      ...base,
      color: 'var(--foreground)',
    }),
    dot: (base: any, { current }: any) => ({
      ...base,
      background: current ? 'var(--primary)' : 'var(--muted)',
    }),
  };

  return (
    <TourContext.Provider
      value={{
        isTourOpen,
        startTour,
        closeTour,
        currentTour,
        completedTours,
        markTourAsCompleted,
      }}
    >
      <ReactourProvider styles={tourStyles}>{children}</ReactourProvider>
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}