/**
 * Shared animation variants for Framer Motion / Motion
 * Use these across all components for consistent animations
 */

// Utility: check if user prefers reduced motion
export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// GPU-accelerated variants (use transform3d for smooth 60fps)
export const fadeInUp = {
  initial: { opacity: 0, y: 20, willChange: "transform, opacity" },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -20, willChange: "transform, opacity" },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -30, willChange: "transform, opacity" },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

export const fadeInRight = {
  initial: { opacity: 0, x: 30, willChange: "transform, opacity" },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9, willChange: "transform, opacity" },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: "easeOut" },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20, willChange: "transform, opacity" },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export const scaleOnHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export const liftOnHover = {
  whileHover: { y: -4 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
};

export const slideInFromBottom = {
  initial: { opacity: 0, y: 40, willChange: "transform, opacity" },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

export const slideInFromTop = {
  initial: { opacity: 0, y: -40, willChange: "transform, opacity" },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

export const blurIn = {
  initial: { opacity: 0, filter: "blur(10px)", willChange: "filter, opacity" },
  animate: { opacity: 1, filter: "blur(0px)" },
  transition: { duration: 0.6, ease: "easeOut" },
};

export const rotateIn = {
  initial: { opacity: 0, rotate: -10, willChange: "transform, opacity" },
  animate: { opacity: 1, rotate: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3 },
};

// Scroll-triggered animation variants (use with useInView)
export const scrollReveal = {
  initial: { opacity: 0, y: 30, willChange: "transform, opacity" },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: "easeOut" },
};

export const scrollRevealLeft = {
  initial: { opacity: 0, x: -40, willChange: "transform, opacity" },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

export const scrollRevealRight = {
  initial: { opacity: 0, x: 40, willChange: "transform, opacity" },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

export const scrollRevealScale = {
  initial: { opacity: 0, scale: 0.9, willChange: "transform, opacity" },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: "easeOut" },
};

// Spring-based variants (more natural, bouncy feel)
export const springIn = {
  initial: { opacity: 0, scale: 0.8, willChange: "transform, opacity" },
  animate: { opacity: 1, scale: 1 },
  transition: { type: "spring", stiffness: 200, damping: 20 },
};

export const springLift = {
  whileHover: { y: -6, willChange: "transform" },
  transition: { type: "spring", stiffness: 400, damping: 25 },
};

export const springScale = {
  whileHover: { scale: 1.03, willChange: "transform" },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 25 },
};

// Continuous animations
export const float = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const floatSlow = {
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const spin = {
  animate: {
    rotate: 360,
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Reduced motion variants (instant transitions)
export const reducedMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.01 },
};
