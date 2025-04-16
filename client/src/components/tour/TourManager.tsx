import React from 'react';
import Tour from 'reactour';
import { useTourContext } from '@/contexts/TourContext';
import tourConfig from '@/config/tourSteps';

export function TourManager() {
  const { isTourOpen, activeTour, closeTour } = useTourContext();

  // Get the active tour steps from config
  const steps = activeTour ? tourConfig[activeTour] : [];

  return (
    <Tour
      steps={steps}
      isOpen={isTourOpen}
      onRequestClose={closeTour}
      rounded={8}
      accentColor="#0284c7" // Primary color from theme
      closeButtonText="Close"
      showCloseButton={true}
      showNavigation={true}
      showNavigationNumber={true}
      lastStepNextButton={<button>Finish</button>}
      prevButton={<button>Previous</button>}
      nextButton={<button>Next</button>}
    />
  );
}