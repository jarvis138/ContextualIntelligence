import React, { ReactNode } from "react";
import { motion, VariantLabels } from "framer-motion";
import { cardVariants, getAnimationSpeed, shouldReduceMotion } from "@/lib/animations";
import { usePreferences } from "@/context/PreferencesContext";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  clickable?: boolean;
  delay?: number;
  initialAnimation?: VariantLabels;
  animate?: boolean;
  whileHover?: boolean;
  onClick?: () => void;
}

/**
 * AnimatedCard component
 * Card component with animations for entrance, hover and click
 * Respects user accessibility preferences
 */
const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = "",
  clickable = false,
  delay = 0,
  initialAnimation = "initial",
  animate = true,
  whileHover = true,
  onClick,
}) => {
  const { preferences } = usePreferences();
  
  // Determine if animations should be reduced or disabled
  const reduceMotion = shouldReduceMotion() || 
    preferences?.accessibility?.reducedMotion || 
    preferences?.ui?.theme?.reduceMotion;
  
  // Determine animation speed from user preferences
  const animationSpeed = preferences?.ui?.theme?.animations || 'medium';
  
  // Get appropriate transition timing with delay
  const transition = {
    ...getAnimationSpeed(animationSpeed),
    ...(delay > 0 ? { delay } : {})
  };

  return (
    <motion.div
      initial={animate && !reduceMotion ? initialAnimation : false}
      animate={animate && !reduceMotion ? "animate" : undefined}
      exit={animate && !reduceMotion ? "exit" : undefined}
      whileHover={whileHover && !reduceMotion ? "hover" : undefined}
      whileTap={clickable && !reduceMotion ? { scale: 0.98 } : undefined}
      variants={!reduceMotion ? cardVariants : undefined}
      transition={transition}
      onClick={onClick}
      className={cn(
        clickable ? "cursor-pointer" : "",
        "h-full w-full"
      )}
    >
      <Card 
        className={cn(
          "border h-full transition-colors",
          clickable && "hover:border-primary/50",
          className
        )}
      >
        {children}
      </Card>
    </motion.div>
  );
};

export { AnimatedCard };