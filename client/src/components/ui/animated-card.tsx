import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/context/PreferencesContext";
import { shouldReduceMotion, cardVariants, getAnimationSpeed } from "@/lib/animations";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  animate?: boolean;
  hover?: boolean;
  initialDelay?: number;
}

/**
 * AnimatedCard component
 * Card component with entrance and hover animations
 * Respects user accessibility preferences
 */
const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, index = 0, animate = true, hover = true, initialDelay = 0, ...props }, ref) => {
    const { preferences } = usePreferences();
    
    // Determine if animations should be reduced or disabled
    const reduceMotion = shouldReduceMotion() || 
      preferences?.theme?.reduceMotion;
    
    // Determine animation speed from user preferences
    const animationSpeed = preferences?.theme?.animations || 'medium';
    
    // Add staggered delay based on index for list items
    const delay = initialDelay + (index * 0.1);
    
    // Customize transition
    const transition = {
      ...getAnimationSpeed(animationSpeed),
      delay,
    };
    
    // If reduced motion is enabled or animation is disabled, render regular card
    if (reduceMotion || animationSpeed === 'none' || !animate) {
      return (
        <Card className={cn(className)} ref={ref} {...props}>
          {children}
        </Card>
      );
    }
    
    return (
      <motion.div
        className={cn(className)}
        ref={ref}
        initial="initial"
        animate="animate"
        exit="exit"
        whileHover={hover ? "hover" : undefined}
        variants={cardVariants}
        transition={transition}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

export { AnimatedCard };