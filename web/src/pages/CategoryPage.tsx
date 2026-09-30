import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchCategory, fetchProducts } from '@/store/catalogSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useI18n } from '@/i18n'
import { Container, PageHero, Section, SectionHeading } from '@/components/ui/Layout'
import { ProductGrid, ResultsBar } from '@/components/ui/ProductGrid'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { ButtonLink } from '@/components/ui/Button'
import { Stagger, StaggerItem } from '@/components/ui/Reveal'
import { cn, plural } from '@/lib/utils'

/**
 * A single collection — `/collections/:categorySlug`.
 *
 * The page is a two-step drill-down: brands first, then the products inside them. The
 * section headings used to read "Step two" / "Step three" / "Products", which said
 * nothing about the content; they now state the fact that is actually true — how many
 * brands are inside, and which brand the grid is currently filtered to.
 */
export function CategoryPage() {
  const { categorySlug = '' } = useParams()
  const dispatch = useAppDispatch()
  const settings = useSiteSettings()
  const { t } = useI18n()
  const category = useAppSelector((state) => state.catalog.category)
  const { products, productTotal, listStatus, categoryStatus, error } = useAppSelector(
    (state) => state.catalog,
  )
  const [brandFilter, setBrandFilter] = useState('')

  useDocumentTitle(
    category ? `${category.name} — ${settings.siteName}` : `Collection — ${settings.siteName}`,
    category?.description,
  )

  useEffect(() => {
    if (categorySlug) dispatch(fetchCategory(categorySlug))
  }, [categorySlug, dispatch])

  useEffect(() => {
    if (categorySlug) {
      dispatch(
        fetchProducts({ category: categorySlug, brand: brandFilter || undefined, pageSize: 48 }),
      )
    }
  }, [categorySlug, brandFilter, dispatch])

  const brands = useMemo(() => category?.brands ?? [], [category])
  const activeBrand = useMemo(
    () => brands.find((brand) => brand.slug === brandFilter),
    [brands, brandFilter],
  )

  if (categoryStatus === 'loading' && !category) return <PageLoader label={t('category.loading')} />

  if (categoryStatus === 'error' || (!category && categoryStatus === 'ready')) {
    return (
      <Container className="py-space-xl">
        <ErrorState
          title={t('category.notFoundTitle')}
          description={error ?? t('category.notFoundDesc', { slug: categorySlug })}
          onRetry={() => dispatch(fetchCategory(categorySlug))}
        />
      </Container>
    )
  }

  if (!category) return <PageLoader label={t('category.loading')} />

  const filterPills =
    brands.length > 1 ? (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setBrandFilter('')}
          aria-pressed={!brandFilter}
          className={cn(
            'rounded-full px-4 py-2 text-label-md font-semibold transition-colors',
            !brandFilter
              ? 'bg-royal-gradient-compact text-white shadow-md'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
          )}
        >
          {t('collections.allBrands')}
        </button>
        {brands.map((brand) => (
          <button
            key={brand.id}
            type="button"
            onClick={() => setBrandFilter(brand.slug)}
            aria-pressed={brandFilter === brand.slug}
            className={cn(
              'rounded-full px-4 py-2 text-label-md font-semibold transition-colors',
              brandFilter === brand.slug
                ? 'bg-royal-gradient-compact text-white shadow-md'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
            )}
          >
            {brand.name}
          </button>
        ))}
      </div>
    ) : undefined

  return (
    <>
      <PageHero
        eyebrow={category.tagline}
        title={category.name}
        subtitle={category.description}
        backdrop={category.imageUrl}
      >
        <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
            <Icon name="brand" size={14} className="text-accent-gold" />
            <span className="text-label-md font-semibold text-white/90">
              {plural(category.brandCount, 'brand')}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
            <Icon name="product" size={14} className="text-accent-gold" />
            <span className="text-label-md font-semibold text-white/90">
              {plural(category.productCount, 'product')}
            </span>
          </span>
        </div>
      </PageHero>

      {/* ------------------------------------------------------------- brands */}
      {brands.length ? (
        <Section tone="low" className="py-space-lg">
          <Container>
            <SectionHeading
              eyebrow={plural(category.brandCount, 'brand')}
              title={t('category.brandsIn', { name: category.name })}
              subtitle={t('category.brandsSubtitle')}
              className="mb-space-lg"
            />
            <Stagger className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <StaggerItem key={brand.id} className="h-full">
                  <Link
                    to={`/collections/${category.slug}/${brand.slug}`}
                    className="group relative flex h-full flex-col gap-space-md overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:border-accent-gold/50 hover:shadow-e3"
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gold-gradient transition-transform duration-300 group-hover:scale-x-100"
                      aria-hidden="true"
                    />

                    <div className="flex items-start justify-between gap-space-sm">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-royal-gradient-compact text-accent-gold shadow-e1">
                        <Icon name="brand" size={22} />
                      </span>
                      <span className="flex flex-col items-end">
                        <span className="font-display text-headline-md font-semibold leading-none tabular-nums text-on-surface">
                          {brand.productCount}
                        </span>
                        {/* The number is already set above, so this is the unit only. */}
                        <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                          {brand.productCount === 1 ? 'product' : 'products'}
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-display text-headline-sm font-semibold text-on-surface transition-colors duration-300 group-hover:text-primary-container">
                        {brand.name}
                      </span>
                      {brand.tagline ? (
                        <span className="text-label-lg font-semibold text-secondary">
                          {brand.tagline}
                        </span>
                      ) : null}
                      {brand.description ? (
                        <p className="line-clamp-2 text-body-sm leading-relaxed text-on-surface-variant">
                          {brand.description}
                        </p>
                      ) : null}
                    </div>

                    <span className="mt-auto inline-flex items-center gap-1.5 pt-space-sm text-label-md font-bold uppercase tracking-wider text-secondary">
                      {t('category.viewProducts')}
                      <Icon
                        name="arrow_forward"
                        size={14}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      ) : null}

      {/* ----------------------------------------------------------- products */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow={activeBrand ? activeBrand.name : t('collections.allBrands')}
            title={
              activeBrand
                ? t('collections.productsIn', { name: activeBrand.name })
                : t('collections.productsIn', { name: category.name })
            }
            className="mb-space-md"
          />

          {/* Count on the left, brand filter on the right — one control bar. */}
          <ResultsBar total={productTotal} right={filterPills} />

          <ProductGrid
            products={products}
            loading={listStatus === 'loading'}
            showPrice={settings.showPrices}
            priceOnRequest={settings.priceOnRequest}
            emptyTitle={t('category.nothingPublishedTitle')}
            emptyDescription={t('category.nothingPublishedDesc', { name: category.name })}
          />

          <div className="mt-space-xl flex justify-center">
            <ButtonLink to="/collections" variant="outline" icon="arrow_back">
              {t('category.backToAll')}
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  )
}
