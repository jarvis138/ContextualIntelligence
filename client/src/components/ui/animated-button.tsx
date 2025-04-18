import React from "react";
import { motion } from "framer-motion";
import { Button, ButtonProps } from "@/components/ui/button";
import { scaleVariants, QUICK_TRANSITION } from "@/lib/animations";

interface AnimatedButtonProps extends ButtonProps {
  animate?: boolean;
  whileTap?: boolean;
}

/**
 * AnimatedButton component
 * Extension of the Button component with animations
 */
const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  className = "",
  animate = true,
  whileTap = true,
  ...props
}) => {
  return (
    <motion.div
      initial={animate ? "initial" : undefined}
      animate={animate ? "animate" : undefined}
      exit={animate ? "exit" : undefined}
      whileTap={whileTap ? { scale: 0.97 } : undefined}
      variants={animate ? scaleVariants : undefined}
      className="inline-block"
    >
      <Button className={className} {...props}>
        {children}
      </Button>
    </motion.div>
  );
};

export { AnimatedButton };

/**
 * Usage example:
 * 
 * <AnimatedButton variant="default">
 *   Click Me
 * </AnimatedButton>
 */