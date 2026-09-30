import { useState } from 'react'
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

/**
 * The accent colours the dashboard offers a brand or a collection.
 *
 * Only the ambient orb is tinted, never the fill: the hero keeps its royal gradient
 * underneath, so white copy never lands on a raw accent colour.
 */
const ACCENT_ORB: Record<string, string> = {
  primary: 'bg-primary/30',
  secondary: 'bg-secondary/25',
  teal: 'bg-tertiary-fixed/20',
  gold: 'bg-accent-gold/25',
}

/**
 * Standard page header for inner routes (collections, product, about...).
 *
 * `backdrop` is the page subject's own banner — a brand's or a collection's — laid full
 * bleed behind the copy and darkened back toward the hero's midnight stop, because a
 * photograph supplied by staff can be bright anywhere and the type is white. With no
 * backdrop set the royal gradient stands alone, so a half-filled brand or collection
 * still looks finished.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  backdrop,
  accent,
  children,
}: {
  eyebrow?: string | null
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** The subject's own banner, full bleed behind the copy. None means the gradient. */
  backdrop?: string | null
  /** `primary` | `secondary` | `teal` | `gold`, as picked in the dashboard. */
  accent?: string | null
  children?: React.ReactNode
}) {
  /*
   * A banner URL can go stale — an upload renamed, a link removed — and a photograph
   * that never loads has to leave the hero on the royal gradient, not darken it with a
   * scrim that is protecting nothing. Tracking *which* URL failed rather than a flag
   * means a different banner gets its own attempt on the next navigation.
   */
  const [failedBackdrop, setFailedBackdrop] = useState<string | null>(null)
  const bannerSrc = backdrop && backdrop !== failedBackdrop ? backdrop : null

  return (
    <section className="relative w-full overflow-hidden bg-royal-gradient text-white pt-space-xl pb-space-lg border-b border-white/10">
      {bannerSrc ? (
        /* A real <img>, not a background, so it decodes off the main thread. The heading
           already says whose page this is, so the banner is decoration and carries no
           alt text. */
        <img
          src={bannerSrc}
          alt=""
          decoding="async"
          onError={() => setFailedBackdrop(bannerSrc)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}

      {/* Ambient light, above the banner but below its scrim: with a backdrop it tints
          the photograph without washing over the gold eyebrow and pills; without one it
          paints straight onto the gradient exactly as it always has. */}
      <div
        className={cn(
          'pointer-events-none absolute -top-32 -left-32 size-[34rem] rounded-full blur-[100px]',
          ACCENT_ORB[accent ?? ''] ?? ACCENT_ORB.secondary,
        )}
      />
      <div className="pointer-events-none absolute top-1/4 right-0 size-[42rem] rounded-full bg-secondary-container/20 blur-[120px]" />

      {bannerSrc ? (
        /* Scrim last of the absolute layers, so the banner — and the ambient light over
           it — are knocked back before any type lands. The photograph staff supply can be
           blown out anywhere, and the 12px gold eyebrow needs 4.5:1 against whatever it
           is: at this strength the worst case (white in the top-left, where the orb sits)
           still clears it. */
        <div className="absolute inset-0 bg-gradient-midnight/80" />
      ) : null}
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
