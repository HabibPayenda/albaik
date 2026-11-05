import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppSelector } from '@/store/hooks'
import { Container, Section, SectionHeading } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Chip } from '@/components/ui/Badge'
import { Stagger, StaggerItem } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import type { HomeSection } from '@/lib/types'

/** Icon drawn when a pillar was saved with no icon, so a half-built row never looks broken. */
const PILLAR_FALLBACK_ICON = 'verified_user'

/** Icon tint per pillar accent — the dashboard's "Accent colour" field. */
const ACCENT_ICON: Record<string, string> = {
  gold: 'text-accent-gold',
  teal: 'text-marine',
  secondary: 'text-secondary',
  primary: 'text-primary',
}

/**
 * "Our Approach", in two bands.
 *
 * Band A presents the trust pillars — the dashboard-editable rows from the "Trust
 * pillars" tab (icon, headline, supporting line). The glyph is data, not a fixed
 * position mapping, so staff can add, remove, reorder or re-icon a pillar without a
 * redeploy; a row saved without an icon falls back to a neutral one.
 *
 * Band B keeps the interactive profile selector with room to breathe. The selector is a
 * *chooser*: the cards carry the title and badge, the panel carries the description — or,
 * when staff have an approved figure for the profile, the statistic and its label stand
 * in front of it — and with neither entered it falls back to the profile's own name.
 */
export function ApproachSection({ section }: { section?: HomeSection }) {
  const pillars = useAppSelector((state) => state.home.data?.trustPillars ?? [])
  const profiles = useAppSelector((state) => state.home.data?.hairProfiles ?? [])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedKey && profiles.length) setSelectedKey(profiles[0].key)
  }, [profiles, selectedKey])

  const selected = useMemo(
    () => profiles.find((p) => p.key === selectedKey) ?? profiles[0],
    [profiles, selectedKey],
  )
  const selectedIndex = Math.max(
    0,
    profiles.findIndex((p) => p.key === selected?.key),
  )

  /* Whitespace from the dashboard is not a figure: a value of only spaces must not
     blank the headline out and take the profile's name down with it. */
  const metricValue = selected?.metricValue?.trim() || null
  const metricLabel = selected?.metricLabel?.trim() || null

  if (!pillars.length && !profiles.length) return null

  return (
    <>
      {/* ================================================ A — the trust pillars */}
      {pillars.length ? (
        <Section id="product-approach" tone="low">
          <Container>
            <SectionHeading
              eyebrow={section?.eyebrow}
              title={section?.title}
              subtitle={section?.subtitle}
              align="center"
            />

            <div className="relative mt-space-lg">
              {/* Connects the centre of the first circle to the centre of the last. */}
              <span
                className="absolute inset-x-[10%] top-[2.75rem] hidden h-px bg-gradient-to-r from-transparent via-outline-variant to-transparent lg:block"
                aria-hidden="true"
              />
              <Stagger
                as="ol"
                className="relative grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4"
                delay={0.09}
              >
                {pillars.map((pillar, index) => (
                  <StaggerItem
                    as="li"
                    key={pillar.id}
                    className="group flex flex-col items-center gap-space-sm text-center"
                  >
                    <span className="relative z-10 flex size-[5.5rem] shrink-0 items-center justify-center rounded-full border border-outline-variant/60 bg-clinical-white shadow-e1 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-secondary/40 group-hover:shadow-e2">
                      <Icon
                        name={pillar.icon?.trim() || PILLAR_FALLBACK_ICON}
                        size={26}
                        className={cn(
                          ACCENT_ICON[pillar.accent ?? 'secondary'] ?? ACCENT_ICON.secondary,
                          'transition-colors duration-300',
                        )}
                      />
                      <span className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-gold-gradient font-display text-label-sm font-bold text-gradient-midnight shadow-sm">
                        {index + 1}
                      </span>
                    </span>
                    <p className="max-w-[16rem] font-display text-body-md font-semibold leading-snug text-on-surface">
                      {pillar.title}
                    </p>
                    {pillar.subtitle ? (
                      <p className="max-w-[16rem] text-body-sm leading-relaxed text-on-surface-variant">
                        {pillar.subtitle}
                      </p>
                    ) : null}
                  </StaggerItem>
                ))}
              </Stagger>
            </div>

            {section?.body ? (
              <div className="mt-space-lg flex flex-col items-center gap-space-md">
                <p className="max-w-3xl text-center text-body-md leading-relaxed text-on-surface-variant">
                  {section.body}
                </p>
                {section.primaryCtaLabel && section.primaryCtaHref ? (
                  <ButtonLink
                    to={section.primaryCtaHref}
                    variant="outline"
                    iconRight="arrow_forward"
                  >
                    {section.primaryCtaLabel}
                  </ButtonLink>
                ) : null}
              </div>
            ) : null}
          </Container>
        </Section>
      ) : null}

      {/* ============================================= B — the guided selector */}
      {profiles.length ? (
        <Section tone="surface">
          <Container>
            <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
              {/* ------------------------------------------------ detail panel */}
              <div className="lg:col-span-5">
                <div className="flex flex-col gap-space-md rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-md shadow-e1">
                  <div className="flex items-center justify-center gap-2 md:justify-between">
                    <span className="text-label-sm font-bold uppercase tracking-widest text-secondary">
                      Guided selection
                    </span>
                    <Chip accent="secondary" icon="check_circle">
                      Matched to your need
                    </Chip>
                  </div>

                  <div className="relative flex min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-royal-gradient p-space-lg shadow-xl">
                    <div className="pointer-events-none absolute inset-0 opacity-15">
                      <svg width="100%" height="100%" aria-hidden="true">
                        <defs>
                          <pattern id="diag-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1.5" fill="#ffffff" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#diag-grid)" />
                      </svg>
                    </div>
                    {/* Oversized watermark of the active profile's own icon. */}
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={selected?.key}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="pointer-events-none absolute -bottom-6 -right-4 text-white/[0.07]"
                        aria-hidden="true"
                      >
                        <Icon name={selected?.icon} size={168} />
                      </motion.span>
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selected?.key}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="relative z-10 flex flex-1 flex-col items-center gap-space-md text-center md:items-start md:text-left"
                      >
                        <div className="flex w-full items-start justify-center gap-space-sm md:justify-between">
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-accent-gold backdrop-blur-md">
                            <Icon name={selected?.icon} size={24} />
                          </span>
                          {selected?.badge ? (
                            <span className="rounded-full border border-accent-gold/40 bg-white/10 px-3 py-1.5 text-label-md font-bold uppercase tracking-wider text-accent-gold-light backdrop-blur-md">
                              {selected.badge}
                            </span>
                          ) : null}
                        </div>

                        {/*
                          A statistic only when staff entered one — the dashboard tells
                          them to leave the value blank unless the figure is documented,
                          and the panel then names the match instead, as it always has.
                          The figure and its label are styled the way the hero's stats
                          are, so a number on this gradient always reads the same way.
                        */}
                        {metricValue ? (
                          <div className="flex flex-col gap-1">
                            <p className="font-display text-headline-md font-bold text-accent-gold-light">
                              {metricValue}
                            </p>
                            {metricLabel ? (
                              <p className="text-label-sm uppercase tracking-wider text-white/70">
                                {metricLabel}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="font-display text-headline-md font-semibold leading-snug text-white">
                            {metricLabel ?? selected?.title}
                          </p>
                        )}
                        <p className="text-body-sm leading-relaxed text-white/85">
                          {selected?.description}
                        </p>

                        <div className="mt-auto flex flex-wrap items-center gap-space-sm pt-space-sm">
                          <ButtonLink
                            to="/collections/hair-care"
                            variant="gold"
                            size="sm"
                            iconRight="arrow_forward"
                          >
                            See matching formulas
                          </ButtonLink>
                          <ButtonLink
                            to="/guides/shampoo-guide"
                            variant="glass"
                            size="sm"
                            icon="info"
                          >
                            Shampoo guide
                          </ButtonLink>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Position indicator — decorative; the cards do the selecting. */}
                    <div className="relative z-10 mt-space-md flex items-center gap-1.5" aria-hidden="true">
                      {profiles.map((profile, index) => (
                        <span
                          key={profile.id}
                          className={cn(
                            'h-0.5 rounded-full transition-all duration-300',
                            index === selectedIndex ? 'w-8 bg-accent-gold' : 'w-4 bg-white/25',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------- profile grid */}
              <div className="flex flex-col gap-space-md lg:col-span-7">
                <SectionHeading
                  eyebrow="Guided selection"
                  title="Select your hair and scalp need"
                />

                <Stagger
                  as="ul"
                  className="grid grid-cols-1 gap-space-sm sm:grid-cols-2"
                  delay={0.06}
                >
                  {profiles.map((profile) => {
                    const isActive = profile.key === selected?.key
                    return (
                      <StaggerItem as="li" key={profile.id} className="h-full">
                        <button
                          type="button"
                          onClick={() => setSelectedKey(profile.key)}
                          aria-pressed={isActive}
                          className={cn(
                            'group flex h-full w-full items-center justify-center gap-space-sm rounded-2xl border p-space-md text-center transition-all duration-300 md:justify-start md:text-left',
                            isActive
                              ? 'border-secondary/40 bg-surface-container-lowest shadow-e2 ring-2 ring-secondary/25'
                              : 'border-outline-variant/30 bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-md',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300',
                              isActive
                                ? 'bg-royal-gradient-compact text-accent-gold'
                                : 'bg-secondary-fixed text-on-secondary-fixed',
                            )}
                          >
                            <Icon name={profile.icon} size={20} />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 md:items-start">
                            <span className="font-display text-body-lg font-semibold leading-snug text-on-surface">
                              {profile.title}
                            </span>
                            {profile.badge ? (
                              <span className="rounded-full bg-royal-gradient-compact px-2.5 py-0.5 text-label-sm font-bold text-white">
                                {profile.badge}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </StaggerItem>
                    )
                  })}
                </Stagger>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  )
}
