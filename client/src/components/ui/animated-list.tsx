import React, { ReactNode } from "react";
import { motion, Variants } from "framer-motion";
import { containerVariants, listItemVariants, getAnimationSpeed, shouldReduceMotion } from "@/lib/animations";
import { usePreferences } from "@/context/PreferencesContext";

interface AnimatedListProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  customVariants?: {
    container?: Variants;
    item?: Variants;
  };
  as?: React.ElementType;
  itemAs?: React.ElementType;
}

/**
 * AnimatedList component
 * Renders a list with staggered animations for each child item
 * Respects user accessibility preferences
 */
const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  className = "",
  itemClassName = "",
  staggerDelay = 0.05,
  customVariants,
  as: Container = "ul",
  itemAs: Item = "li",
}) => {
  const { preferences } = usePreferences();
  
  // Determine if animations should be reduced or disabled
  const reduceMotion = shouldReduceMotion() || 
    preferences?.accessibility?.reducedMotion || 
    preferences?.ui?.theme?.reduceMotion;
  
  // Determine animation speed from user preferences
  const animationSpeed = preferences?.ui?.theme?.animations || 'medium';
  
  // Define container animation variants
  const containerAnimVariants = customVariants?.container || {
    ...containerVariants,
    animate: {
      ...containerVariants.animate,
      transition: {
        staggerChildren: reduceMotion ? 0 : staggerDelay,
        delayChildren: 0.02,
      },
    },
  };

  // Define item animation variants
  const itemAnimVariants = customVariants?.item || listItemVariants;
  
  // If reduced motion is enabled, simplify animations
  const containerProps = reduceMotion 
    ? { initial: false, animate: { opacity: 1 } }
    : {
        initial: "initial",
        animate: "animate",
        exit: "exit",
        variants: containerAnimVariants,
      };

  const itemProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0.1 } }
    : {
        variants: itemAnimVariants,
        transition: getAnimationSpeed(animationSpeed),
      };

  // Create the container component
  const AnimatedContainer = motion[Container as keyof typeof motion] || motion.div;
  
  // Create the item component
  const AnimatedItem = motion[Item as keyof typeof motion] || motion.div;
  
  return (
    <AnimatedContainer
      className={className}
      {...containerProps}
    >
      {React.Children.map(children, (child, index) => (
        <AnimatedItem
          key={index}
          className={itemClassName}
          custom={index}
          {...itemProps}
        >
          {child}
        </AnimatedItem>
      ))}
    </AnimatedContainer>
  );
};

export { AnimatedList };