import { motion } from 'framer-motion'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EASE } from '@/lib/motion'
import type { HomeSection } from '@/lib/types'

/**
 * The closing distribution banner: royal gradient slab with ambient orbs, contact
 * details and the two primary partner CTAs.
 */
export function DistributionSection({ section }: { section?: HomeSection }) {
  const settings = useSiteSettings()

  return (
    <Section tone="low">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-royal-gradient p-space-lg text-white shadow-e3 md:p-space-xl"
        >
          <div className="pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full bg-secondary/40 blur-3xl" />
          <div className="pointer-events-none absolute -top-20 -left-20 size-80 rounded-full bg-accent-gold/15 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-gutter lg:grid-cols-12">
            <div className="flex flex-col items-center gap-space-sm text-center lg:col-span-8 md:items-start md:text-left">
              {section?.eyebrow ? (
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1 text-label-sm font-bold uppercase tracking-widest text-accent-gold backdrop-blur-md">
                  {section.eyebrow}
                </span>
              ) : null}

              <h2 className="font-display text-headline-lg-mobile font-semibold tracking-tight text-white md:text-headline-lg">
                {section?.title}
              </h2>

              {section?.subtitle ? (
                <p className="max-w-2xl text-body-md leading-relaxed text-white/85">{section.subtitle}</p>
              ) : null}

              <div className="flex flex-wrap items-center justify-center gap-space-md pt-space-xs md:justify-start">
                {settings.address ? (
                  <span className="flex items-center gap-2 text-label-md text-white/90">
                    <Icon name="location_on" size={17} className="text-accent-gold" />
                    {settings.address}
                  </span>
                ) : null}
                {settings.email ? (
                  <a
                    href={`mailto:${settings.email}`}
                    className="flex items-center gap-2 text-label-md text-white/90 transition-colors hover:text-accent-gold"
                  >
                    <Icon name="mail" size={17} className="text-tertiary-fixed" />
                    {settings.email}
                  </a>
                ) : null}
                {settings.phone ? (
                  <a
                    href={`tel:${settings.phone}`}
                    className="flex items-center gap-2 text-label-md text-white/90 transition-colors hover:text-accent-gold"
                  >
                    <Icon name="phone" size={17} className="text-tertiary-fixed" />
                    {settings.phone}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-center gap-space-sm sm:flex-row lg:col-span-4 lg:flex-col lg:items-end">
              <ButtonLink
                to={section?.primaryCtaHref ?? '/contact?topic=wholesale'}
                variant="gold"
                size="lg"
                icon="assignment"
                className="w-full sm:w-auto lg:w-full"
              >
                {section?.primaryCtaLabel ?? 'Become a distributor'}
              </ButtonLink>
              <ButtonLink
                to={section?.secondaryCtaHref ?? '/contact'}
                variant="glass"
                size="lg"
                icon="mail"
                className="w-full sm:w-auto lg:w-full"
              >
                {section?.secondaryCtaLabel ?? 'Contact us'}
              </ButtonLink>
              {settings.whatsapp ? (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-space-lg py-3.5 text-label-lg font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/15 lg:w-full"
                >
                  <Icon name="whatsapp" size={18} />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  )
}
