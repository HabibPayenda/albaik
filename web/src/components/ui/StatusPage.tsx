import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useI18n } from '@/i18n'
import { Container } from '@/components/ui/Layout'
import { Icon } from '@/components/ui/Icon'
import { BrandMark } from '@/components/ui/BrandMark'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The surface every "this did not work" page is built on: a 404, a crashed route, the
 * offline state.
 *
 * It is deliberately one component rather than three look-alikes. The three states share
 * the same job — say what happened in plain words, offer the way out, and stay on-brand
 * while doing it — and copy-pasting the gradient, the orbs and the contact strip three
 * times is how they drift apart. Each page supplies its own mark, copy and actions.
 *
 * `full` is for pages the router renders *instead of* the site shell (an error boundary
 * replaces the layout, so there is no header above it): the page then fills the viewport
 * and carries its own brand mark. Inside the site shell the page is a normal section and
 * the header already does that job.
 */
export function StatusPage({
  mark,
  icon,
  eyebrow,
  title,
  body,
  actions,
  children,
  contact = true,
  full = false,
  className,
}: {
  /** The big translucent mark, e.g. `404`. */
  mark?: string
  /** Used instead of `mark` when the state has no number, e.g. `wifi-off`. */
  icon?: string
  eyebrow?: string
  title: string
  body?: string
  actions?: ReactNode
  /** Extra useful content: a search box, links to the places people usually want. */
  children?: ReactNode
  /** Show the phone/email strip from site settings. */
  contact?: boolean
  /** Fill the viewport and carry a brand mark — for pages rendered without the shell. */
  full?: boolean
  className?: string
}) {
  const settings = useSiteSettings()
  const { t } = useI18n()

  return (
    <section
      className={cn(
        'relative flex w-full flex-col overflow-hidden bg-royal-gradient text-white',
        full ? 'min-h-svh' : 'py-space-xl',
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-32 -left-32 size-[34rem] rounded-full bg-secondary/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-[30rem] rounded-full bg-accent-gold/10 blur-[90px]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-secondary-container/15 blur-[110px]" />

      {full ? (
        <div className="relative z-10 mx-auto w-full max-w-[1360px] px-margin-mobile pt-space-lg md:px-margin">
          <Link to="/" aria-label={settings.siteName} className="inline-flex">
            <BrandMark tone="dark" variant="lockup" className="h-11 w-auto" alt={settings.siteName} />
          </Link>
        </div>
      ) : null}

      <Container className="relative z-10 flex flex-1 flex-col items-center justify-center py-space-lg text-center">
        {mark ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
            aria-hidden="true"
            className="font-display text-[6rem] leading-none font-bold text-white/15 select-none md:text-[9rem]"
          >
            {mark}
          </motion.span>
        ) : null}

        {icon ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex size-20 items-center justify-center rounded-full border border-white/20 bg-white/10 text-accent-gold shadow-lg backdrop-blur-md"
          >
            <Icon name={icon} size={34} />
          </motion.span>
        ) : null}

        {eyebrow ? (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
            className={cn(
              'text-label-sm font-bold uppercase tracking-[0.2em] text-accent-gold',
              mark || icon ? 'mt-space-sm' : '',
            )}
          >
            {eyebrow}
          </motion.p>
        ) : null}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="mt-2 max-w-2xl font-display text-headline-lg-mobile font-semibold text-balance md:text-headline-lg"
        >
          {title}
        </motion.h1>

        {body ? (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
            className="mt-3 max-w-xl text-body-md text-white/80"
          >
            {body}
          </motion.p>
        ) : null}

        {actions ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.26 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-space-sm"
          >
            {actions}
          </motion.div>
        ) : null}

        {children ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.34 }}
            className="mt-space-lg w-full max-w-xl"
          >
            {children}
          </motion.div>
        ) : null}

        {contact ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-space-lg flex flex-wrap items-center justify-center gap-space-md text-label-md text-white/60"
          >
            {settings.phone ? (
              <a
                href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Icon name="phone" size={15} className="text-accent-gold" />
                {/* A phone number is a left-to-right run; without this the RTL page
                    reorders its digit groups and reads it backwards. */}
                <span dir="ltr">{settings.phone}</span>
              </a>
            ) : null}
            {settings.email ? (
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Icon name="mail" size={15} className="text-accent-gold" />
                {settings.email}
              </a>
            ) : null}
            <span className="flex items-center gap-2">
              <Icon name="verified_user" size={15} className="text-accent-gold" />
              {t('notFound.trustNote')}
            </span>
          </motion.div>
        ) : null}
      </Container>
    </section>
  )
}
