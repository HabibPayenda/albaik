import { motion, type Variants } from 'framer-motion'
import { EASE, viewportOnce } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSETS: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 26 },
  down: { y: -26 },
  left: { x: -32 },
  right: { x: 32 },
  none: {},
}

/**
 * Fades and slides its children in the first time they scroll into view.
 * Deliberately cheap: one IntersectionObserver per instance via framer's viewport.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  once = true,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: Direction
  once?: boolean
  as?: 'div' | 'li' | 'span' | 'article'
}) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, ...OFFSETS[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ ...viewportOnce, once }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </Tag>
  )
}

/** Container that staggers the reveal of its <StaggerItem> children. */
export function Stagger({
  children,
  className,
  delay = 0.08,
  delayChildren = 0.04,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  delayChildren?: number
  as?: 'div' | 'ul' | 'ol' | 'section'
}) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={{ hidden: {}, show: { transition: { staggerChildren: delay, delayChildren } } }}
    >
      {children}
    </Tag>
  )
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'li' | 'article'
}) {
  const Tag = motion[as]
  return (
    <Tag className={className} variants={staggerItem}>
      {children}
    </Tag>
  )
}

/** Thin gradient rule used as a decorative divider. */
export function GradientRule({ className }: { className?: string }) {
  return (
    <span
      className={cn('block h-px w-full bg-gradient-to-r from-transparent via-primary-container/25 to-transparent', className)}
    />
  )
}
