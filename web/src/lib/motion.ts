import type { Transition, Variants } from 'framer-motion'

/** Signature easing used across the site — a soft, expensive-feeling decelerate. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const EASE_SOFT = [0.4, 0, 0.2, 1] as const

export const spring: Transition = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }
export const smooth: Transition = { duration: 0.6, ease: EASE }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: smooth },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: smooth },
}

/** Wrap a list to stagger its children. */
export const stagger = (delay = 0.08, delayChildren = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren } },
})

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: smooth },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: smooth },
}

/** Shared viewport config so reveals fire once, slightly before the element is centred. */
export const viewportOnce = { once: true, margin: '-80px 0px -80px 0px' } as const

/** Page-level transition used by the router outlet. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: EASE_SOFT } },
}

/** Hero copy enters with a slightly longer, more theatrical curve. */
export const heroChild: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: EASE },
  },
}
