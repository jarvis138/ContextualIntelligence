import React, { ButtonHTMLAttributes } from "react";
import { motion, VariantLabels } from "framer-motion";
import { buttonVariants, getAnimationSpeed, shouldReduceMotion } from "@/lib/animations";
import { usePreferences } from "@/context/PreferencesContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";

interface AnimatedButtonProps extends 
  ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
  initialAnimation?: VariantLabels;
  animate?: boolean;
  whileHover?: boolean;
  delay?: number;
}

/**
 * AnimatedButton component
 * Button component with animations for entrance, hover and click
 * Respects user accessibility preferences
 */
const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant = "default",
    size = "default",
    children,
    asChild = false,
    initialAnimation = "initial",
    animate = true,
    whileHover = true,
    delay = 0,
    ...props
  }, ref) => {
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

    // Determine the component to render
    const Comp = asChild ? Slot : motion.button;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        initial={animate && !reduceMotion ? initialAnimation : false}
        animate={animate && !reduceMotion ? "animate" : undefined}
        exit={animate && !reduceMotion ? "exit" : undefined}
        whileHover={whileHover && !reduceMotion ? "hover" : undefined}
        whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
        variants={!reduceMotion ? buttonVariants : undefined}
        transition={transition}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };