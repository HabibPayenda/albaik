import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchHome } from '@/store/homeSlice'
import { SectionRenderer } from '@/components/home/SectionRenderer'
import { PageLoader, ErrorState } from '@/components/ui/Feedback'
import { useDocumentHead, useSiteMeta } from '@/hooks/useDocumentHead'
import { homeHead } from '@/lib/seo'
import { useI18n } from '@/i18n'

export function HomePage() {
  const dispatch = useAppDispatch()
  const { data, status, error } = useAppSelector((state) => state.home)
  const site = useSiteMeta()
  const { t } = useI18n()

  const head = useMemo(() => homeHead(site), [site])
  useDocumentHead(head)

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
