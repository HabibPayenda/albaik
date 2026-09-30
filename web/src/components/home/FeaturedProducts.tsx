import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppSelector } from '@/store/hooks'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { Container, Section, SectionHeading } from '@/components/ui/Layout'
import { ProductCard } from '@/components/ui/ProductCard'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import type { HomeSection } from '@/lib/types'

/**
 * "Signature Formulations" — the product bento with the filter pill rail from the
 * mockup. Filtering is client-side over the featured set and animated with
 * framer-motion's layout projection so tiles reflow instead of snapping.
 */
export function FeaturedProducts({ section }: { section?: HomeSection }) {
  const products = useAppSelector((state) => state.home.data?.featuredProducts ?? [])
  const settings = useSiteSettings()
  const [active, setActive] = useState('all')

  const filters = useMemo(() => {
    const seen = new Map<string, string>()
    for (const product of products) {
      const label = product.badge ?? product.formulationLabel
      if (label && !seen.has(label)) seen.set(label, label)
    }
    return [
      { key: 'all', label: settings.text('labels.featured.allFormulas', 'All formulas') },
      ...[...seen].map(([key, label]) => ({ key, label })),
    ]
  }, [products, settings])

  const visible = useMemo(
    () =>
      active === 'all'
        ? products
        : products.filter((p) => (p.badge ?? p.formulationLabel) === active),
    [products, active],
  )

  if (!products.length) return null

  return (
    <Section id={section?.key ?? 'signature-trio'} tone="surface">
      <Container>
        <div className="mb-space-xl flex flex-col justify-between gap-space-md md:flex-row md:items-end">
          <SectionHeading
            eyebrow={section?.eyebrow}
            title={section?.title}
            subtitle={section?.subtitle}
            className="md:max-w-2xl"
          />

          {filters.length > 2 ? (
            <div
              className="flex items-center gap-1.5 self-start overflow-x-auto rounded-full bg-surface-container-low p-1 shadow-sm md:self-auto"
              role="tablist"
              aria-label="Filter formulations"
            >
              {filters.map((filter) => {
                const isActive = active === filter.key
                return (
                  <button
                    key={filter.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActive(filter.key)}
                    className={cn(
                      'relative shrink-0 rounded-full px-4 py-2 text-label-md font-semibold transition-colors duration-300',
                      isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="formula-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-surface-container-lowest shadow-sm"
                      />
                    ) : null}
                    <span className="relative z-10 whitespace-nowrap">{filter.label}</span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        {/*
          Four columns at xl, matching ProductGrid. Three columns made the home
          tiles ~400px wide, which pushed the row pitch to 389px and left only 1.7
          rows visible in a 900px viewport — the home page was the one grid that
          did not meet the "two rows in a viewport" target.
        */}
        <motion.div layout className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {visible.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -12 }}
                transition={{ duration: 0.42, ease: EASE, delay: index * 0.05 }}
              >
                <ProductCard
                  product={product}
                  showPrice={settings.showPrices}
                  priceOnRequest={settings.priceOnRequest}
                  currency={settings.currency}
                  priority={index < 4}
                  className="h-full"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {section?.primaryCtaLabel ? (
          <div className="mt-space-xl flex justify-center">
            <ButtonLink to={section.primaryCtaHref ?? '/collections'} variant="outline" size="lg" iconRight="arrow_forward">
              {section.primaryCtaLabel}
            </ButtonLink>
          </div>
        ) : null}
      </Container>
    </Section>
  )
}
