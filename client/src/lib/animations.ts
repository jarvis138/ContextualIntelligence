/**
 * Animation utilities for the Novexa platform
 * Provides consistent animation variants for use with framer-motion
 */

import { Variants } from "framer-motion";

// Default transition settings
export const DEFAULT_TRANSITION = {
  ease: [0.6, 0.01, -0.05, 0.95], // Custom easing
  duration: 0.4
};

// Faster transition for smaller elements
export const QUICK_TRANSITION = {
  ease: "easeInOut",
  duration: 0.2
};

// Staggered children transition
export const STAGGER_TRANSITION = {
  staggerChildren: 0.1
};

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      ...DEFAULT_TRANSITION,
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      ...QUICK_TRANSITION
    }
  }
};

// Card/container variants
export const containerVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      ...DEFAULT_TRANSITION,
      staggerChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    transition: {
      ...QUICK_TRANSITION
    }
  },
  hover: {
    y: -5,
    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
    transition: {
      ...QUICK_TRANSITION
    }
  }
};

// Item variants (for elements in lists/grids)
export const itemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: DEFAULT_TRANSITION
  },
  exit: {
    opacity: 0,
    transition: QUICK_TRANSITION
  },
  hover: {
    scale: 1.03,
    transition: QUICK_TRANSITION
  }
};

// Fade variants for simple elements
export const fadeVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: QUICK_TRANSITION
  },
  exit: {
    opacity: 0,
    transition: QUICK_TRANSITION
  }
};

// Slide in from right variants (for sidebars, drawers)
export const slideInRightVariants: Variants = {
  initial: {
    x: "100%"
  },
  animate: {
    x: 0,
    transition: DEFAULT_TRANSITION
  },
  exit: {
    x: "100%",
    transition: QUICK_TRANSITION
  }
};

// Slide in from bottom variants (for modals, dialogs)
export const slideInBottomVariants: Variants = {
  initial: {
    y: "100%"
  },
  animate: {
    y: 0,
    transition: DEFAULT_TRANSITION
  },
  exit: {
    y: "100%",
    transition: QUICK_TRANSITION
  }
};

// Scale variants (for buttons, icons)
export const scaleVariants: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: QUICK_TRANSITION
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: QUICK_TRANSITION
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
};

// List item staggered animation
export const listVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// List item variant
export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: QUICK_TRANSITION
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: QUICK_TRANSITION
  }
};

// Bounce variants (for notifications, alerts)
export const bounceVariants: Variants = {
  initial: {
    scale: 0.5,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: QUICK_TRANSITION
  }
};

// Pulse animation (for highlighting elements)
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};