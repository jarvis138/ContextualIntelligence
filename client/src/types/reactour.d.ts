declare module 'reactour' {
  import React from 'react';

  export interface StepType {
    selector?: string;
    content: React.ReactNode;
    position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
    action?: () => void;
    style?: React.CSSProperties;
    stepInteraction?: boolean;
    navDotAriaLabel?: string;
    highlightedMaskClassName?: string;
  }

  export interface TourProps {
    steps: StepType[];
    isOpen: boolean;
    onRequestClose: () => void;
    accentColor?: string;
    className?: string;
    closeButtonText?: React.ReactNode;
    disableInteraction?: boolean;
    disableKeyboardNavigation?: boolean | string[];
    highlightedMaskClassName?: string;
    inViewThreshold?: number;
    lastStepNextButton?: React.ReactNode;
    maskClassName?: string;
    maskSpace?: number;
    nextButton?: React.ReactNode;
    onAfterOpen?: () => void;
    prevButton?: React.ReactNode;
    rounded?: number;
    scrollDuration?: number;
    scrollOffset?: number;
    showButtons?: boolean;
    showCloseButton?: boolean;
    showNavigation?: boolean;
    showNavigationNumber?: boolean;
    startAt?: number;
    getCurrentStep?: (current: number) => void;
    showNumber?: boolean;
    goToStep?: number;
    disableFocusLock?: boolean;
    disableDotsNavigation?: boolean;
    style?: React.CSSProperties;
  }

  const Tour: React.FC<TourProps>;
  export default Tour;
}