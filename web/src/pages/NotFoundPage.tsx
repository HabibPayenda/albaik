import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch } from '@/store/hooks'
import { toggleSearch } from '@/store/uiSlice'
import { useDocumentHead, useSiteMeta } from '@/hooks/useDocumentHead'
import { notFoundHead } from '@/lib/seo'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { StatusPage } from '@/components/ui/StatusPage'
import { useI18n } from '@/i18n'

/**
 * The places a visitor who mistyped a URL is most likely to want. A 404 that only offers
 * "go home" makes them start again from the top; these are the three or four doors the
 * site actually has.
 */
const QUICK_LINKS = [
  { to: '/collections', key: 'nav.collections' },
  { to: '/about', key: 'nav.about' },
  { to: '/quality', key: 'nav.quality' },
  { to: '/contact', key: 'nav.contact' },
]

export function NotFoundPage() {
  const site = useSiteMeta()
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const head = useMemo(() => notFoundHead(site), [site])
  useDocumentHead(head)

  return (
    <StatusPage
      mark="404"
      title={t('notFound.title')}
      body={t('notFound.body')}
      actions={
        <>
          <ButtonLink to="/" variant="gold" size="lg" icon="home">
            {t('notFound.back')}
          </ButtonLink>
          <ButtonLink to="/collections" variant="glass" size="lg" iconRight="arrow_forward">
            {t('notFound.browseCollections')}
          </ButtonLink>
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        <button
          type="button"
          onClick={() => dispatch(toggleSearch(true))}
          className="group flex w-full items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left text-body-sm text-white/75 transition-colors hover:border-white/35 hover:bg-white/15 hover:text-white"
        >
          <Icon name="search" size={18} className="shrink-0 text-accent-gold" />
          <span className="flex-1">{t('notFound.searchHint')}</span>
          <Icon name="arrow_forward" size={16} className="shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div>
          <p className="text-label-sm font-bold uppercase tracking-[0.2em] text-white/45">
            {t('notFound.quickLinks')}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-label-md text-white/85 transition-colors hover:border-accent-gold/60 hover:bg-white/15 hover:text-white"
              >
                {t(link.key)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </StatusPage>
  )
}
