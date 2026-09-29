import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchHome } from '@/store/homeSlice'
import { SectionRenderer } from '@/components/home/SectionRenderer'
import { PageLoader, ErrorState } from '@/components/ui/Feedback'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useI18n } from '@/i18n'

export function HomePage() {
  const dispatch = useAppDispatch()
  const { data, status, error } = useAppSelector((state) => state.home)
  const settings = useSiteSettings()
  const { t } = useI18n()

  useDocumentTitle(`${settings.siteName} — ${settings.tagline}`)

  useEffect(() => {
    if (status === 'idle') dispatch(fetchHome())
  }, [status, dispatch])

  if (status === 'loading' || status === 'idle') {
    return <PageLoader label={t('home.preparing')} />
  }

  if (status === 'error' || !data) {
    return (
      <div className="mx-auto max-w-2xl px-margin py-space-xl">
        <ErrorState
          title={t('home.unavailable')}
          description={error ?? t('home.serverError')}
          onRetry={() => dispatch(fetchHome())}
        />
      </div>
    )
  }

  return <SectionRenderer sections={data.sections} />
}
