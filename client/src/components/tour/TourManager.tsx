import React, { useEffect, useMemo } from 'react';
import { Tour } from 'reactour';
import tourConfig from '@/config/tourSteps';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';

/**
 * TourManager - Manages different tours throughout the application
 * This component renders the appropriate tour based on the current context
 */
export function TourManager() {
  const { 
    isTourOpen, 
    closeTour, 
    currentTour, 
    markTourAsCompleted 
  } = useTour();

  // Get the steps for the current tour
  const steps = useMemo(() => {
    if (!currentTour) return [];
    return tourConfig[currentTour] || [];
  }, [currentTour]);

  // Mark the tour as completed when it's closed
  const handleTourClose = () => {
    if (currentTour) {
      markTourAsCompleted(currentTour);
    }
    closeTour();
  };

  // Customize the tour navigation buttons
  const prevButton = (
    <Button variant="outline" size="sm">
      Previous
    </Button>
  );

  const nextButton = (
    <Button size="sm">
      Next
    </Button>
  );

  // Add keyboard event listeners for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTourOpen) return;
      
      if (e.key === 'Escape') {
        handleTourClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourOpen]);

  if (!isTourOpen || steps.length === 0) {
    return null;
  }

  return (
    <Tour
      steps={steps}
      isOpen={isTourOpen}
      onRequestClose={handleTourClose}
      rounded={8}
      accentColor="var(--primary)"
      closeButtonText="✕"
      prevButton={prevButton}
      nextButton={nextButton}
      lastStepNextButton={
        <Button size="sm">
          Finish
        </Button>
      }
      showCloseButton={true}
      showNavigation={true}
      showNavigationNumber={true}
      disableInteraction={false}
      disableKeyboardNavigation={false}
      highlightedMaskClassName="tour-highlighted-mask"
      maskClassName="tour-mask"
      className="tour-helper"
      onAfterOpen={(target) => {
        // Automatically scroll to the target element
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }}
    />
  );
}