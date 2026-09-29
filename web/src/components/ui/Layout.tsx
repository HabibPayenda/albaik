import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE, viewportOnce } from '@/lib/motion'

/** The 1360px content rail used throughout the design. */
export function Container({
  className,
  children,
  size = 'default',
}: {
  className?: string
  children: React.ReactNode
  size?: 'default' | 'narrow' | 'wide'
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-margin-mobile md:px-margin',
        size === 'default' && 'max-w-[1360px]',
        size === 'narrow' && 'max-w-3xl',
        size === 'wide' && 'max-w-[1600px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** A vertical band with the design's standard `space-xl` rhythm. */
export function Section({
  id,
  className,
  children,
  tone = 'surface',
  as: Tag = 'section',
}: {
  id?: string
  className?: string
  children: React.ReactNode
  tone?: 'surface' | 'low' | 'white' | 'dark' | 'none'
  as?: 'section' | 'div' | 'article'
}) {
  const tones = {
    surface: 'bg-surface',
    low: 'bg-surface-container-low',
    white: 'bg-clinical-white',
    dark: 'bg-royal-gradient text-white',
    none: '',
  }
  return (
    <Tag id={id} className={cn('w-full py-space-xl', tones[tone], className)}>
      {children}
    </Tag>
  )
}

/**
 * The eyebrow + title + subtitle stack that heads almost every section in the mockup.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
  eyebrowClassName,
  titleClassName,
  children,
  animate = true,
}: {
  eyebrow?: string | null
  title?: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'left' | 'center'
  className?: string
  eyebrowClassName?: string
  titleClassName?: string
  children?: React.ReactNode
  animate?: boolean
}) {
  const Wrapper = animate ? motion.div : 'div'
  const animProps = animate
    ? {
        initial: 'hidden',
        whileInView: 'show',
        viewport: viewportOnce,
        variants: {
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        },
      }
    : {}

  const item = animate
    ? {
        variants: {
          hidden: { opacity: 0, y: 18 },
          show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
        },
      }
    : {}

  return (
    <Wrapper
      {...animProps}
      className={cn(
        'flex flex-col gap-space-xs',
        align === 'center' && 'items-center text-center mx-auto max-w-2xl',
        className,
      )}
    >
      {eyebrow ? (
        <motion.div {...item} className={cn('inline-flex items-center gap-2', eyebrowClassName)}>
          {align === 'left' && (
            <span className="h-[2px] w-8 bg-gradient-to-r from-[#050d24] to-[#1a4fcf]" />
          )}
          <span className="eyebrow text-secondary">{eyebrow}</span>
        </motion.div>
      ) : null}
      {title ? (
        <motion.h2
          {...item}
          className={cn(
            'font-display text-headline-lg-mobile md:text-headline-lg text-on-surface font-semibold tracking-tight',
            titleClassName,
          )}
        >
          {title}
        </motion.h2>
      ) : null}
      {subtitle ? (
        <motion.p
          {...item}
          className="text-body-md text-on-surface-variant max-w-2xl leading-relaxed"
        >
          {subtitle}
        </motion.p>
      ) : null}
      {children}
    </Wrapper>
  )
}

/** Standard page header for inner routes (collections, product, about...). */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string | null
  title: React.ReactNode
  subtitle?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="relative w-full overflow-hidden bg-royal-gradient text-white pt-space-xl pb-space-lg border-b border-white/10">
      <div className="pointer-events-none absolute -top-32 -left-32 size-[34rem] rounded-full bg-secondary/25 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/4 right-0 size-[42rem] rounded-full bg-secondary-container/20 blur-[120px]" />
      <Container className="relative z-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
          className="flex flex-col gap-space-sm max-w-3xl"
        >
          {eyebrow ? (
            <motion.span
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="eyebrow text-accent-gold"
            >
              {eyebrow}
            </motion.span>
          ) : null}
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            className="font-display text-display-lg-mobile md:text-headline-lg lg:text-display-lg text-white font-semibold tracking-tight"
          >
            {title}
          </motion.h1>
          {subtitle ? (
            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
              className="text-body-lg text-white/85 leading-relaxed"
            >
              {subtitle}
            </motion.p>
          ) : null}
          {children}
        </motion.div>
      </Container>
    </section>
  )
}
