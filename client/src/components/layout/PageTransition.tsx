import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePreferences } from "@/context/PreferencesContext";
import { shouldReduceMotion, pageVariants, getAnimationSpeed } from "@/lib/animations";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition component
 * Provides smooth page transitions with respect to user accessibility preferences
 * Uses motion animations from framer-motion
 */
const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
  const { preferences } = usePreferences();
  
  // Determine if animations should be reduced or disabled
  const reduceMotion = shouldReduceMotion() || 
    preferences?.theme?.reduceMotion;
  
  // Determine animation speed from user preferences
  const animationSpeed = preferences?.theme?.animations || 'medium';
  
  // If reduced motion is enabled, render without animations
  if (reduceMotion || animationSpeed === 'none') {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={getAnimationSpeed(animationSpeed)}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;