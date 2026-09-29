import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { api, endpoints } from '@/lib/api'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleSearch } from '@/store/uiSlice'
import { useI18n } from '@/i18n'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { cn, debounce } from '@/lib/utils'
import { resolveSuggestions, SEARCH_SUGGESTIONS_KEY } from '@/lib/searchSuggestions'
import type { Paginated, ProductCard as ProductCardModel } from '@/lib/types'
import { Icon } from '@/components/ui/Icon'
import { EASE } from '@/lib/motion'

export function SearchOverlay() {
  const open = useAppSelector((state) => state.ui.searchOpen)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()
  const settings = useSiteSettings()

  const suggestions = useMemo(
    () => resolveSuggestions(settings.raw[SEARCH_SUGGESTIONS_KEY]),
    [settings.raw],
  )

  const [term, setTerm] = useState('')
  const [results, setResults] = useState<ProductCardModel[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(timer)
    }
    setTerm('')
    setResults([])
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dispatch(toggleSearch(false))
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, dispatch])

  const runSearch = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!value.trim()) {
          setResults([])
          setLoading(false)
          return
        }
        try {
          const { data } = await api.get<Paginated<ProductCardModel>>(endpoints.products, {
            params: { search: value.trim(), pageSize: 6 },
          })
          setResults(data.items)
        } catch {
          setResults([])
        } finally {
          setLoading(false)
        }
      }, 280),
    [],
  )

  const onInput = (value: string) => {
    setTerm(value)
    setLoading(true)
    runSearch(value)
  }

  const go = (slug: string) => {
    dispatch(toggleSearch(false))
    navigate(`/products/${slug}`)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!term.trim()) return
    dispatch(toggleSearch(false))
    navigate(`/collections?search=${encodeURIComponent(term.trim())}`)
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dispatch(toggleSearch(false))}
            className="absolute inset-0 bg-gradient-midnight/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label={t('header.searchProducts')}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-clinical-white shadow-e3"
          >
            <form onSubmit={submit} className="flex items-center gap-3 border-b border-outline-variant/40 px-space-md py-space-sm">
              <Search size={20} className="text-on-surface-variant" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => onInput(e.target.value)}
                placeholder={t('search.placeholder')}
                className="flex-1 bg-transparent py-2 text-body-lg text-on-surface outline-none placeholder:text-on-surface-variant/60"
              />
              <button
                type="button"
                onClick={() => dispatch(toggleSearch(false))}
                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </form>

            <div className="max-h-[52vh] overflow-y-auto" data-lenis-prevent>
              {!term.trim() ? (
                suggestions.length ? (
                  <div className="flex flex-col gap-space-sm p-space-md">
                    <span className="text-label-md uppercase tracking-widest text-on-surface-variant">
                      {t('search.popularNeeds')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => onInput(suggestion.query)}
                          className="rounded-full bg-surface-container-low px-3 py-1.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-water-foam hover:text-primary-container"
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              ) : loading ? (
                <div className="flex flex-col gap-2 p-space-md">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="skeleton size-12 rounded-lg" />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="skeleton h-3 w-1/3" />
                        <div className="skeleton h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length ? (
                <ul className="flex flex-col p-2">
                  {results.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => go(product.slug)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-container-low',
                        )}
                      >
                        {/* Same accent gradient as the product plate, and the same problem:
                            `accentFrom`/`accentTo` are free-text hex fields, so the gold
                            icon cannot rely on the backdrop being dark. On a gold accent
                            (the seeded #8a6d1f -> #d4af37) `accent-gold-light` on it is
                            1.70:1 — the glyph simply disappears. The scrim fixes it for any
                            accent an admin can type, and matches ProductImage's plate so the
                            two read as the same artwork. */}
                        <span
                          className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white"
                          style={{
                            backgroundImage: `linear-gradient(140deg, ${product.accentFrom ?? '#050d24'}, ${product.accentTo ?? '#0e3b9c'})`,
                          }}
                        >
                          <span
                            className="absolute inset-0 bg-gradient-midnight/65"
                            aria-hidden="true"
                          />
                          <Icon name="spa" size={18} className="relative text-accent-gold-light" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body-sm font-semibold text-on-surface">{product.name}</span>
                          <span className="truncate text-label-md uppercase tracking-wider text-on-surface-variant">
                            {product.categoryName} · {product.brandName}
                          </span>
                        </span>
                        <Icon name="arrow_forward" size={15} className="text-on-surface-variant" />
                      </button>
                    </li>
                  ))}
                  <li className="p-2">
                    <button
                      type="button"
                      onClick={submit}
                      className="w-full rounded-xl bg-surface-container-low py-2.5 text-label-md font-semibold text-primary-container transition-colors hover:bg-water-foam"
                    >
                      {t('search.seeAll', { q: term })}
                    </button>
                  </li>
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-2 p-space-xl text-center">
                  <Icon name="search" size={26} className="text-on-surface-variant" />
                  <p className="text-body-sm text-on-surface-variant">
                    {t('search.noProductsMatch', { q: term })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
