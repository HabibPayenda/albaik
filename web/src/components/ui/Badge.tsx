import { cn } from '@/lib/utils'
import { Icon } from './Icon'

export type Accent = 'primary' | 'secondary' | 'teal' | 'gold' | 'neutral' | 'danger' | 'success' | null | undefined

const ACCENTS: Record<string, string> = {
  primary: 'bg-primary-container/10 text-primary-container',
  secondary: 'bg-secondary/10 text-secondary',
  teal: 'bg-marine/10 text-on-tertiary-fixed-variant',
  gold: 'bg-accent-gold/15 text-accent-gold-ink',
  neutral: 'bg-surface-container-low text-on-surface',
  danger: 'bg-error-container text-on-error-container',
  success: 'bg-marine/12 text-on-tertiary-fixed-variant',
}

/**
 * `badgeStyle` arrives from the API as a free-form string. Narrow it to a known
 * accent so the CMS can never inject an unstyled value.
 */
export function asAccent(value?: string | null): Accent {
  return value && value in ACCENTS ? (value as Accent) : 'neutral'
}

/** The pill-shaped formulation tag from the design ("ANTI-DANDRUFF", "POST-OIL"...). */
export function Chip({
  children,
  accent = 'neutral',
  className,
  icon,
}: {
  children: React.ReactNode
  accent?: Accent
  className?: string
  icon?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold',
        ACCENTS[accent ?? 'neutral'] ?? ACCENTS.neutral,
        className,
      )}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  )
}

/** A solid gradient badge overlaid on product imagery. */
export function BadgeOverlay({
  children,
  accent = 'primary',
  className,
}: {
  children: React.ReactNode
  accent?: Accent
  className?: string
}) {
  /*
   * Every stop is a @theme token, not a raw hex. The values were already correct, but
   * written as arbitrary values (`from-[#050d24]`) they were invisible to the token
   * audit, which is how a colour drifts without anyone noticing.
   *
   * The gold ramp used to end at `accent-gold` (#d4af37). White on that stop is
   * **2.10:1** — measured off a screenshot, not estimated, because a gradient backdrop
   * is invisible to the site-wide sweep (it composites `background-color` only). The
   * badge was unreadable across its right half. Ending at `accent-gold-deep` instead
   * gives white 5.82:1 at the ink end and 13.63:1 at the deep end, so the whole pill
   * clears 4.5:1. Bright gold with white text cannot work; bright gold needs dark text
   * (that is what the `gold` Button variant does with `text-gradient-midnight`).
   */
  const gradients: Record<string, string> = {
    primary: 'bg-gradient-to-r from-gradient-midnight via-gradient-royal to-gradient-cobalt',
    secondary: 'bg-gradient-to-r from-gradient-midnight to-gradient-royal',
    teal: 'bg-gradient-to-r from-tertiary-container to-gradient-royal',
    gold: 'bg-gradient-to-r from-accent-gold-ink to-accent-gold-deep',
    neutral: 'bg-surface-container-highest text-on-surface',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold uppercase tracking-widest shadow-md',
        accent === 'neutral' ? gradients.neutral : `text-white ${gradients[accent ?? 'primary']}`,
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Small glass chip floating on dark surfaces. */
export function GlassTag({
  children,
  icon,
  className,
}: {
  children: React.ReactNode
  icon?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-label-sm font-bold uppercase tracking-widest text-white backdrop-blur-md',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={14} className="text-accent-gold" /> : null}
      {children}
    </span>
  )
}

/** Vertical accent bar shown beside a status in the dashboard. */
export function StatusDot({ tone = 'neutral', className }: { tone?: 'neutral' | 'live' | 'off' | 'warn'; className?: string }) {
  const tones = {
    neutral: 'bg-outline',
    live: 'bg-marine',
    off: 'bg-outline-variant',
    warn: 'bg-accent-gold',
  }
  return <span className={cn('inline-block size-2 rounded-full', tones[tone], className)} />
}
