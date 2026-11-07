import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { api, endpoints, errorMessage } from '@/lib/api'
import { useDocumentHead, useSiteMeta } from '@/hooks/useDocumentHead'
import { contentHead, notFoundHead } from '@/lib/seo'
import { Container, PageHero } from '@/components/ui/Layout'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { StructuredPage, layoutForSlug } from '@/components/content/StructuredPage'
import type { Page } from '@/lib/types'

/**
 * Renders any published content page (About, Quality, Distribution, Safety, guides...).
 *
 * The slug comes from the route, so one component serves every static page and the
 * dashboard controls all of the copy. Presentation is chosen from the slug — see
 * `layoutForSlug` — while the *structure* of each page comes from the shape of the
 * CMS HTML, not from anything hardcoded here.
 */
export function ContentPage({ slugOverride }: { slugOverride?: string }) {
  const { pageSlug = '' } = useParams()
  const slug = slugOverride ?? pageSlug
  const location = useLocation()
  const site = useSiteMeta()
  const isGuide = !slugOverride && location.pathname.startsWith('/guides/')

  const [page, setPage] = useState<Page | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string>()

  const head = useMemo(() => {
    if (page) return contentHead(site, page, location.pathname)
    // A failed/missing page must not leave the previous route's canonical behind.
    if (status === 'error') return notFoundHead(site)
    return null
  }, [site, page, location.pathname, status])
  useDocumentHead(head)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    api
      .get<Page>(endpoints.page(slug))
      .then(({ data }) => {
        if (cancelled) return
        setPage(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorMessage(err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (status === 'loading') return <PageLoader label="Loading page" />

  if (status === 'error' || !page) {
    return (
      <Container className="py-space-xl">
        <ErrorState
          title="Page not found"
          description={error ?? `We could not find a page at "${slug}".`}
        />
      </Container>
    )
  }

  return (
    <>
      <div className="w-full border-b border-outline-variant/30 bg-surface-container-lowest">
        <Container className="py-3">
          <Breadcrumb
            items={
              isGuide
                ? [
                    { label: 'Home', to: '/' },
                    { label: 'Guides' },
                    { label: page.title },
                  ]
                : [
                    { label: 'Home', to: '/' },
                    { label: page.title },
                  ]
            }
          />
        </Container>
      </div>

      <PageHero eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle} />
      <StructuredPage page={page} mode={layoutForSlug(page.slug)} />
    </>
  )
}
