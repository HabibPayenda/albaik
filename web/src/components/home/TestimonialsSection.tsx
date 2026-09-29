import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { Container, Section, SectionHeading } from '@/components/ui/Layout'
import { StarRating } from '@/components/ui/StarRating'
import { Stagger, StaggerItem, Reveal } from '@/components/ui/Reveal'
import { Icon } from '@/components/ui/Icon'
import { cn, initials as toInitials } from '@/lib/utils'
import type { HomeSection } from '@/lib/types'

const PILLAR_ACCENT: Record<string, string> = {
  gold: 'text-accent-gold',
  teal: 'text-marine',
  secondary: 'text-secondary',
  primary: 'text-primary',
}

/**
 * Reviews + trust ribbon.
 *
 * The source document contains no approved customer reviews, so the seed ships the
 * testimonial rows disabled. When the list is empty this section renders only the
 * trust ribbon rather than inventing social proof.
 */
export function TestimonialsSection({ section }: { section?: HomeSection }) {
  const testimonials = useAppSelector((state) => state.home.data?.testimonials ?? [])
  const pillars = useAppSelector((state) => state.home.data?.trustPillars ?? [])

  if (!testimonials.length && !pillars.length) return null

  return (
    <Section tone="surface">
      <Container>
        {testimonials.length ? (
          <>
            <SectionHeading
              eyebrow={section?.eyebrow}
              title={section?.title}
              subtitle={section?.subtitle}
              align="center"
              className="mb-space-xl"
            />

            <Stagger className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <StaggerItem key={testimonial.id}>
                  <motion.figure
                    whileHover={{ y: -6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="relative flex h-full flex-col justify-between gap-space-md overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-sm transition-shadow duration-300 hover:shadow-e2"
                  >
                    <Quote
                      size={72}
                      className="pointer-events-none absolute -top-2 -right-2 text-secondary/5"
                      aria-hidden="true"
                    />
                    <div className="relative flex flex-col gap-space-xs">
                      <StarRating value={testimonial.rating} showValue={false} size={18} />
                      {testimonial.title ? (
                        <blockquote className="mt-2 font-display text-headline-sm font-semibold text-on-surface">
                          {testimonial.title}
                        </blockquote>
                      ) : null}
                      {testimonial.quote ? (
                        <p className="text-body-sm leading-relaxed text-on-surface-variant">
                          {testimonial.quote}
                        </p>
                      ) : null}
                    </div>
                    <figcaption className="flex items-center gap-3 border-t border-outline-variant/30 pt-space-sm">
                      <span className="flex size-10 items-center justify-center rounded-full bg-royal-gradient-compact text-label-md font-bold text-white">
                        {testimonial.initials || toInitials(testimonial.name)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-label-md font-bold text-on-surface">
                          {testimonial.name}
                        </span>
                        {testimonial.role ? (
                          <span className="truncate text-label-sm text-on-surface-variant">
                            {testimonial.role}
                          </span>
                        ) : null}
                      </span>
                    </figcaption>
                  </motion.figure>
                </StaggerItem>
              ))}
            </Stagger>
          </>
        ) : null}

        {pillars.length ? (
          <Reveal
            className={cn(
              'grid grid-cols-2 gap-gutter border-surface-container-high/60 py-space-lg md:grid-cols-4',
              testimonials.length ? 'mt-space-xl border-y' : 'border-y',
            )}
          >
            {pillars.map((pillar) => (
              <div key={pillar.id} className="flex items-center justify-center gap-space-sm">
                <Icon
                  name={pillar.icon}
                  size={30}
                  className={PILLAR_ACCENT[pillar.accent ?? 'secondary'] ?? PILLAR_ACCENT.secondary}
                />
                <div className="flex flex-col">
                  <span className="text-label-md font-bold text-on-surface">{pillar.title}</span>
                  {pillar.subtitle ? (
                    <span className="text-body-sm text-on-surface-variant">{pillar.subtitle}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </Reveal>
        ) : null}
      </Container>
    </Section>
  )
}
