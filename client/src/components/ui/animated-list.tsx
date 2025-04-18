import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePreferences } from "@/context/PreferencesContext";
import { shouldReduceMotion, containerVariants, listItemVariants, getAnimationSpeed } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  childVariants?: any;
  containerClassName?: string;
  itemClassName?: string;
  animateOnMount?: boolean;
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

/**
 * AnimatedList component
 * Container component for animated list items with staggered animations
 * Respects user accessibility preferences
 */
const AnimatedList = ({
  children,
  className,
  staggerDelay = 0.05,
  childVariants = listItemVariants,
  containerClassName,
  itemClassName,
  animateOnMount = true,
}: AnimatedListProps) => {
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

  // Create custom container variants with specified stagger delay
  const customContainerVariants = {
    ...containerVariants,
    animate: {
      ...containerVariants.animate,
      transition: {
        ...containerVariants.animate.transition,
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      className={cn(className, containerClassName)}
      initial={animateOnMount ? "initial" : false}
      animate="animate"
      exit="exit"
      variants={customContainerVariants}
      transition={getAnimationSpeed(animationSpeed)}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return (
            <motion.div
              className={itemClassName}
              variants={childVariants}
              transition={getAnimationSpeed(animationSpeed)}
              key={index}
            >
              {child}
            </motion.div>
          );
        }
        return child;
      })}
    </motion.div>
  );
};

/**
 * AnimatedListItem component
 * Individual item in an animated list
 * Can be used independently of AnimatedList
 */
const AnimatedListItem = ({ children, className, index = 0 }: AnimatedListItemProps) => {
  const { preferences } = usePreferences();
  
  // Determine if animations should be reduced or disabled
  const reduceMotion = shouldReduceMotion() || 
    preferences?.theme?.reduceMotion;
  
  // Determine animation speed from user preferences
  const animationSpeed = preferences?.theme?.animations || 'medium';
  
  // Customize transition based on index for staggered effect
  const transition = {
    ...getAnimationSpeed(animationSpeed),
    delay: index * 0.05,
  };
  
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
      variants={listItemVariants}
      transition={transition}
    >
      {children}
    </motion.div>
  );
};

export { AnimatedList, AnimatedListItem };