import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { listVariants, listItemVariants } from "@/lib/animations";

interface AnimatedListProps {
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
  keyExtractor?: (item: any, index: number) => string;
  delay?: number;
}

/**
 * AnimatedList component
 * Renders a list with staggered animations for items
 */
export function AnimatedList({
  items,
  renderItem,
  className = "",
  itemClassName = "",
  keyExtractor,
  delay = 0
}: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={listVariants}
      transition={{ staggerChildren: 0.05, delayChildren: delay }}
    >
      {items.map((item, index) => (
        <motion.div
          key={keyExtractor ? keyExtractor(item, index) : index}
          className={itemClassName}
          variants={listItemVariants}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * AnimatedListItem component
 * For use when you need to manually create list items
 */
export function AnimatedListItem({ children, className = "" }: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      variants={listItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}