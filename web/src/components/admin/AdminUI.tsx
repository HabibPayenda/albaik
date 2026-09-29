import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import { Icon } from '@/components/ui/Icon'

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: string
  description?: string
  eyebrow?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="mb-space-lg flex flex-col gap-space-md border-b border-outline-variant/40 pb-space-md lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-1">
        {eyebrow ? <span className="eyebrow text-secondary">{eyebrow}</span> : null}
        <h1 className="font-display text-headline-lg-mobile font-semibold tracking-tight text-on-surface md:text-headline-lg">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-body-sm text-on-surface-variant">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-space-sm">{actions}</div> : null}
      {children}
    </header>
  )
}

export function AdminCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  delay = 0,
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      className={cn(
        'overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-e1',
        className,
      )}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-space-sm border-b border-outline-variant/40 px-space-md py-space-sm">
          <div className="flex flex-col">
            {title ? (
              <h2 className="font-display text-headline-sm font-semibold text-on-surface">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-body-sm text-on-surface-variant">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn('p-space-md', bodyClassName)}>{children}</div>
    </motion.section>
  )
}

/** Summary tile used on the dashboard. */
export function StatTile({
  label,
  value,
  icon,
  accent = 'primary',
  hint,
  delay = 0,
  to,
}: {
  label: string
  value: number | string
  icon: string
  accent?: 'primary' | 'secondary' | 'teal' | 'gold' | 'error'
  hint?: string
  delay?: number
  to?: string
}) {
  const accents: Record<string, string> = {
    primary: 'from-[#0e3b9c] to-[#1a4fcf]',
    secondary: 'from-[#1d51d0] to-[#3f6beb]',
    teal: 'from-[#004b50] to-[#008891]',
    gold: 'from-accent-gold-ink to-[#d4af37]',
    error: 'from-[#93000a] to-[#ba1a1a]',
  }

  const Wrapper = to ? 'a' : 'div'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
    >
      <Wrapper
        {...(to ? { href: to } : {})}
        className="group flex items-center gap-space-sm rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-space-md shadow-e1 transition-shadow duration-300 hover:shadow-e2"
      >
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
            accents[accent],
          )}
        >
          <Icon name={icon} size={20} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
            {label}
          </span>
          <span className="font-display text-headline-md font-bold text-on-surface">{value}</span>
          {hint ? <span className="text-label-sm text-on-surface-variant">{hint}</span> : null}
        </span>
      </Wrapper>
    </motion.div>
  )
}

/** Sticky filter/search strip above a table. */
export function AdminToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-space-md flex flex-wrap items-end gap-space-sm', className)}>{children}</div>
  )
}
