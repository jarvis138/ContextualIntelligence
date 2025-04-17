import React from 'react';
import Tour from 'reactour';
import { useTourContext } from '@/contexts/TourContext';
import tourConfig from '@/config/tourSteps';
import { ArrowRight, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom styles for buttons
const buttonStyles = {
  backgroundColor: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

// Add custom CSS for the tour in index.css
export function TourManager() {
  const { isTourOpen, activeTour, closeTour } = useTourContext();

  // Only render the tour if we have an active tour
  if (!activeTour) {
    return null;
  }

  // Get the steps for the active tour
  const steps = tourConfig[activeTour] || [];

  // Add custom styles to each step
  const enhancedSteps = steps.map(step => ({
    ...step,
    content: (
      <div className="p-2">
        {step.content}
      </div>
    )
  }));

  return (
    <Tour
      steps={enhancedSteps}
      isOpen={isTourOpen}
      onRequestClose={closeTour}
      accentColor="var(--primary)"
      rounded={12}
      showNumber={true}
      showNavigation={true}
      showButtons={true}
      disableKeyboardNavigation={false}
      disableInteraction={false}
      maskSpace={10}
      className={cn("cpi-hub-tour rounded-xl shadow-xl")}
      closeButtonText={<X size={18} />}
      nextButton={<div style={buttonStyles}>Next <ArrowRight size={16} /></div>}
      prevButton={<div style={{...buttonStyles, backgroundColor: 'var(--muted)'}}>Previous</div>}
      lastStepNextButton={<div style={buttonStyles}>Finish <Check size={16} /></div>}
    />
  );
}