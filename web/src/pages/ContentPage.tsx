import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, endpoints, errorMessage } from '@/lib/api'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Container, PageHero } from '@/components/ui/Layout'
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
  const settings = useSiteSettings()

  const [page, setPage] = useState<Page | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string>()

  useDocumentTitle(
    page ? `${page.title} — ${settings.siteName}` : settings.siteName,
    page?.metaDescription,
  )

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
      <PageHero eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle} />
      <StructuredPage page={page} mode={layoutForSlug(page.slug)} />
    </>
  )
}
