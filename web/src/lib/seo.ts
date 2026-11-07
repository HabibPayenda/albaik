import type { Brand, Category, Page, ProductDetail } from '@/lib/types'

/**
 * The client mirror of the server's SEO copy rules (`api/Seo/SeoUrl.cs` and the page
 * shells). The server shell is the source of truth for crawlers; this module builds the
 * same values from the data the page already has so a visitor's browser shows the same
 * title, description, canonical and social tags after client-side navigation.
 */

export const DESCRIPTION_MIN_LENGTH = 120
export const DESCRIPTION_MAX_LENGTH = 160

/** The truthful padding sentence used when a page's own copy is short. */
const DESCRIPTION_TAIL =
  'Explore the full Albaik catalogue for personal-care, hair-care, skin-care and oral-care products. ' +
  'Browse by collection to find products for your everyday needs.'

const PWA_IMAGE_PATH = '/pwa-512.png'
const PWA_IMAGE_SIZE = 512
const SOCIAL_FALLBACK_PATH = '/social-default.png'
const SOCIAL_FALLBACK_WIDTH = 1200
const SOCIAL_FALLBACK_HEIGHT = 630
const PRODUCT_IMAGE_WIDTH = 1080
const PRODUCT_IMAGE_HEIGHT = 1350

export interface SiteMeta {
  name: string
  tagline: string
  description: string
  address: string
  baseUrl: string
}

export interface CollectionsQuery {
  category?: string
  brand?: string
  search?: string
  page?: number
}

export interface DocumentHead {
  title: string
  description?: string | null
  canonicalUrl?: string | null
  robots?: string | null
  og?: {
    type: string
    siteName: string
    title: string
    description: string
    image: string
    imageWidth?: number | null
    imageHeight?: number | null
    imageAlt: string
  } | null
}

/** Collapse editor line breaks the way the server does before measuring copy. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Trim an over-long snippet at a word boundary, matching `SeoText.ClampDescription`. */
export function clampDescription(value?: string | null, maxLength = DESCRIPTION_MAX_LENGTH): string {
  const text = collapseWhitespace(value ?? '')
  if (text.length <= maxLength) return text

  let cut = text.lastIndexOf(' ', maxLength - 1)
  if (cut < 1) cut = maxLength - 1
  return `${text.slice(0, cut).trimEnd()}…`
}

/** Join copy fragments and pad short copy, matching `SeoText.ComposeDescription`. */
export function composeDescription(...parts: Array<string | null | undefined>): string {
  const joined = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim())
    .join(' ')

  const text = collapseWhitespace(joined)
  if (!text) return clampDescription(DESCRIPTION_TAIL)
  if (text.length < DESCRIPTION_MIN_LENGTH) return clampDescription(`${text} ${DESCRIPTION_TAIL}`)
  return clampDescription(text)
}

/** The configured public origin, or the browser's own origin. Never trailing slashed. */
export function resolveBaseUrl(configured?: string | null): string {
  const value = (configured ?? '').trim()
  if (value) return value.replace(/\/+$/, '')
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function absoluteUrl(baseUrl: string, path: string): string {
  return baseUrl + (path.startsWith('/') ? path : `/${path}`)
}

/** An uploaded or bundled image as an absolute URL, or null for an unusable value. */
export function assetUrl(baseUrl: string, value?: string | null): string | null {
  const path = (value ?? '').trim()
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return null
  return absoluteUrl(baseUrl, path)
}

export function siteMetaFromSettings(settings: Record<string, string>): SiteMeta {
  const read = (key: string) => (settings[key] ?? '').trim()

  const name = read('site.name') || 'Albaik Group of Companies'
  const tagline = read('site.tagline') || 'The Mark of Pure Perfection'
  const description = read('site.description') || tagline

  return {
    name,
    tagline,
    description,
    address: read('contact.address'),
    baseUrl: resolveBaseUrl(settings['site.publicBaseUrl']),
  }
}

function joinNaturally(values: string[]): string {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`
}

function normalizePage(page?: number): number {
  return typeof page === 'number' && Number.isInteger(page) && page > 1 ? page : 1
}

function encodeQueryValue(value: string): string {
  // `Uri.EscapeDataString` (server) escapes these where `encodeURIComponent` does not.
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function collectionsSelfPath(query: CollectionsQuery): string {
  const parts: string[] = []
  const add = (key: string, value: string | undefined) => {
    if (value) parts.push(`${encodeQueryValue(key)}=${encodeQueryValue(value)}`)
  }

  add('category', query.category)
  add('brand', query.brand)
  add('search', query.search)
  if (normalizePage(query.page) > 1) add('page', String(normalizePage(query.page)))

  return parts.length ? `/collections?${parts.join('&')}` : '/collections'
}

function normalizeCanonicalPath(pathname: string): string {
  let path = (pathname || '/').split('?')[0].toLowerCase()
  if (!path.startsWith('/')) path = `/${path}`
  if (path.length > 1) path = path.replace(/\/+$/, '')
  return path || '/'
}

function siteImage(site: SiteMeta) {
  return {
    image: absoluteUrl(site.baseUrl, PWA_IMAGE_PATH),
    imageWidth: PWA_IMAGE_SIZE,
    imageHeight: PWA_IMAGE_SIZE,
    imageAlt: site.name,
  }
}

function head(
  site: SiteMeta,
  title: string,
  description: string,
  canonicalPath: string | null,
  type: string,
  image: { image: string; imageWidth: number; imageHeight: number; imageAlt: string },
  robots: string | null = null,
): DocumentHead {
  return {
    title,
    description,
    canonicalUrl: canonicalPath === null ? null : absoluteUrl(site.baseUrl, canonicalPath),
    robots,
    og: {
      type,
      siteName: site.name,
      title,
      description,
      ...image,
    },
  }
}

export function homeHead(site: SiteMeta): DocumentHead {
  const description = clampDescription(site.description) || site.tagline
  return head(site, `${site.name} — ${site.tagline}`, description, '/', 'website', siteImage(site))
}

export function collectionsHead(
  site: SiteMeta,
  categories: Category[],
  query: CollectionsQuery,
): DocumentHead {
  const categorySlug = (query.category ?? '').trim()
  const brandSlug = (query.brand ?? '').trim()
  const search = (query.search ?? '').trim()
  const page = normalizePage(query.page)

  const activeCategory = categorySlug
    ? categories.find((category) => category.slug.toLowerCase() === categorySlug.toLowerCase())
    : undefined
  const categoryUnknown = categorySlug.length > 0 && !activeCategory
  const pureCategorySelection = Boolean(activeCategory) && !search && !brandSlug && page <= 1

  const canonicalPath = pureCategorySelection
    ? `/collections/${activeCategory!.slug}`
    : collectionsSelfPath({ category: categorySlug, brand: brandSlug, search, page })

  const robots =
    pureCategorySelection || (!search && !brandSlug && !categoryUnknown) ? null : 'noindex, follow'

  const description =
    categories.length === 0
      ? composeDescription(site.description)
      : composeDescription(
          `Explore Albaik's product collections: ${joinNaturally(categories.map((entry) => entry.name))}.`,
          'Browse personal-care and everyday products from Albaik.',
        )

  return head(
    site,
    'Collections — Albaik',
    description,
    canonicalPath,
    'website',
    siteImage(site),
    robots,
  )
}

export function collectionHead(site: SiteMeta, category: Category): DocumentHead {
  const description = composeDescription(
    category.description?.trim() ? category.description : category.tagline,
  )
  return head(
    site,
    `${category.name} — Albaik`,
    description,
    `/collections/${category.slug}`,
    'website',
    { ...siteImage(site), imageAlt: category.name },
  )
}

export function brandHead(site: SiteMeta, brand: Brand): DocumentHead {
  const categoryName = brand.categoryName ?? ''
  const categorySlug = brand.categorySlug ?? ''
  const namePart = categoryName ? `${brand.name} ${categoryName}` : brand.name

  const description = composeDescription(
    `${brand.name} — ${categoryName}.`,
    brand.description ?? brand.tagline,
    `Explore ${brand.name} products in the ${categoryName} collection from Albaik.`,
  )

  const image = assetUrl(site.baseUrl, brand.imageUrl) ?? assetUrl(site.baseUrl, brand.logoUrl)
  const socialImage = image ?? absoluteUrl(site.baseUrl, SOCIAL_FALLBACK_PATH)

  return head(
    site,
    `${namePart} — Albaik`,
    description,
    `/collections/${categorySlug}/${brand.slug}`,
    'website',
    {
      image: socialImage,
      imageWidth: SOCIAL_FALLBACK_WIDTH,
      imageHeight: SOCIAL_FALLBACK_HEIGHT,
      imageAlt: brand.name,
    },
  )
}

export function productHead(site: SiteMeta, product: ProductDetail): DocumentHead {
  const description = product.metaDescription?.trim()
    ? composeDescription(product.metaDescription)
    : composeDescription(product.shortDescription, product.description)

  const primaryImage = [...(product.images ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => image.url)
    .find((url) => Boolean(url && url.trim())) ?? product.imageUrl

  const productImage = assetUrl(site.baseUrl, primaryImage)
  const usingFallback = productImage === null
  const socialImage = productImage ?? absoluteUrl(site.baseUrl, SOCIAL_FALLBACK_PATH)

  return head(
    site,
    `${product.name} — Albaik`,
    description,
    `/products/${product.slug}`,
    'product',
    {
      image: socialImage,
      imageWidth: usingFallback ? SOCIAL_FALLBACK_WIDTH : PRODUCT_IMAGE_WIDTH,
      imageHeight: usingFallback ? SOCIAL_FALLBACK_HEIGHT : PRODUCT_IMAGE_HEIGHT,
      imageAlt: product.name,
    },
  )
}

export function contentHead(site: SiteMeta, page: Page, pathname: string): DocumentHead {
  const description = composeDescription(
    page.metaDescription?.trim() ? page.metaDescription : page.subtitle,
  )
  return head(
    site,
    `${page.title} — Albaik`,
    description,
    normalizeCanonicalPath(pathname),
    'article',
    { ...siteImage(site), imageAlt: page.title },
  )
}

export function contactHead(site: SiteMeta): DocumentHead {
  const description = composeDescription(
    'Contact Albaik Group of Companies for product inquiries, wholesale orders, ' +
      'distribution opportunities and business cooperation.',
    site.address,
  )
  return head(site, 'Contact — Albaik', description, '/contact', 'website', siteImage(site))
}

export function verifyHead(site: SiteMeta): DocumentHead {
  const description = composeDescription(
    'Scan the QR code printed on Albaik packaging to confirm that a product is ' +
      'part of the published Albaik catalogue.',
  )
  return head(
    site,
    'Product verification — Albaik',
    description,
    null,
    'website',
    siteImage(site),
    'noindex, nofollow',
  )
}

export function notFoundHead(site: SiteMeta): DocumentHead {
  const description = composeDescription(
    'The page you requested could not be found. Browse the Albaik collections, ' +
      'read about the company, or contact the team for product and wholesale enquiries.',
  )
  return head(
    site,
    'Page not found — Albaik',
    description,
    null,
    'website',
    siteImage(site),
    'noindex, nofollow',
  )
}
