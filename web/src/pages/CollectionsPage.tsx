import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchCategories, fetchProducts } from '@/store/catalogSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useI18n } from '@/i18n'
import { PageHero, Container, Section, SectionHeading } from '@/components/ui/Layout'
import { ProductGrid, Pagination, ResultsBar } from '@/components/ui/ProductGrid'
import { Select, TextInput } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Stagger, StaggerItem } from '@/components/ui/Reveal'
import { plural } from '@/lib/utils'

/**
 * The catalogue index — `/collections`.
 *
 * This is the portfolio's front door, so the collections themselves lead the page as
 * full cards rather than the four cramped chips that used to sit here. The cards reuse
 * the exact treatment of the brand cards one level down (`CategoryPage`), so the whole
 * drill-down reads as one system: collection card → brand card → product card.
 */
export function CollectionsPage() {
  const dispatch = useAppDispatch()
  const settings = useSiteSettings()
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()

  const categories = useAppSelector((state) => state.catalog.categories)
  const { products, productTotal, productTotalPages, productPage, listStatus } = useAppSelector(
    (state) => state.catalog,
  )

  useDocumentTitle(`${t('collections.title')} — ${settings.siteName}`)

  const category = params.get('category') ?? ''
  const brand = params.get('brand') ?? ''
  const search = params.get('search') ?? ''
  const page = Number(params.get('page') ?? 1)

  useEffect(() => {
    if (!categories.length) dispatch(fetchCategories(true))
  }, [categories.length, dispatch])

  useEffect(() => {
    dispatch(fetchProducts({ category, brand, search, page, pageSize: 12 }))
  }, [dispatch, category, brand, search, page])

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === category),
    [categories, category],
  )

  /**
   * Across collections the same brand slug appears once per collection — "Albaik" spans
   * four. Emitting one `<option>` each produced duplicate values, so choosing
   * "Albaik — Skin Care" filtered by slug and returned all four collections' products.
   * With no collection selected the list is now deduped by slug; with one selected it is
   * already unique.
   */
  const brandOptions = useMemo(() => {
    const source = activeCategory?.brands ?? categories.flatMap((c) => c.brands ?? [])
    if (activeCategory) return source
    const seen = new Set<string>()
    return source.filter((item) => {
      if (seen.has(item.slug)) return false
      seen.add(item.slug)
      return true
    })
  }, [activeCategory, categories])

  const totals = useMemo(
    () => ({
      collections: categories.length,
      brands: new Set(categories.flatMap((c) => (c.brands ?? []).map((b) => b.slug))).size,
      products: categories.reduce((sum, c) => sum + c.productCount, 0),
    }),
    [categories],
  )

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  const clearAll = () => setParams(new URLSearchParams(), { replace: true })
  const hasFilters = Boolean(category || brand || search)

  const labelClass =
    'mb-1.5 block text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant'

  return (
    <>
      <PageHero eyebrow={t('nav.thePortfolio')} title={t('collections.title')} subtitle={settings.description}>
        <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
            <Icon name="layers" size={14} className="text-accent-gold" />
            <span className="text-label-md font-semibold text-white/90">
              {plural(totals.collections, 'collection')}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
            <Icon name="brand" size={14} className="text-accent-gold" />
            <span className="text-label-md font-semibold text-white/90">
              {plural(totals.brands, 'brand')}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
            <Icon name="product" size={14} className="text-accent-gold" />
            <span className="text-label-md font-semibold text-white/90">
              {plural(totals.products, 'product')}
            </span>
          </span>
        </div>
      </PageHero>

      {/* -------------------------------------------------------- the collections */}
      <Section tone="low">
        <Container>
          <SectionHeading
            eyebrow={plural(totals.collections, 'collection')}
            title={t('collections.shopByCollection')}
            subtitle={t('collections.shopSubtitle')}
            className="mb-space-lg"
          />
          <Stagger className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((item) => (
              <StaggerItem key={item.id} className="h-full">
                <Link
                  to={`/collections/${item.slug}`}
                  className="group relative flex h-full flex-col items-center gap-space-md overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg text-center shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:border-accent-gold/50 hover:shadow-e3 md:items-stretch md:text-left"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gold-gradient transition-transform duration-300 group-hover:scale-x-100"
                    aria-hidden="true"
                  />

                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-royal-gradient-compact text-accent-gold shadow-e1">
                    <Icon name={item.icon} size={22} />
                  </span>

                  <div className="flex flex-col items-center gap-1 md:items-stretch">
                    <span className="font-display text-headline-sm font-semibold text-on-surface transition-colors duration-300 group-hover:text-primary-container">
                      {item.name}
                    </span>
                    {item.tagline ? (
                      <span className="text-label-lg font-semibold text-secondary">
                        {item.tagline}
                      </span>
                    ) : null}
                    {item.description ? (
                      <p className="line-clamp-3 text-body-sm leading-relaxed text-on-surface-variant">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  {/*
                   * Counts stack above the CTA rather than sharing a row with it. At
                   * `lg` the card is only ~180px wide inside its padding, and
                   * "2 brands · 11 products" plus "Explore →" overflowed it.
                   */}
                  <div className="mt-auto flex w-full flex-col items-center gap-space-xs border-t border-outline-variant/30 pt-space-sm md:items-stretch">
                    <span className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                      {plural(item.brandCount, 'brand')} · {plural(item.productCount, 'product')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-label-md font-bold uppercase tracking-wider text-secondary">
                      {t('collections.explore')}
                      <Icon
                        name="arrow_forward"
                        size={14}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* ----------------------------------------------------------- the catalogue */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow={activeCategory ? activeCategory.name : t('collections.allCollections')}
            title={
              activeCategory
                ? t('collections.productsIn', { name: activeCategory.name })
                : t('collections.productsAcross')
            }
            className="mb-space-md"
          />

          {/* One slim toolbar — search leads, the two selects follow, Clear trails. */}
          <div className="mb-space-md flex flex-col gap-space-sm rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-md lg:flex-row lg:items-end">
            <div className="flex-1 lg:min-w-64">
              <label htmlFor="catalog-search" className={labelClass}>
                {t('common.search')}
              </label>
              <div className="relative">
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
                />
                <TextInput
                  id="catalog-search"
                  value={search}
                  onChange={(e) => update({ search: e.target.value || undefined })}
                  placeholder={t('collections.searchPlaceholder')}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-full lg:w-52">
              <label htmlFor="catalog-category" className={labelClass}>
                {t('collections.filterCollection')}
              </label>
              <Select
                id="catalog-category"
                value={category}
                onChange={(e) => update({ category: e.target.value || undefined, brand: undefined })}
              >
                <option value="">{t('collections.allCollections')}</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full lg:w-52">
              <label htmlFor="catalog-brand" className={labelClass}>
                {t('collections.filterBrand')}
              </label>
              <Select
                id="catalog-brand"
                value={brand}
                onChange={(e) => update({ brand: e.target.value || undefined })}
              >
                <option value="">{t('collections.allBrands')}</option>
                {brandOptions.map((item) => (
                  <option key={`${item.categoryId}-${item.id}`} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-outline-variant/50 px-3.5 py-2.5 text-label-md font-semibold text-on-surface-variant transition-colors hover:border-error/40 hover:text-error"
              >
                <X size={14} />
                {t('collections.clearFilters')}
              </button>
            ) : null}
          </div>

          <ResultsBar
            total={productTotal}
            right={
              /* Only worth stating when it differs from the unfiltered default that the
                 section eyebrow already names. */
              hasFilters ? (
                <span className="text-body-sm text-on-surface-variant">
                  {activeCategory ? activeCategory.name : t('collections.allCollections')}
                  {brand
                    ? ` · ${brandOptions.find((b) => b.slug === brand)?.name ?? brand}`
                    : ''}
                </span>
              ) : undefined
            }
          />

          <ProductGrid
            products={products}
            loading={listStatus === 'loading'}
            showPrice={settings.showPrices}
            priceOnRequest={settings.priceOnRequest}
            currency={settings.currency}
            onReset={hasFilters ? clearAll : undefined}
            emptyTitle={t('collections.noMatchTitle')}
            emptyDescription={t('collections.noMatchDesc')}
          />

          <Pagination
            page={productPage}
            totalPages={productTotalPages}
            onChange={(next) => update({ page: String(next) })}
          />
        </Container>
      </Section>
    </>
  )
}
