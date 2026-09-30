import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { Link, NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Menu, Search, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleMobileNav, toggleSearch } from '@/store/uiSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { cn, opensInNewTab } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'
import { BrandMark } from '@/components/ui/BrandMark'
import { LocaleSwitcher } from './LocaleSwitcher'
import { EASE } from '@/lib/motion'
import type { Brand } from '@/lib/types'

/**
 * The bundled fallback quick links, shown in the mega menu's footer strip while none
 * are configured in the dashboard — so a half-built menu never looks broken. Once staff
 * enable any quick link on the Menus & footer screen, the stored set wins.
 */
const DEFAULT_QUICK_LINKS = [
  { id: -1, label: 'All products', path: '/collections', openInNewTab: false },
  { id: -2, label: 'Shampoo guide', path: '/guides/shampoo-guide', openInNewTab: false },
  { id: -3, label: 'Quality & Verification', path: '/quality', openInNewTab: false },
  { id: -4, label: 'Distribution & Wholesale', path: '/distribution', openInNewTab: false },
]

/**
 * Brands arrive from `/api/bootstrap` as a **flat, sibling array** — `categories` has no
 * nested `brands` field. The panel used to read `category.brands`, which is always
 * `undefined`, so no brand link has ever rendered in the mega menu and every brand page
 * was unreachable except by typing the URL. Group them here instead.
 */
function useBrandsByCategory(): Map<string, Brand[]> {
  const brands = useAppSelector((state) => state.site.brands)
  return useMemo(() => {
    const map = new Map<string, Brand[]>()
    for (const brand of brands) {
      // `categorySlug` is optional on the DTO; a brand without one has no column to sit in.
      if (!brand.categorySlug) continue
      const list = map.get(brand.categorySlug)
      if (list) list.push(brand)
      else map.set(brand.categorySlug, [brand])
    }
    return map
  }, [brands])
}

/**
 * The primary header.
 *
 * Three deliberate changes from the previous revision:
 *
 * 1. **Sticky, not fixed.** The layout no longer reserves its height with a measured
 *    spacer, which is what produced a one-pixel seam between the header and the hero
 *    at fractional device-pixel ratios. See `SiteLayout` for the full explanation.
 *
 * 2. **A constant height.** It used to shrink 80px → 68px on scroll. With an in-flow
 *    sticky header that would shove the page up 12px mid-scroll, so the scrolled state
 *    is now expressed purely visually — deeper shadow, denser gradient — and never
 *    moves anything.
 *
 * 3. **Fewer controls.** The bar previously carried seven nav items plus a language
 *    switcher, search, a shopping-bag icon (there is no cart), a "Find Retailer"
 *    button and an admin link. The bag and the admin link are gone. The language
 *    switcher is back (see `LocaleSwitcher`) but now drives the i18n provider and
 *    falls back to English for any untranslated string, so it never silently leaves
 *    the page half-translated.
 *
 * The Collections panel is reachable three ways: pointer hover, click-through to the
 * collection index, and the keyboard (`focus` opens it, `ArrowDown` steps into it,
 * `Escape` closes and returns focus to the trigger). It used to be hover-only, which
 * made the entire catalogue unreachable without a mouse.
 *
 * Nav labels come from the CMS. The set is trimmed in the seeder, not here.
 */
export function Header() {
  const settings = useSiteSettings()
  const nav = useAppSelector((state) => state.site.nav)
  const quickLinks = useAppSelector((state) => state.site.quickLinks)
  const quickLinksConfigured = useAppSelector((state) => state.site.quickLinksConfigured)
  const categories = useAppSelector((state) => state.site.categories)
  const mobileOpen = useAppSelector((state) => state.ui.mobileNavOpen)
  const brandsByCategory = useBrandsByCategory()
  const dispatch = useAppDispatch()
  const location = useLocation()

  const [scrolled, setScrolled] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Wrapper around the Collections nav link — used to hand focus back on Escape. */
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  /** Set while we are programmatically refocusing, so `onFocus` does not reopen. */
  const suppressFocusOpen = useRef(false)
  /** ArrowDown asked for the panel: move focus into it once it has mounted. */
  const focusPanelOnOpen = useRef(false)

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 34, restDelta: 0.001 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Any route change closes every open surface.
  useEffect(() => {
    setMegaOpen(false)
    dispatch(toggleMobileNav(false))
  }, [location.pathname, dispatch])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const openMega = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMegaOpen(true)
  }, [])

  const scheduleCloseMega = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMegaOpen(false), 160)
  }, [])

  /** Close, and optionally put focus back on the Collections trigger. */
  const closeMega = useCallback((restoreFocus = false) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMegaOpen(false)
    if (!restoreFocus) return
    suppressFocusOpen.current = true
    triggerRef.current?.querySelector<HTMLElement>('a')?.focus()
    // Release after the focus event has been dispatched.
    window.setTimeout(() => {
      suppressFocusOpen.current = false
    }, 0)
  }, [])

  // Escape closes the panel from anywhere inside it.
  useEffect(() => {
    if (!megaOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMega(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [megaOpen, closeMega])

  // ArrowDown from the trigger: land on the first link inside the panel.
  useEffect(() => {
    if (!megaOpen || !focusPanelOnOpen.current) return
    focusPanelOnOpen.current = false
    panelRef.current?.querySelector<HTMLElement>('a[href], button')?.focus()
  }, [megaOpen])

  const handleTriggerFocus = () => {
    if (suppressFocusOpen.current) return
    openMega()
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b transition-shadow duration-300',
          'bg-gradient-to-r from-[#050d24]/98 via-[#0e3b9c]/97 to-[#050d24]/98 backdrop-blur-xl',
          scrolled
            ? 'border-white/15 shadow-[0_6px_34px_rgba(5,13,36,0.5)]'
            : 'border-white/10 shadow-none',
        )}
        // Focus moving outside the whole header dismisses the panel.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMega()
        }}
      >
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between gap-space-md px-margin-mobile md:px-margin">
          {/* ------------------------------------------------------------ brand */}
          <Link
            to="/"
            className="group flex shrink-0 items-center"
            aria-label={`${settings.siteName} — home`}
          >
            <BrandMark
              tone="dark"
              className="h-10 w-auto transition-transform duration-300 group-hover:scale-[1.03] md:h-11"
            />
          </Link>

          {/* ------------------------------------------------------------- nav */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary">
            {nav.map((link) => {
              const isCollections = link.path === '/collections'
              return (
                <div
                  key={link.id}
                  ref={isCollections ? triggerRef : undefined}
                  className="relative"
                  onMouseEnter={isCollections ? openMega : undefined}
                  onMouseLeave={isCollections ? scheduleCloseMega : undefined}
                  onFocus={isCollections ? handleTriggerFocus : undefined}
                  // Tab away from the trigger *and* out of the panel and the panel goes
                  // with it — otherwise it lingers open while focus sits on "About".
                  onBlur={
                    isCollections
                      ? (event) => {
                          const next = event.relatedTarget as Node | null
                          if (next && panelRef.current?.contains(next)) return
                          closeMega()
                        }
                      : undefined
                  }
                >
                  {opensInNewTab(link.openInNewTab, link.path) ? (
                    /* The flag only applies to an address that can leave the site; the
                       desktop item gets the same quiet treatment as its neighbours, with
                       the outward arrow instead of the collection chevron. */
                    <a
                      href={link.path}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group/nav relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-label-lg text-white/75 transition-colors hover:text-white"
                    >
                      {link.label}
                      <Icon name="north_east" size={13} className="shrink-0 opacity-70" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <RouterNavLink
                      to={link.path}
                      aria-haspopup={isCollections ? 'true' : undefined}
                      aria-expanded={isCollections ? megaOpen : undefined}
                      aria-controls={isCollections ? 'collections-mega' : undefined}
                      onKeyDown={
                        isCollections
                          ? (event) => {
                              if (event.key === 'ArrowDown') {
                                event.preventDefault()
                                focusPanelOnOpen.current = true
                                openMega()
                              }
                            }
                          : undefined
                      }
                      className={({ isActive }) =>
                        cn(
                          'group/nav relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-label-lg transition-colors',
                          isActive ? 'text-white' : 'text-white/75 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {link.label}
                          {isCollections ? (
                            <ChevronDown
                              size={14}
                              className={cn(
                                'transition-transform duration-300',
                                megaOpen && 'rotate-180',
                              )}
                            />
                          ) : null}
                          {/* Gold underline indicator instead of a filled pill — quieter,
                              and it does not resize the bar when the active item changes. */}
                          {isActive ? (
                            <motion.span
                              layoutId="nav-underline"
                              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                              className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent-gold"
                            />
                          ) : null}
                        </>
                      )}
                    </RouterNavLink>
                  )}
                </div>
              )
            })}
          </nav>

          {/* ----------------------------------------------------------- right */}
          <div className="flex shrink-0 items-center gap-1.5">
            <LocaleSwitcher variant="inline" />

            <button
              type="button"
              onClick={() => dispatch(toggleSearch(true))}
              className="rounded-lg p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Search products"
            >
              <Search size={19} />
            </button>

            <Link
              to="/distribution"
              className="hidden items-center gap-2 rounded-lg bg-gold-gradient px-4 py-2.5 text-label-md font-bold text-gradient-midnight shadow-lg transition-all duration-300 hover:brightness-105 hover:shadow-[0_0_22px_rgba(212,175,55,0.45)] lg:inline-flex"
            >
              <Icon name="store" size={16} />
              Distribution
            </Link>

            <button
              type="button"
              onClick={() => dispatch(toggleMobileNav())}
              className="rounded-lg p-2.5 text-white transition-colors hover:bg-white/10 xl:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Reading-progress hairline */}
        <motion.div
          style={{ scaleX: progress }}
          className="h-px origin-left bg-gradient-to-r from-[#d4af37] via-[#f6e7b2] to-[#8ef2fc]"
        />

        {/* ------------------------------------------------------ mega menu */}
        <AnimatePresence>
          {megaOpen ? (
            <motion.div
              id="collections-mega"
              ref={panelRef}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: EASE }}
              onMouseEnter={openMega}
              onMouseLeave={scheduleCloseMega}
              // Opaque, not translucent: at 97% the hero's heading ghosted through the
              // panel and read as a rendering fault.
              className="absolute inset-x-0 top-full hidden bg-gradient-midnight shadow-[0_28px_60px_rgba(5,13,36,0.6)] xl:block"
            >
              {/* A gold hairline marks where the panel begins. */}
              <span
                className="block h-px w-full bg-gradient-to-r from-transparent via-accent-gold/50 to-transparent"
                aria-hidden="true"
              />

              <div className="mx-auto max-w-[1360px] px-margin py-space-lg">
                {/* -------------------------------------------------- top rail */}
                <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm border-b border-white/10 pb-space-sm">
                  <span className="eyebrow text-accent-gold">The Albaik Portfolio</span>
                  <Link
                    to="/collections"
                    className="inline-flex items-center gap-1.5 text-label-md font-semibold text-white/75 transition-colors hover:text-white"
                  >
                    View all products
                    <Icon name="arrow_forward" size={14} />
                  </Link>
                </div>

                {/* ------------------------------------------- category columns */}
                <div className="grid grid-cols-2 gap-gutter lg:grid-cols-4">
                  {categories.map((category) => {
                    const brands = brandsByCategory.get(category.slug) ?? []
                    return (
                      <div
                        key={category.id}
                        className="group/cat flex flex-col gap-space-sm rounded-2xl border border-white/10 bg-white/[0.04] p-space-md transition-colors duration-300 hover:border-accent-gold/40 hover:bg-white/[0.07]"
                      >
                        <Link
                          to={`/collections/${category.slug}`}
                          className="flex items-start gap-space-sm"
                        >
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-gold transition-colors duration-300 group-hover/cat:bg-accent-gold/20">
                            <Icon name={category.icon} size={20} />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="font-display text-headline-sm font-semibold text-white transition-colors duration-300 group-hover/cat:text-accent-gold">
                              {category.name}
                            </span>
                            {category.tagline ? (
                              <span className="text-label-md leading-snug text-white/60">
                                {category.tagline}
                              </span>
                            ) : null}
                          </span>
                        </Link>

                        <ul className="flex flex-col gap-1">
                          {brands.map((brand) => (
                            <li key={brand.id}>
                              <Link
                                to={`/collections/${category.slug}/${brand.slug}`}
                                className="flex items-center justify-between gap-space-sm rounded-lg px-2.5 py-1.5 text-body-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                              >
                                <span className="truncate">{brand.name}</span>
                                <span className="shrink-0 text-label-sm tabular-nums text-white/70">
                                  {brand.productCount}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>

                        <Link
                          to={`/collections/${category.slug}`}
                          className="mt-auto inline-flex items-center gap-1.5 px-2.5 pt-space-xs text-label-md font-semibold text-accent-gold transition-colors hover:text-accent-gold-light"
                        >
                          View all {category.name}
                          <Icon name="arrow_forward" size={13} />
                        </Link>
                      </div>
                    )
                  })}
                </div>

                {/* ----------------------------------------------- footer strip */}
                <div className="mt-space-md flex flex-wrap items-center gap-x-space-md gap-y-space-sm border-t border-white/10 pt-space-md">
                  <span className="text-label-sm font-bold uppercase tracking-widest text-white/70">
                    Quick links
                  </span>
                  {(quickLinksConfigured ? quickLinks : DEFAULT_QUICK_LINKS).map((link) =>
                    // The rule lives in `opensInNewTab`: only absolute addresses can open
                    // in a new tab, an internal route keeps the SPA's navigation.
                    opensInNewTab(link.openInNewTab, link.path) ? (
                      <a
                        key={link.id}
                        href={link.path}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-label-md font-semibold text-white/75 transition-colors hover:text-accent-gold"
                      >
                        {link.label}
                        <Icon name="north_east" size={13} />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link
                        key={link.id}
                        to={link.path}
                        className="inline-flex items-center gap-1.5 text-label-md font-semibold text-white/75 transition-colors hover:text-accent-gold"
                      >
                        {link.label}
                        <Icon name="north_east" size={13} />
                      </Link>
                    ),
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <MobileNav open={mobileOpen} onClose={() => dispatch(toggleMobileNav(false))} />
    </>
  )
}

/* ------------------------------------------------------------------ mobile */

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useAppSelector((state) => state.site.nav)
  const categories = useAppSelector((state) => state.site.categories)
  const brandsByCategory = useBrandsByCategory()
  const settings = useSiteSettings()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-gradient-midnight/60 backdrop-blur-sm xl:hidden"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.36, ease: EASE }}
            className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col bg-royal-gradient text-white shadow-e3 xl:hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-space-md py-space-md">
              <BrandMark tone="dark" className="h-9 w-auto" />
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-space-md py-space-md" data-lenis-prevent>
              <ul className="flex flex-col gap-1">
                {nav.map((link) => (
                  <li key={link.id}>
                    {opensInNewTab(link.openInNewTab, link.path) ? (
                      /* The drawer still closes — leaving the site should not strand the
                         menu open behind the new tab — and the outward arrow replaces the
                         chevron, which promised another level inside this one. */
                      <a
                        href={link.path}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={onClose}
                        className="flex items-center justify-between rounded-xl px-space-md py-3 text-body-md text-white/80 transition-colors hover:bg-white/10"
                      >
                        {link.label}
                        <Icon name="north_east" size={16} className="opacity-50" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <RouterNavLink
                        to={link.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center justify-between rounded-xl px-space-md py-3 text-body-md transition-colors',
                            isActive
                              ? 'bg-white/15 font-semibold text-white'
                              : 'text-white/80 hover:bg-white/10',
                          )
                        }
                      >
                        {link.label}
                        <Icon name="chevron_right" size={16} className="opacity-50" />
                      </RouterNavLink>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-space-lg flex flex-col gap-space-sm">
                <p className="text-label-md uppercase tracking-widest text-accent-gold">
                  Collections
                </p>
                {categories.map((category) => {
                  const isOpen = expanded === category.slug
                  const brands = brandsByCategory.get(category.slug) ?? []
                  return (
                    <div
                      key={category.id}
                      className={cn(
                        'overflow-hidden rounded-xl border transition-colors',
                        isOpen
                          ? 'border-accent-gold/30 bg-white/[0.07]'
                          : 'border-white/10 bg-white/5',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : category.slug)}
                        className="flex w-full items-center justify-between px-space-md py-3 text-left text-body-sm font-semibold text-white"
                        aria-expanded={isOpen}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent-gold">
                            <Icon name={category.icon} size={16} />
                          </span>
                          {category.name}
                        </span>
                        <ChevronDown
                          size={15}
                          className={cn(
                            'shrink-0 text-white/60 transition-transform duration-300',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <li>
                              <Link
                                to={`/collections/${category.slug}`}
                                onClick={onClose}
                                className="block px-space-md py-2 pl-[4.25rem] text-body-sm font-semibold text-accent-gold hover:text-accent-gold-light"
                              >
                                All {category.name}
                              </Link>
                            </li>
                            {brands.map((brand) => (
                              <li key={brand.id}>
                                <Link
                                  to={`/collections/${category.slug}/${brand.slug}`}
                                  onClick={onClose}
                                  className="flex items-center justify-between px-space-md py-2 pl-[4.25rem] text-body-sm text-white/70 hover:text-white"
                                >
                                  {brand.name}
                                  <span className="text-label-sm text-white/70">
                                    {brand.productCount}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </motion.ul>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </nav>

            <div className="flex flex-col gap-space-sm border-t border-white/10 p-space-md">
              <LocaleSwitcher variant="block" />

              <button
                type="button"
                onClick={() => {
                  onClose()
                  dispatch(toggleSearch(true))
                }}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-space-md py-3 text-label-md font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Search size={16} />
                Search products
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/contact')
                }}
                className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-space-md py-3 text-label-md font-bold text-gradient-midnight"
              >
                <Icon name="mail" size={16} />
                Contact Albaik
              </button>
              {settings.whatsapp ? (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/20 px-space-md py-3 text-label-md font-semibold text-white"
                >
                  <Icon name="whatsapp" size={16} />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
