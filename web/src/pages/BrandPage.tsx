import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchBrand } from '@/store/catalogSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentHead, useSiteMeta } from '@/hooks/useDocumentHead'
import { brandHead, notFoundHead } from '@/lib/seo'
import { useI18n } from '@/i18n'
import { Container, PageHero, Section, SectionHeading } from '@/components/ui/Layout'
import { ProductGrid, ResultsBar } from '@/components/ui/ProductGrid'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { ButtonLink } from '@/components/ui/Button'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Stagger, StaggerItem } from '@/components/ui/Reveal'
import { plural } from '@/lib/utils'

/**
 * A single brand inside a collection — `/collections/:categorySlug/:brandSlug`.
 *
 * The third and last level of the catalogue drill-down, and the only one whose
 * subject is a *brand* rather than a set of products. That gives the page two jobs
 * the level above it does not have: place the brand inside the collection it sits
 * in, and place it across the portfolio — because "Albaik" is one brand spread over
 * four collections while "Avora Shine" lives in one.
 *
 * Both answers are derived from the bootstrap index in `state.site.brands`, which
 * already carries every brand with its `categorySlug`, `categoryName` and
 * `productCount`. So the sibling rail and the availability tile cost no request —
 * and, importantly, neither is invented: they are read straight off the catalogue.
 */
export function BrandPage() {
  const { categorySlug = '', brandSlug = '' } = useParams()
  const dispatch = useAppDispatch()
  const settings = useSiteSettings()
  const site = useSiteMeta()
  const { t } = useI18n()
  /* Which logo URL has already failed to load. Stale artwork must read as "no logo"
     rather than leaving an empty white tile beside the heading. */
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const brand = useAppSelector((state) => state.catalog.brand)
  const { brandStatus, error } = useAppSelector((state) => state.catalog)

  /* The catalogue index, already in the store from `fetchBootstrap`. */
  const allBrands = useAppSelector((state) => state.site.brands)
  const categories = useAppSelector((state) => state.site.categories)

  const head = useMemo(() => {
    if (brand) return brandHead(site, brand)
    // A failed/missing brand must not keep the previous route's canonical in the head.
    if (brandStatus === 'error') return notFoundHead(site)
    return null
  }, [site, brand, brandStatus])
  useDocumentHead(head)

  useEffect(() => {
    if (categorySlug && brandSlug) dispatch(fetchBrand({ categorySlug, brandSlug }))
  }, [categorySlug, brandSlug, dispatch])

  const category = useMemo(
    () => categories.find((entry) => entry.slug === categorySlug),
    [categories, categorySlug],
  )

  /** The other brands sitting beside this one in the same collection. */
  const siblings = useMemo(
    () => allBrands.filter((entry) => entry.categorySlug === categorySlug && entry.slug !== brandSlug),
    [allBrands, categorySlug, brandSlug],
  )

  /** The same brand in the collections this page is not about. */
  const elsewhere = useMemo(
    () => allBrands.filter((entry) => entry.slug === brandSlug && entry.categorySlug !== categorySlug),
    [allBrands, brandSlug, categorySlug],
  )

  if (brandStatus === 'loading' && !brand) return <PageLoader label={t('brand.loading')} />

  if (brandStatus === 'error' || (brandStatus === 'ready' && !brand)) {
    return (
      <Container className="py-space-xl">
        <ErrorState
          title={t('brand.notFoundTitle')}
          description={error ?? t('brand.notFoundDesc', { slug: brandSlug })}
          onRetry={() => dispatch(fetchBrand({ categorySlug, brandSlug }))}
        />
      </Container>
    )
  }

  if (!brand) return <PageLoader label={t('brand.loading')} />

  const products = brand.products ?? []
  const categoryName = category?.name ?? brand.categoryName ?? categorySlug
  const logoUrl = brand.logoUrl && brand.logoUrl !== failedLogo ? brand.logoUrl : null

  return (
    <>
      <div className="w-full border-b border-outline-variant/30 bg-surface-container-lowest">
        <Container className="py-3">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/' },
              { label: 'Collections', to: '/collections' },
              { label: categoryName, to: `/collections/${categorySlug}` },
              { label: brand.name },
            ]}
          />
        </Container>
      </div>

      <PageHero
        eyebrow={brand.categoryName ? `${brand.categoryName} · ${t('brand.brandLabel')}` : t('brand.brandLabel')}
        title={
          /* The brand's own mark, set beside the name. Both artwork fields are optional
             in the dashboard, so an unset logo leaves the name alone — and a logo that
             no longer resolves does the same rather than leaving an empty tile beside
             the heading. The white tile is what keeps a dark or transparent mark
             legible against the hero. */
          <span className="flex items-center gap-space-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                onError={() => setFailedLogo(logoUrl)}
                className="size-10 shrink-0 rounded-xl bg-clinical-white object-contain p-1 shadow-e1 md:size-14"
              />
            ) : null}
            {brand.name}
          </span>
        }
        subtitle={brand.description}
        backdrop={brand.imageUrl}
        accent={brand.accent}
      >
        <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
          {brand.tagline ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-label-md font-semibold text-accent-gold-light backdrop-blur-md">
              <Icon name="auto_awesome" size={14} />
              {brand.tagline}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
            <Icon name="product" size={14} className="text-accent-gold" />
            <span className="text-label-md font-semibold text-white/90">
              {plural(brand.productCount, 'product')}
            </span>
          </span>
          <Link
            to={`/collections/${categorySlug}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md transition-colors hover:border-accent-gold/60 hover:bg-white/15"
          >
            <Icon name="category" size={14} className="text-accent-gold" />
            <span className="text-label-md font-semibold text-white/90">{categoryName}</span>
            <Icon name="arrow_forward" size={13} className="text-white/70" />
          </Link>
        </div>
      </PageHero>

      {/* ------------------------------------------------------- at a glance */}
      {/*
       * Three facts, on the hairline grid the design system already uses for
       * clinical data (`gap-px` over a tinted container, white tiles on top). It
       * reads as a spec strip rather than a card, which is the right weight for
       * three lines of metadata sitting directly under a hero.
       */}
      <Section tone="low" className="py-space-lg">
        <Container>
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-outline-variant/40 bg-outline-variant/40 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-space-xs bg-surface-container-lowest p-space-lg text-center md:items-start md:text-left">
              <dt className="inline-flex items-center justify-center gap-2 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant md:justify-start">
                <Icon name="category" size={14} className="text-secondary" />
                {t('brand.collection')}
              </dt>
              <dd className="font-display text-headline-sm font-semibold text-on-surface">
                {categoryName}
              </dd>
              <dd className="text-body-sm leading-relaxed text-on-surface-variant">
                {category?.tagline ?? t('brand.partOfRange', { name: categoryName })}
              </dd>
            </div>

            <div className="flex flex-col items-center gap-space-xs bg-surface-container-lowest p-space-lg text-center md:items-start md:text-left">
              <dt className="inline-flex items-center justify-center gap-2 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant md:justify-start">
                <Icon name="product" size={14} className="text-secondary" />
                {t('brand.products')}
              </dt>
              <dd className="font-display text-headline-sm font-semibold tabular-nums text-on-surface">
                {brand.productCount}
              </dd>
              <dd className="text-body-sm leading-relaxed text-on-surface-variant">
                Listed under {brand.name} in this collection.
              </dd>
            </div>

            <div className="flex flex-col items-center gap-space-xs bg-surface-container-lowest p-space-lg text-center md:items-start md:text-left">
              <dt className="inline-flex items-center justify-center gap-2 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant md:justify-start">
                <Icon name="layers" size={14} className="text-secondary" />
                {t('brand.availability')}
              </dt>
              {elsewhere.length ? (
                <>
                  <dd className="font-display text-headline-sm font-semibold text-on-surface">
                    {elsewhere.length + 1} collections
                  </dd>
                  <dd className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:justify-start">
                    {/* Without this the tile claims four collections and lists three. */}
                    <span className="text-body-sm text-on-surface-variant">{t('brand.alsoIn')}</span>
                    {elsewhere.map((entry) => (
                      <Link
                        key={entry.id}
                        to={`/collections/${entry.categorySlug}/${entry.slug}`}
                        /* `py-1` takes these from a 20px line box to a 28px target —
                           WCAG 2.2 SC 2.5.8 wants 24px, and they sit in a `<dd>`, so
                           the inline-text exemption does not cover them. */
                        className="inline-flex items-center gap-1 py-1 text-body-sm font-semibold text-secondary underline decoration-secondary/30 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                      >
                        {entry.categoryName}
                        <Icon name="arrow_forward" size={12} />
                      </Link>
                    ))}
                  </dd>
                </>
              ) : (
                <>
                  <dd className="font-display text-headline-sm font-semibold text-on-surface">
                    {t('brand.onlyIn', { name: categoryName })}
                  </dd>
                  <dd className="text-body-sm leading-relaxed text-on-surface-variant">
                    {t('brand.listedAlone', { name: brand.name })}
                  </dd>
                </>
              )}
            </div>
          </dl>
        </Container>
      </Section>

      {/* ----------------------------------------------------------- products */}
      <Section tone="surface">
        <Container>
          {/*
           * No eyebrow here. The count is already stated twice on this page — once in
           * the availability strip and once by `ResultsBar` directly below — and a third
           * "6 products" above the heading was pure repetition.
           */}
          <SectionHeading title={t('brand.rangeTitle', { name: brand.name })} className="mb-space-md" />

          <ResultsBar
            total={products.length}
            right={
              <Link
                to={`/collections/${categorySlug}`}
                /* `text-label-md` gives a 16px line box — padding lifts it over the
                   24px minimum without changing how the row reads. */
                className="inline-flex items-center gap-1.5 py-1.5 text-label-md font-semibold text-secondary transition-colors hover:text-primary"
              >
                <Icon name="arrow_back" size={14} />
                {t('brand.allInCategory', { category: categoryName })}
              </Link>
            }
          />

          <ProductGrid
            products={products}
            showPrice={settings.showPrices}
            priceOnRequest={settings.priceOnRequest}
            currency={settings.currency}
            emptyTitle={t('brand.noProductsTitle')}
            emptyDescription={t('brand.noProductsDesc', { name: brand.name })}
          />

          <div className="mt-space-xl flex flex-wrap justify-center gap-space-sm">
            <ButtonLink to="/contact?topic=wholesale" variant="primary" icon="assignment">
              {t('contact.wholesaleEnquiry')}
            </ButtonLink>
            <ButtonLink to={`/collections/${categorySlug}`} variant="outline" icon="arrow_back">
              {t('brand.backTo', { name: categoryName })}
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------- siblings */}
      {siblings.length ? (
        <Section tone="low" className="pt-space-lg">
          <Container>
            <SectionHeading
              eyebrow={t('brand.otherBrandsEyebrow', { name: categoryName })}
              title={t('brand.otherBrandsTitle', { name: categoryName })}
              subtitle={t('brand.otherBrandsSubtitle', { name: categoryName, count: siblings.length + 1 })}
              className="mb-space-lg"
            />
            {/*
             * A stacked rail rather than the card grid used one level up. It reads
             * well at any count — the smallest collection here has a single sibling,
             * and one card alone in a three-up grid looks like a loading failure.
             */}
            <Stagger className="flex flex-col gap-space-sm">
              {siblings.map((sibling) => (
                <StaggerItem key={sibling.id}>
                  <Link
                    to={`/collections/${sibling.categorySlug}/${sibling.slug}`}
                    className="group flex items-center gap-space-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-md shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-gold/50 hover:shadow-e2 sm:p-space-lg"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-royal-gradient-compact text-accent-gold shadow-e1">
                      <Icon name="brand" size={22} />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-headline-sm font-semibold text-on-surface transition-colors duration-300 group-hover:text-primary-container">
                        {sibling.name}
                      </span>
                      {sibling.tagline ? (
                        <span className="text-label-lg font-semibold text-secondary">
                          {sibling.tagline}
                        </span>
                      ) : null}
                      {sibling.description ? (
                        <span className="line-clamp-1 text-body-sm leading-relaxed text-on-surface-variant">
                          {sibling.description}
                        </span>
                      ) : null}
                    </span>

                    <span className="hidden shrink-0 flex-col items-end sm:flex">
                      <span className="font-display text-headline-md font-semibold leading-none tabular-nums text-on-surface">
                        {sibling.productCount}
                      </span>
                      <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                        {sibling.productCount === 1 ? 'product' : 'products'}
                      </span>
                    </span>

                    <Icon
                      name="arrow_forward"
                      size={18}
                      className="shrink-0 text-secondary transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      ) : null}
    </>
  )
}
