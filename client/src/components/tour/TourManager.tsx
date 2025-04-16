import React from 'react';
import Tour from 'reactour';
import { useTourContext } from '@/contexts/TourContext';
import tourConfig from '@/config/tourSteps';

export function TourManager() {
  const { isTourOpen, activeTour, closeTour } = useTourContext();

  // Only render the tour if we have an active tour
  if (!activeTour) {
    return null;
  }

  // Get the steps for the active tour
  const steps = tourConfig[activeTour] || [];

  return (
    <Tour
      steps={steps}
      isOpen={isTourOpen}
      onRequestClose={closeTour}
      accentColor="#0070f3"
      rounded={8}
      showNumber={true}
      showNavigation={true}
      showButtons={true}
      disableKeyboardNavigation={false}
      disableInteraction={false}
      maskSpace={10}
      className="cpi-hub-tour"
      closeButtonText="✕"
      lastStepNextButton={<span>Finish</span>}
    />
  );
}