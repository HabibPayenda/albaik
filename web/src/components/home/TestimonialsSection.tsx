import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { Container, Section, SectionHeading } from '@/components/ui/Layout'
import { StarRating } from '@/components/ui/StarRating'
import { Stagger, StaggerItem } from '@/components/ui/Reveal'
import { initials as toInitials } from '@/lib/utils'
import type { HomeSection } from '@/lib/types'

/**
 * Reviews only.
 *
 * The trust pillars used to render here as a ribbon beneath the reviews. They are the
 * home page's approach-section markers, so they now render in the approach section
 * (`ApproachSection`) instead. This section shows only approved testimonials; the seed
 * ships them disabled because the source document contains no approved reviews, and an
 * empty list renders nothing rather than inventing social proof.
 */
export function TestimonialsSection({ section }: { section?: HomeSection }) {
  const testimonials = useAppSelector((state) => state.home.data?.testimonials ?? [])

  if (!testimonials.length) return null

  return (
    <Section tone="surface">
      <Container>
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
      </Container>
    </Section>
  )
}
