import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProduct, clearProduct } from '@/store/catalogSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Container, Section, SectionHeading } from '@/components/ui/Layout'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { ProductImage } from '@/components/ui/ProductImage'
import { asAccent, BadgeOverlay, Chip } from '@/components/ui/Badge'
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/Reveal'
import { ProductCard } from '@/components/ui/ProductCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { cn, formatPrice, wasPrice } from '@/lib/utils'
import { EASE } from '@/lib/motion'

const TABS = [
  { key: 'benefits', label: 'Key benefits', icon: 'check_circle' },
  { key: 'usage', label: 'How to use', icon: 'info' },
  { key: 'safety', label: 'Safety', icon: 'shield' },
] as const

/**
 * Product detail.
 *
 * Two things changed here, both from the brief:
 *
 * 1. **The gallery shows the whole product in a 4:5 Product frame.** The stage is a fixed
 *    `aspect-[4/5]` frame whose width is capped so the frame's height still clears a
 *    laptop viewport (`100dvh` minus the sticky header and page chrome). The artwork is
 *    fitted, never cropped, so a tall bottle is shown whole; the thumbnails sit in a
 *    vertical rail beside the stage on desktop rather than a row underneath, so the
 *    gallery column's height is the stage's height and nothing is pushed below the fold.
 *    The column is also sticky, which keeps the product in view while the specification
 *    column scrolls. See docs/adr/0006-product-images-are-framed-4-5.md.
 *
 * 2. **The enquiry carries the product.** "Enquire about this product" used to link to
 *    `/contact?topic=wholesale` with no product attached, so the team received a message
 *    that said nothing about what it was about. It now passes the slug through to the
 *    contact form, which resolves the product, shows it as a context chip, and sends the
 *    name and slug with the enquiry so the notification email is self-contained. The
 *    WhatsApp deep link carries the same facts plus a link back to the page.
 */
export function ProductPage() {
  const { productSlug = '' } = useParams()
  const dispatch = useAppDispatch()
  const settings = useSiteSettings()
  const { product, detailStatus, error } = useAppSelector((state) => state.catalog)
  const [activeImage, setActiveImage] = useState(0)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('benefits')

  // The tab labels are dashboard-editable copy (`labels.productTab.*`); the panel
  // headings that mirror them read the same value so an edit lands in both places.
  const tabs = useMemo(
    () => TABS.map((entry) => ({ ...entry, label: settings.text(`labels.productTab.${entry.key}`, entry.label) })),
    [settings],
  )

  useDocumentTitle(
    product ? `${product.name} — Albaik` : `Product — Albaik`,
    product?.metaDescription?.trim() || product?.shortDescription,
  )

  useEffect(() => {
    if (productSlug) dispatch(fetchProduct(productSlug))
    setActiveImage(0)
    return () => {
      dispatch(clearProduct())
    }
  }, [productSlug, dispatch])

  const gallery = product?.images.length
    ? product.images
    : product
      ? [{ id: 0, url: product.imageUrl ?? '', alt: product.name, sortOrder: 0 }]
      : []

  const step = useCallback(
    (delta: number) => {
      if (gallery.length < 2) return
      setActiveImage((current) => (current + delta + gallery.length) % gallery.length)
    },
    [gallery.length],
  )

  // Arrow keys page through the gallery, as long as focus is not inside a control.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  if (detailStatus === 'loading' || detailStatus === 'idle') {
    return <PageLoader label="Loading product" />
  }

  if (detailStatus === 'error' || !product) {
    return (
      <Container className="py-space-xl">
        <ErrorState
          title="Product not found"
          description={error ?? `We could not find "${productSlug}".`}
          onRetry={() => dispatch(fetchProduct(productSlug))}
        />
      </Container>
    )
  }

  // The product's own currency wins; the configured default is the fallback for one that
  // was saved without any.
  const price = formatPrice(product.price, product.currency || settings.currency, settings.priceOnRequest)
  const hasNumericPrice = product.price !== null && product.price !== undefined
  const was = wasPrice(product.price, product.compareAtPrice)

  const enquiryHref = `/contact?topic=product&product=${encodeURIComponent(product.slug)}`

  /*
   * The WhatsApp message is written to be complete on its own: whoever opens it in
   * the Albaik inbox can identify the exact product, its formulation and size without
   * having to look anything up, and the link goes back to the page.
   */
  const whatsappText = [
    'Hello Albaik, I would like to enquire about this product:',
    '',
    `• Product: ${product.name}`,
    product.formulationLabel ? `• Formulation: ${product.formulationLabel}` : null,
    product.brandName ? `• Brand: ${product.brandName}` : null,
    product.categoryName ? `• Collection: ${product.categoryName}` : null,
    product.size ? `• Size: ${product.size}` : null,
    '',
    `${typeof window === 'undefined' ? '' : window.location.origin}/products/${product.slug}`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const whatsappHref = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(whatsappText)}`
    : null

  const active = gallery[activeImage]

  return (
    <>
      {/* ---------------------------------------------------------- breadcrumbs */}
      <div className="w-full border-b border-outline-variant/30 bg-surface-container-lowest">
        <Container className="py-3">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/' },
              { label: 'Collections', to: '/collections' },
              {
                label: product.categoryName ?? 'Collection',
                to: `/collections/${product.categorySlug}`,
              },
              {
                label: product.brandName ?? 'Brand',
                to: `/collections/${product.categorySlug}/${product.brandSlug}`,
              },
              { label: product.name },
            ]}
          />
        </Container>
      </div>

      {/* -------------------------------------------------------------- detail */}
      <section className="w-full border-b border-outline-variant/30 bg-surface-container-low pt-space-md pb-space-lg">
        <Container>
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
            {/* ------------------------------------------------------ gallery */}
            <div className="lg:col-span-6 lg:sticky lg:top-24 lg:self-start">
              <div className="flex flex-col gap-space-sm lg:flex-row">
                {/* Stage. A 4:5 Product frame showing the whole photo; its width is
                    capped so the frame's height still clears a laptop viewport
                    (height = width × 1.25 ≤ viewport − chrome). */}
                <div className="order-1 flex flex-1 items-center justify-center lg:order-2">
                  <div
                    className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-sm shadow-e1"
                    style={{ maxWidth: 'min(100%, calc((100dvh - 13rem) * 0.8))' }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeImage}
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="group relative size-full overflow-hidden rounded-2xl"
                      >
                        <ProductImage
                          src={active?.url || product.imageUrl}
                          alt={active?.alt ?? product.name}
                          name={product.name}
                          accentFrom={product.accentFrom}
                          accentTo={product.accentTo}
                          priority
                          className="size-full"
                        />
                      </motion.div>
                    </AnimatePresence>

                    {product.badge ? (
                      <div className="pointer-events-none absolute top-4 left-4">
                        <BadgeOverlay accent={asAccent(product.badgeStyle)}>{product.badge}</BadgeOverlay>
                      </div>
                    ) : null}
                    {product.size ? (
                      <div className="pointer-events-none absolute right-4 bottom-4 rounded-lg bg-surface-container-lowest/90 px-3.5 py-2 text-label-md font-bold text-primary-container shadow-sm backdrop-blur-md">
                        {product.size}
                      </div>
                    ) : null}

                    {gallery.length > 1 ? (
                      <>
                        <GalleryArrow side="left" onClick={() => step(-1)} />
                        <GalleryArrow side="right" onClick={() => step(1)} />
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Thumbnails — a vertical rail on desktop, a row beneath on mobile. */}
                {gallery.length > 1 ? (
                  <div className="order-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:order-1 lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
                    {gallery.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setActiveImage(index)}
                        aria-label={`View image ${index + 1} of ${gallery.length}`}
                        aria-current={index === activeImage}
                        className={cn(
                          'relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-300 lg:w-full',
                          index === activeImage
                            ? 'border-secondary shadow-sm'
                            : 'border-transparent opacity-65 hover:opacity-100',
                        )}
                      >
                        <ProductImage
                          src={image.url}
                          alt={image.alt ?? product.name}
                          name={product.name}
                          accentFrom={product.accentFrom}
                          accentTo={product.accentTo}
                          zoomOnHover={false}
                          className="size-full bg-surface-container-lowest p-1"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* -------------------------------------------------------- details */}
            {/* Centred on a phone: the column is one narrow measure under a full-width
                image, so left-aligned text reads as a ragged edge. From md the image sits
                beside the copy and the block returns to a left-aligned column. */}
            <div className="flex flex-col gap-space-md text-center lg:col-span-6 md:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <Link
                  to={`/collections/${product.categorySlug}/${product.brandSlug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1.5 text-label-md font-bold uppercase tracking-wider text-on-surface transition-colors hover:bg-water-foam hover:text-primary-container"
                >
                  <Icon name="brand" size={13} />
                  {product.brandName}
                </Link>
                {product.formulationLabel ? (
                  <span className="text-label-md font-bold uppercase tracking-wider text-secondary">
                    {product.formulationLabel}
                  </span>
                ) : null}
              </div>

              <h1 className="font-display text-headline-lg-mobile font-semibold tracking-tight text-on-surface md:text-headline-lg">
                {product.name}
              </h1>

              {product.subtitle ? (
                <p className="text-body-lg text-on-surface-variant">{product.subtitle}</p>
              ) : null}

              {product.ibn ? (
                <p className="text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">
                  IBN{' '}
                  {/* A number is a left-to-right run even on an RTL page. */}
                  <span className="font-mono tracking-normal text-on-surface" dir="ltr">
                    {product.ibn}
                  </span>
                </p>
              ) : null}

              <div className="flex flex-wrap items-end justify-center gap-space-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-md md:justify-start">
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">
                    {hasNumericPrice ? 'Retail price' : 'Pricing'}
                  </span>
                  <span
                    className={cn(
                      'flex flex-wrap items-baseline gap-space-sm font-display font-bold text-primary',
                      hasNumericPrice ? 'text-headline-lg' : 'text-headline-sm',
                    )}
                  >
                    {/* The struck figure is the only place the compare-at price shows,
                        and only while it was the higher one — see `wasPrice`. */}
                    {settings.showPrices && was !== null ? (
                      <s className="text-body-lg font-semibold text-on-surface-variant">
                        <span className="sr-only">Was </span>
                        {formatPrice(was, product.currency || settings.currency, settings.priceOnRequest)}
                      </s>
                    ) : null}
                    {settings.showPrices ? price : settings.priceOnRequest}
                  </span>
                  {product.priceNote ? (
                    <span className="mt-0.5 text-body-sm text-on-surface-variant">{product.priceNote}</span>
                  ) : null}
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-marine/10 md:ml-auto px-3 py-1.5 text-label-md font-bold text-on-tertiary-fixed-variant">
                  <Icon name="check_circle" size={14} />
                  {product.stockStatus === 'OutOfStock' ? 'Out of stock' : 'Available for wholesale'}
                </span>
              </div>

              {product.shortDescription ? (
                <p className="text-body-md leading-relaxed text-on-surface-variant">{product.shortDescription}</p>
              ) : null}

              {product.benefits.length ? (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {product.benefits.slice(0, 4).map((benefit) => (
                    <li key={benefit} className="flex items-start justify-center gap-2 text-body-sm text-on-surface md:justify-start">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary">
                        <Icon name="check" size={11} strokeWidth={3} />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              ) : null}

              {product.ingredients.length ? (
                <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
                  {product.ingredients.map((tag) => (
                    <Chip key={tag} accent={product.badgeStyle === 'gold' ? 'gold' : 'teal'}>
                      {tag}
                    </Chip>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-center gap-space-sm pt-space-xs md:justify-start">
                <ButtonLink to={enquiryHref} variant="primary" size="lg" icon="mail">
                  Enquire about this product
                </ButtonLink>
                {whatsappHref ? (
                  <ButtonAnchor href={whatsappHref} target="_blank" variant="outline" size="lg" icon="whatsapp">
                    WhatsApp
                  </ButtonAnchor>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-outline-variant/40 pt-space-md sm:grid-cols-3">
                {[
                  { icon: 'verified_user', title: 'Authentic', copy: 'Official Albaik Group product' },
                  { icon: 'truck', title: 'Distribution', copy: 'Nationwide wholesale network' },
                  { icon: 'info', title: 'Verified copy', copy: 'Claims from approved documentation' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start justify-center gap-2 md:justify-start">
                    <Icon name={item.icon} size={18} className="mt-0.5 text-secondary" />
                    <div className="flex flex-col">
                      <span className="text-label-md font-bold text-on-surface">{item.title}</span>
                      <span className="text-body-sm text-on-surface-variant">{item.copy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------- tabs */}
      <Section tone="surface">
        <Container>
          <div className="mx-auto max-w-4xl text-center md:text-left">
            <div className="mb-space-lg flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-surface-container-low p-1">
              {tabs.map((item) => {
                const isActive = tab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      'relative flex items-center gap-2 rounded-full px-4 py-2.5 text-label-md font-semibold transition-colors duration-300',
                      isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
                    )}
                    aria-selected={isActive}
                    role="tab"
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="product-tab"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-surface-container-lowest shadow-sm"
                      />
                    ) : null}
                    <Icon name={item.icon} size={15} className="relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-e1">
              {/*
               * All three panels stay mounted. The inactive ones use the `hidden`
               * attribute rather than being unmounted, so the benefits, usage and safety
               * copy is present in the DOM for crawlers, assistive technology and the
               * no-JavaScript first render — the same copy the server shell emits.
               */}
              {tabs.map((item) => {
                const isActive = tab === item.key
                return (
                  <motion.div
                    key={item.key}
                    hidden={!isActive}
                    initial={{ opacity: 0, y: 12 }}
                    animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    {item.key === 'benefits' ? (
                      <div className="flex flex-col gap-space-sm">
                        <h2 className="font-display text-headline-sm font-semibold text-on-surface">
                          {item.label}
                        </h2>
                        {product.benefits.length ? (
                          <ul className="flex flex-col gap-2">
                            {product.benefits.map((benefit) => (
                              <li key={benefit} className="flex items-start justify-center gap-2.5 text-body-md text-on-surface-variant md:justify-start">
                                <Icon name="check_circle" size={17} className="mt-0.5 shrink-0 text-secondary" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-body-md text-on-surface-variant">
                            Benefit statements for this product have not been published yet.
                          </p>
                        )}
                        <p className="mt-space-sm rounded-xl border-l-[3px] border-accent-gold bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
                          Ingredient lists, percentages, certifications and performance claims are published only from
                          approved official product documentation.
                        </p>
                      </div>
                    ) : null}

                    {item.key === 'usage' ? (
                      <div className="flex flex-col gap-space-sm">
                        <h2 className="font-display text-headline-sm font-semibold text-on-surface">{item.label}</h2>
                        <p className="text-body-md leading-relaxed text-on-surface-variant">
                          {product.howToUse ??
                            'Usage instructions for this product have not been published yet.'}
                        </p>
                      </div>
                    ) : null}

                    {item.key === 'safety' ? (
                      <div className="flex flex-col gap-space-sm">
                        <h2 className="font-display text-headline-sm font-semibold text-on-surface">
                          Safety information
                        </h2>
                        <p className="text-body-md leading-relaxed text-on-surface-variant">
                          {product.safetyNote ?? 'Safety information has not been published yet.'}
                        </p>
                        {product.suitableFor ? (
                          <p className="text-body-sm text-on-surface-variant">
                            <span className="font-semibold text-on-surface">Suitable for: </span>
                            {product.suitableFor}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ related */}
      {product.related.length ? (
        <Section tone="low">
          <Container>
            <SectionHeading
              eyebrow="Complement your routine"
              title="Related formulations"
              subtitle={`More from ${product.categoryName} and ${product.brandName}.`}
              className="mb-space-lg text-center md:text-left"
            />
            <Stagger className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {product.related.map((related) => (
                <StaggerItem key={related.id}>
                  <ProductCard
                    product={related}
                    showPrice={settings.showPrices}
                    priceOnRequest={settings.priceOnRequest}
                    currency={settings.currency}
                    className="h-full"
                    centered
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      ) : null}

      <Reveal>
        <Container className="pb-space-xl">
          <div className="flex flex-wrap items-center justify-center gap-space-md rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg md:justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-display text-headline-sm font-semibold text-on-surface">
                Looking for wholesale supply?
              </span>
              <span className="text-body-sm text-on-surface-variant">
                Minimum order quantity and pricing are available on request.
              </span>
            </div>
            <div className="flex flex-wrap gap-space-sm">
              <ButtonLink to="/distribution" variant="primary" icon="store">
                Distribution information
              </ButtonLink>
              <ButtonLink to="/contact" variant="outline" icon="mail">
                Contact Albaik
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Reveal>
    </>
  )
}

/** Prev/next control overlaid on the gallery stage. */
function GalleryArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Glyph = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      className={cn(
        'absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full',
        'border border-outline-variant/40 bg-surface-container-lowest/85 text-on-surface shadow-sm backdrop-blur-md',
        'transition-all duration-300 hover:bg-surface-container-lowest hover:shadow-md',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Glyph size={19} />
    </button>
  )
}
