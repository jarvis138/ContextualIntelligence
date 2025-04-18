import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { pageVariants, getAnimationSpeed, shouldReduceMotion } from '@/lib/animations';
import { usePreferences } from '@/context/PreferencesContext';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  customVariants?: any;
}

/**
 * PageTransition component
 * Wraps page content with motion animations for smooth transitions
 * Respects user accessibility preferences for reduced motion
 */
const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className = "",
  customVariants
}) => {
  const [location] = useLocation();
  const { preferences } = usePreferences();
  
  // Determine if animations should be reduced or disabled
  const reduceMotion = shouldReduceMotion() || 
    preferences?.accessibility?.reducedMotion || 
    preferences?.ui?.theme?.reduceMotion;
  
  // Determine animation speed from user preferences
  const animationSpeed = preferences?.ui?.theme?.animations || 'medium';
  const transition = getAnimationSpeed(animationSpeed);
  
  // Use custom variants if provided, otherwise use default page variants
  const variants = customVariants || pageVariants;
  
  // If reduced motion is enabled, handle animations appropriately
  const animationProps = reduceMotion 
    ? { 
        initial: false, 
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.15 } },
        transition: { duration: 0.2 }
      } 
    : {
        initial: "initial",
        animate: "animate",
        exit: "exit",
        variants: variants,
        transition: {
          ...transition,
          // Use a unique key for location to ensure full transition between pages
          key: location,
        }
      };

  return (
    <motion.div
      className={className}
      {...animationProps}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;