import { Hero } from './Hero'
import { CollectionsSection } from './CollectionsSection'
import { FeaturedProducts } from './FeaturedProducts'
import { ApproachSection } from './ApproachSection'
import { TestimonialsSection } from './TestimonialsSection'
import { DistributionSection } from './DistributionSection'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import type { HomeSection } from '@/lib/types'

/**
 * Renders a home page block by its `sectionType`. The dashboard controls the order,
 * visibility and copy of every block, so adding a section type here is the only code
 * change needed to introduce a new kind of block.
 */
export function SectionRenderer({ sections }: { sections: HomeSection[] }) {
  return (
    <>
      {sections.map((section) => {
        switch (section.sectionType) {
          case 'hero':
            return <Hero key={section.id} section={section} />
          case 'collections':
            return <CollectionsSection key={section.id} section={section} />
          case 'featured-products':
            return <FeaturedProducts key={section.id} section={section} />
          case 'approach':
            return <ApproachSection key={section.id} section={section} />
          case 'testimonials':
            return <TestimonialsSection key={section.id} section={section} />
          case 'distribution':
            return <DistributionSection key={section.id} section={section} />
          case 'generic':
          default:
            return <GenericSection key={section.id} section={section} />
        }
      })}
    </>
  )
}

/** Fallback block for any section type without a bespoke component. */
function GenericSection({ section }: { section: HomeSection }) {
  return (
    <Section tone="surface">
      <Container size="narrow">
        <Reveal className="flex flex-col items-center gap-space-sm text-center">
          {section.eyebrow ? <span className="eyebrow text-secondary">{section.eyebrow}</span> : null}
          {section.title ? (
            <h2 className="font-display text-headline-lg-mobile font-semibold text-on-surface md:text-headline-lg">
              {section.title}
            </h2>
          ) : null}
          {section.subtitle ? (
            <p className="text-body-md text-on-surface-variant">{section.subtitle}</p>
          ) : null}
          {/*
            No `prose-albaik` here. That class was referenced in three places and defined
            in none — `grep prose src/index.css` returns nothing — so it styled nothing.
            `section.body` is plain text in the dashboard, so the utilities on this div
            are the whole treatment.
          */}
          {section.body ? (
            <div
              className="text-body-md leading-relaxed text-on-surface-variant"
              dangerouslySetInnerHTML={{ __html: section.body }}
            />
          ) : null}
          {section.primaryCtaLabel ? (
            <ButtonLink to={section.primaryCtaHref ?? '/'} variant="primary" iconRight="arrow_forward">
              {section.primaryCtaLabel}
            </ButtonLink>
          ) : null}
        </Reveal>
      </Container>
    </Section>
  )
}
