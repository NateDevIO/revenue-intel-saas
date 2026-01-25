/**
 * Animation variants and utilities for consistent motion design
 */

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.2, ease: "easeInOut" },
};

export const buttonTap = {
  scale: 0.98,
};

export const cardHover = {
  y: -4,
  boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.15)",
  transition: { duration: 0.3, ease: "easeOut" },
};

// Timing constants
export const timing = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
};

// Easing functions
export const easing = {
  smooth: [0.43, 0.13, 0.23, 0.96],
  bounce: [0.68, -0.55, 0.265, 1.55],
  linear: [0, 0, 1, 1],
};
