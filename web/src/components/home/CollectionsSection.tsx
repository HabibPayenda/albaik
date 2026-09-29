import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { Section, SectionHeading, Container } from '@/components/ui/Layout'
import { Stagger, StaggerItem } from '@/components/ui/Reveal'
import { Icon } from '@/components/ui/Icon'
import { cn, plural } from '@/lib/utils'
import type { Brand, HomeSection } from '@/lib/types'

const ACCENT_GLOW: Record<string, string> = {
  primary: 'from-[#0e3b9c]/12',
  secondary: 'from-[#1a4fcf]/12',
  teal: 'from-[#008891]/12',
  gold: 'from-[#d4af37]/15',
}

/**
 * Category grid — the entry point of the Category -> Brand -> Product hierarchy.
 * Each card lists the brands that live inside it so the structure is obvious.
 */
export function CollectionsSection({ section }: { section?: HomeSection }) {
  const categories = useAppSelector((state) => state.home.data?.categories ?? [])
  const allBrands = useAppSelector((state) => state.site.brands)

  /**
   * `/api/home` ships `categories` **without** a nested `brands` array — its keys are
   * id/slug/name/tagline/description/icon/accent/counts only. Reading `category.brands`
   * therefore produced `undefined` and the card's brand list never rendered a single
   * link. The brands arrive flat on `/api/bootstrap`, so join them on `categorySlug`
   * exactly as the header's mega menu does.
   */
  const brandsByCategory = useMemo(() => {
    const map = new Map<string, Brand[]>()
    for (const brand of allBrands) {
      if (!brand.categorySlug) continue
      const list = map.get(brand.categorySlug)
      if (list) list.push(brand)
      else map.set(brand.categorySlug, [brand])
    }
    return map
  }, [allBrands])

  if (!categories.length) return null

  return (
    <Section id={section?.key ?? 'collections'} tone="surface">
      <Container>
        <SectionHeading
          eyebrow={section?.eyebrow}
          title={section?.title}
          subtitle={section?.subtitle}
          className="mb-space-xl"
        />

        <Stagger className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <StaggerItem key={category.id}>
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-md shadow-sm transition-shadow duration-300 hover:shadow-e2 md:p-space-lg"
              >
                <div
                  className={cn(
                    'pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-gradient-to-br to-transparent blur-2xl',
                    ACCENT_GLOW[category.accent ?? 'primary'] ?? ACCENT_GLOW.primary,
                  )}
                />

                <div className="relative z-10 flex flex-1 flex-col gap-space-sm">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-royal-gradient-compact text-accent-gold shadow-md transition-transform duration-500 group-hover:scale-105">
                    <Icon name={category.icon} size={22} />
                  </span>

                  {/*
                   * The count used to share a row with the name, which forced the name to
                   * truncate — "Everyday Essen…". Stacking them gives the name the full
                   * width and lets the count carry its own unit as a quiet label.
                   */}
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-display text-headline-sm font-semibold text-on-surface">
                      {category.name}
                    </h3>
                    <span className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                      {plural(category.productCount, 'product')}
                    </span>
                  </div>

                  {/* The Dari name used to print here under the English one. Localised
                      names belong in the localised editions, not on the English page. */}
                  {category.tagline ? (
                    <p className="line-clamp-2 text-body-sm text-on-surface-variant">{category.tagline}</p>
                  ) : null}

                  <ul className="mt-auto flex flex-col gap-1.5 border-t border-outline-variant/30 pt-space-sm">
                    {brandsByCategory.get(category.slug)?.slice(0, 4).map((brand) => (
                      <li key={brand.id}>
                        <Link
                          to={`/collections/${category.slug}/${brand.slug}`}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:bg-water-foam hover:text-primary-container"
                        >
                          <span className="truncate">{brand.name}</span>
                          <span className="shrink-0 whitespace-nowrap text-label-sm">
                            {plural(brand.productCount, 'product')}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={`/collections/${category.slug}`}
                    className="inline-flex items-center gap-1.5 pt-1 text-label-md font-bold uppercase tracking-wider text-secondary transition-colors hover:text-primary"
                  >
                    Browse {category.name}
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  )
}
