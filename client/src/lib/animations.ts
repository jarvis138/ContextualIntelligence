/**
 * Animation library for Novexa
 * 
 * This file contains reusable animation configurations using Framer Motion
 */

import { Variants } from "framer-motion";

// Animation speeds 
export const QUICK_TRANSITION = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  duration: 0.2
};

export const MEDIUM_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 25,
  duration: 0.4
};

export const SLOW_TRANSITION = {
  type: "spring",
  stiffness: 200,
  damping: 20,
  duration: 0.6
};

// Fade animation variants
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: MEDIUM_TRANSITION },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

// Scale animation variants
export const scaleVariants: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: QUICK_TRANSITION },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } }
};

// Slide up animation variants
export const slideUpVariants: Variants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: MEDIUM_TRANSITION },
  exit: { y: 20, opacity: 0, transition: { duration: 0.2 } }
};

// Slide down animation variants
export const slideDownVariants: Variants = {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: MEDIUM_TRANSITION },
  exit: { y: -20, opacity: 0, transition: { duration: 0.2 } }
};

// Slide in from left animation variants
export const slideInLeftVariants: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: MEDIUM_TRANSITION },
  exit: { x: -20, opacity: 0, transition: { duration: 0.2 } }
};

// Slide in from right animation variants
export const slideInRightVariants: Variants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: MEDIUM_TRANSITION },
  exit: { x: 20, opacity: 0, transition: { duration: 0.2 } }
};

// Staggered container animation variants
export const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1
    }
  }
};

// List item animation variants for use with containerVariants
export const listItemVariants: Variants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: QUICK_TRANSITION },
  exit: { y: 20, opacity: 0, transition: { duration: 0.2 } }
};

// Card animation variants
export const cardVariants: Variants = {
  initial: { y: 15, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: MEDIUM_TRANSITION },
  exit: { y: 15, opacity: 0, transition: { duration: 0.2 } },
  hover: { y: -5, transition: QUICK_TRANSITION }
};

// Button animation variants
export const buttonVariants: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: QUICK_TRANSITION },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } },
  tap: { scale: 0.97, transition: { duration: 0.1 } }
};

// Page transition variants
export const pageVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.2 } }
};

// Modal/dialog animation variants
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10, 
    transition: { 
      duration: 0.2 
    } 
  }
};

// Tooltip animation variants
export const tooltipVariants: Variants = {
  initial: { opacity: 0, y: 5, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 30 
    } 
  },
  exit: { 
    opacity: 0, 
    y: 5, 
    scale: 0.95, 
    transition: { 
      duration: 0.15 
    } 
  }
};

// Helper function to get animation speed based on user preference
export const getAnimationSpeed = (speed: string) => {
  switch (speed) {
    case 'fast':
      return QUICK_TRANSITION;
    case 'slow':
      return SLOW_TRANSITION;
    case 'none':
      return { duration: 0 };
    case 'medium':
    default:
      return MEDIUM_TRANSITION;
  }
};

// Helper function to disable animations based on user preference
export const shouldReduceMotion = (): boolean => {
  // Check if the user has set a system preference for reduced motion
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Also check for a class on the document element that our preferences system might set
    const documentHasReduceMotion = document.documentElement.classList.contains('reduce-motion');
    
    return prefersReducedMotion || documentHasReduceMotion;
  }
  
  return false;
};

// Function to get appropriate variants based on motion preferences
export const getAccessibleVariants = (variants: Variants, reduceMotion: boolean = shouldReduceMotion()): Variants => {
  if (reduceMotion) {
    // Return only opacity changes without position animations for reduced motion
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.15 } }
    };
  }
  
  return variants;
};