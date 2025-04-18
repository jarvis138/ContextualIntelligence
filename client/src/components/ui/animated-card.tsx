import React, { HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { containerVariants } from "@/lib/animations";

interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  delay?: number;
  children: React.ReactNode;
}

/**
 * AnimatedCard component
 * Extension of the Card component with animations
 */
const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = "",
  hover = true,
  delay = 0,
  ...props
}) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={hover ? "hover" : undefined}
      variants={containerVariants}
      transition={{ delay }}
      className="h-full"
    >
      <Card className={`h-full transition-all ${className}`} {...props}>
        {children}
      </Card>
    </motion.div>
  );
};

export { AnimatedCard };

/**
 * Usage example:
 * 
 * <AnimatedCard className="p-6">
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 *   <CardFooter>Footer</CardFooter>
 * </AnimatedCard>
 */