import { useEffect, useMemo } from 'react'
import { siteMetaFromSettings, type DocumentHead, type SiteMeta } from '@/lib/seo'
import { useSiteSettings } from '@/hooks/useSiteSettings'

/**
 * The managed tags, in one selector. Everything this module owns is removed before the
 * new route's tags are written, so a navigation can never leave two canonicals, two
 * descriptions or last page's Open Graph values behind. It also clears the static
 * defaults baked into `index.html`.
 */
const MANAGED_TAGS = [
  'meta[name="description"]',
  'meta[name="robots"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'link[rel="canonical"]',
].join(', ')

function clearManagedTags() {
  document.head.querySelectorAll(MANAGED_TAGS).forEach((tag) => tag.remove())
}

function appendMeta(attribute: 'name' | 'property', key: string, content: string) {
  const tag = document.createElement('meta')
  tag.setAttribute(attribute, key)
  tag.setAttribute('content', content)
  document.head.appendChild(tag)
}

function appendCanonical(href: string) {
  const link = document.createElement('link')
  link.setAttribute('rel', 'canonical')
  link.setAttribute('href', href)
  document.head.appendChild(link)
}

/** Write one route's head tags, replacing every managed tag currently in the document. */
export function applyDocumentHead(head: DocumentHead) {
  document.title = head.title

  clearManagedTags()

  const description = head.description?.trim()
  if (description) appendMeta('name', 'description', description)
  if (head.canonicalUrl) appendCanonical(head.canonicalUrl)
  if (head.robots) appendMeta('name', 'robots', head.robots)

  if (head.og) {
    const og = head.og
    appendMeta('property', 'og:type', og.type)
    appendMeta('property', 'og:site_name', og.siteName)
    appendMeta('property', 'og:title', og.title)
    appendMeta('property', 'og:description', og.description)
    // Private surfaces (Verification, 404) deliberately have no canonical, so no
    // og:url is emitted for them either.
    if (head.canonicalUrl) appendMeta('property', 'og:url', head.canonicalUrl)
    appendMeta('property', 'og:image', og.image)
    if (og.imageWidth) appendMeta('property', 'og:image:width', String(og.imageWidth))
    if (og.imageHeight) appendMeta('property', 'og:image:height', String(og.imageHeight))
    appendMeta('property', 'og:image:alt', og.imageAlt)

    appendMeta('name', 'twitter:card', 'summary_large_image')
    appendMeta('name', 'twitter:title', og.title)
    appendMeta('name', 'twitter:description', og.description)
    appendMeta('name', 'twitter:image', og.image)
    appendMeta('name', 'twitter:image:alt', og.imageAlt)
  }
}

/**
 * Keeps the document head in sync with the active public route. `null` means the page's
 * data has not arrived yet; the previous head is left alone until it does.
 */
export function useDocumentHead(head: DocumentHead | null | undefined) {
  useEffect(() => {
    if (head) applyDocumentHead(head)
  }, [head])
}

/** The site-owned values the head rules need, read from the bootstrap settings map. */
export function useSiteMeta(): SiteMeta {
  const settings = useSiteSettings()
  return useMemo(() => siteMetaFromSettings(settings.raw), [settings.raw])
}
