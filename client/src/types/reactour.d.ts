declare module 'reactour' {
  import { ReactNode, ComponentType } from 'react';

  export interface StepType {
    selector?: string;
    content: ReactNode;
    action?: () => void;
    position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
    stepInteraction?: boolean;
    navDotAriaLabel?: string;
    highlightedSelectors?: string[];
    mutationObservables?: string[];
    resizeObservables?: string[];
    padding?: number;
    style?: React.CSSProperties;
  }

  export interface TourProps {
    steps: StepType[];
    isOpen: boolean;
    onRequestClose: () => void;
    rounded?: number;
    accentColor?: string;
    closeButtonText?: ReactNode;
    prevButton?: ReactNode;
    nextButton?: ReactNode;
    lastStepNextButton?: ReactNode;
    showCloseButton?: boolean;
    showNavigation?: boolean;
    showNavigationNumber?: boolean;
    disableInteraction?: boolean;
    disableKeyboardNavigation?: boolean;
    highlightedMaskClassName?: string;
    maskClassName?: string;
    className?: string;
    onAfterOpen?: (target: HTMLElement) => void;
    badgeContent?: (badgeProps: { current: number; total: number }) => ReactNode;
    startAt?: number;
  }

  export const Tour: ComponentType<TourProps>;
  export const TourProvider: ComponentType<{ children: ReactNode; styles?: any }>;
  export const useTour: () => {
    currentStep: number;
    setCurrentStep: (step: number) => void;
    steps: StepType[];
    setSteps: (steps: StepType[]) => void;
  };
}