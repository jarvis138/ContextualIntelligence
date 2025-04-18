/**
 * Novexa Design System Colors
 * Based on UI/UX requirements document
 */

export const colors = {
  // Primary brand colors
  primary: {
    main: '#2563EB', // Brand Blue
    light: '#3B82F6',
    dark: '#1D4ED8',
  },
  
  // Secondary colors
  secondary: {
    main: '#10B981', // Success Green
    light: '#34D399',
    dark: '#059669',
  },
  
  // Accent colors
  accent: {
    main: '#8B5CF6', // Purple
    light: '#A78BFA',
    dark: '#7C3AED',
  },
  
  // Feedback colors
  feedback: {
    error: '#EF4444', // Red
    warning: '#F59E0B', // Orange
    info: '#3B82F6', // Light Blue
    success: '#10B981', // Same as secondary
  },
  
  // Neutral colors
  neutral: {
    dark: '#0F172A',
    medium: '#94A3B8',
    light: '#F1F5F9',
  },
  
  // Shadowing
  shadow: {
    level1: '0px 1px 3px rgba(0,0,0,0.1)',
    level2: '0px 4px 6px rgba(0,0,0,0.1)',
    level3: '0px 10px 15px rgba(0,0,0,0.1)',
    level4: '0px 20px 25px rgba(0,0,0,0.1)',
  },
};

// Border radius values
export const borderRadius = {
  small: '4px',  // buttons, input fields
  medium: '8px', // cards, panels
  large: '12px', // modals, drawers
};

// Transition durations
export const transitions = {
  fast: '100ms',
  standard: '200ms',
  complex: '300ms',
};

export default colors;