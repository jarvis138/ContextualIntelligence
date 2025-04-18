import { Variants } from "framer-motion";

/**
 * Detect if the user prefers reduced motion
 * This uses the prefers-reduced-motion media query
 */
export const shouldReduceMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Animation speed presets
 * Each speed has different duration, easing, and spring configurations
 */
export type AnimationSpeed = "none" | "slow" | "medium" | "fast";

export const getAnimationSpeed = (speed: AnimationSpeed = "medium") => {
  switch (speed) {
    case "none":
      return { duration: 0 };
    case "slow":
      return {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.5,
      };
    case "fast":
      return {
        type: "spring",
        stiffness: 200,
        damping: 20,
        duration: 0.15,
      };
    case "medium":
    default:
      return {
        type: "spring",
        stiffness: 150,
        damping: 17,
        duration: 0.25,
      };
  }
};

/**
 * Page transition variants
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -10,
  },
};

/**
 * Card animation variants
 */
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  hover: {
    y: -4,
    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
  },
};

/**
 * Item animations for lists
 */
export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: 20,
  },
};

/**
 * Container animation variants
 */
export const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

/**
 * Button animation variants
 */
export const buttonVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: 10,
  },
  hover: {
    scale: 1.03,
  },
};

/**
 * Fade animation variants
 */
export const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

/**
 * Scale animation variants
 */
export const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
  },
};

/**
 * Slide from right animation variants
 */
export const slideFromRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: 50,
  },
};

/**
 * Slide from left animation variants
 */
export const slideFromLeftVariants: Variants = {
  initial: {
    opacity: 0,
    x: -50,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -50,
  },
};

/**
 * Slide from bottom animation variants
 */
export const slideFromBottomVariants: Variants = {
  initial: {
    opacity: 0,
    y: 50,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: 50,
  },
};

/**
 * Slide from top animation variants
 */
export const slideFromTopVariants: Variants = {
  initial: {
    opacity: 0,
    y: -50,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -50,
  },
};