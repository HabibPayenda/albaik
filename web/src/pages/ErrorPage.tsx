import { useEffect } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useOnline } from '@/hooks/useOnline'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { Button, ButtonLink } from '@/components/ui/Button'
import { StatusPage } from '@/components/ui/StatusPage'
import { useI18n } from '@/i18n'
import { NotFoundPage } from './NotFoundPage'

/**
 * What the router renders when a route throws — the page-level `catch`.
 *
 * React Router replaces the matched element with this, which for the public site means
 * the whole shell (header, footer) is gone, so the page is self-contained: brand mark at
 * the top, the way out in the middle, nothing that depends on the layout that just
 * failed.
 *
 * A route error is not always a server problem: a 404 response from a loader is a 404,
 * and a device with no connection produces the same throw as a genuine crash. So the
 * page distinguishes the three before it says anything: "not found", "you are offline",
 * "something went wrong". Telling a visitor their page does not exist when the wifi is
 * off is the kind of error page that makes people leave.
 */
export function ErrorPage({ variant = 'site' }: { variant?: 'site' | 'admin' }) {
  const error = useRouteError()
  const online = useOnline()
  const settings = useSiteSettings()
  const { t } = useI18n()
  const admin = variant === 'admin'

  const offline = !online
  const title = offline
    ? t('errors.offlineTitle')
    : admin
      ? t('errors.adminTitle')
      : t('errors.title')
  useDocumentTitle(`${title} — ${settings.siteName}`)

  useEffect(() => {
    if (error) console.error('[albaik] route error:', error)
  }, [error])

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  const detail =
    import.meta.env.DEV && error
      ? error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : null
      : null

  return (
    <StatusPage
      full
      icon={offline ? 'warning' : 'error'}
      eyebrow={offline ? t('errors.offlineEyebrow') : t('errors.eyebrow')}
      title={title}
      body={
        offline
          ? t('errors.offlineBody')
          : admin
            ? t('errors.adminBody')
            : t('errors.body')
      }
      contact={!admin}
      actions={
        <>
          <Button variant="gold" size="lg" icon="refresh" onClick={() => window.location.reload()}>
            {admin ? t('errors.adminReload') : t('errors.retry')}
          </Button>
          {admin ? (
            <ButtonLink to="/admin" variant="glass" size="lg" icon="dashboard">
              {t('errors.adminBack')}
            </ButtonLink>
          ) : (
            <ButtonLink to="/" variant="glass" size="lg" icon="home">
              {t('errors.backHome')}
            </ButtonLink>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-space-sm">
        {detail ? (
          <p className="mx-auto max-w-lg rounded-lg border border-white/15 bg-black/25 px-4 py-3 font-mono text-label-sm break-words text-white/60">
            {detail}
          </p>
        ) : null}
        {!admin ? (
          <p className="text-body-sm text-white/60">
            {t('errors.stillStuck')}{' '}
            <Link
              to="/contact"
              className="font-semibold text-accent-gold underline-offset-4 hover:underline"
            >
              {t('errors.contact')}
            </Link>
          </p>
        ) : null}
      </div>
    </StatusPage>
  )
}
