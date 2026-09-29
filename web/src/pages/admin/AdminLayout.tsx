import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ExternalLink, LogOut, Menu, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchMe, logout } from '@/store/authSlice'
import { fetchBootstrap } from '@/store/siteSlice'
import { fetchIcons } from '@/store/iconsSlice'
import { pushToast } from '@/store/uiSlice'
import { AUTH_EXPIRED_EVENT } from '@/lib/api'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import { Icon } from '@/components/ui/Icon'
import { BrandMark } from '@/components/ui/BrandMark'
import { Toaster } from '@/components/ui/Feedback'
import { scrollToTop } from '@/components/layout/SmoothScroll'

interface NavGroup {
  label: string
  items: { to: string; label: string; icon: string; end?: boolean }[]
}

const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true }],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/admin/categories', label: 'Collections', icon: 'category' },
      { to: '/admin/brands', label: 'Brands', icon: 'brand' },
      { to: '/admin/products', label: 'Products', icon: 'product' },
    ],
  },
  {
    label: 'Home page',
    items: [{ to: '/admin/home', label: 'Home page', icon: 'home' }],
  },
  {
    label: 'Site content',
    items: [
      { to: '/admin/navigation', label: 'Menus & footer', icon: 'navigation' },
      { to: '/admin/pages', label: 'Pages', icon: 'page' },
    ],
  },
  {
    label: 'Inbox',
    items: [{ to: '/admin/messages', label: 'Messages', icon: 'mail' }],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/icons', label: 'Icon library', icon: 'palette' },
      { to: '/admin/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

/**
 * Protected dashboard shell. Every /admin route renders inside this layout, so the
 * session guard, sidebar and chrome are defined once.
 */
export default function AdminLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useSiteSettings()
  const { token, user, status } = useAppSelector((state) => state.auth)
  const siteStatus = useAppSelector((state) => state.site.status)
  const iconStatus = useAppSelector((state) => state.icons.status)
  const unread = useAppSelector((state) => {
    const messages = state.admin.messages.items as { isRead: boolean; kind: string }[]
    return messages.filter((m) => !m.isRead && m.kind !== 'newsletter').length
  })

  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Revalidate the stored token against the API on mount.
  useEffect(() => {
    if (token) dispatch(fetchMe())
  }, [token, dispatch])

  /*
   * Load global configuration for the admin area too.
   *
   * This used to happen only in `SiteLayout`, so under `/admin` every
   * `useSiteSettings()` value silently fell back to its default — the sidebar's site
   * name, and any screen that reads contact details, were all reading an empty map.
   * Nothing errored; the values were just wrong. Anything on this side of the app that
   * derives state from the settings map depends on this running.
   */
  useEffect(() => {
    if (siteStatus === 'idle') dispatch(fetchBootstrap())
  }, [siteStatus, dispatch])

  /*
   * Load the icon library here, not on the icon screen.
   *
   * The icon pickers inside the CRUD forms read this list to decide what to offer. If it
   * were only fetched by the management screen, an editor who switched an icon off would
   * still see it in every form until they happened to visit that screen.
   */
  useEffect(() => {
    if (iconStatus === 'idle') dispatch(fetchIcons())
  }, [iconStatus, dispatch])

  // React to a 401 raised anywhere in the app.
  useEffect(() => {
    const onExpired = () => {
      dispatch(logout())
      dispatch(pushToast({ tone: 'error', title: 'Session expired', description: 'Please sign in again.' }))
      navigate('/admin/login', { replace: true })
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [dispatch, navigate])

  useEffect(() => {
    scrollToTop()
    setSidebarOpen(false)
  }, [location.pathname])

  if (!token) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  const onLogout = () => {
    dispatch(logout())
    navigate('/admin/login', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-royal-gradient text-white">
      <div className="flex items-center justify-between gap-space-sm border-b border-white/10 px-space-md py-space-md">
        <Link
          to="/admin"
          aria-label={settings.siteName}
          className="flex items-center gap-space-sm"
        >
          <BrandMark
            tone="dark"
            variant="lockup"
            alt={settings.siteName}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-space-sm py-space-md" data-lenis-prevent>
        {NAV.map((group) => (
          <div key={group.label} className="mb-space-md">
            <p className="px-3 pb-1.5 text-label-sm font-bold uppercase tracking-widest text-white/40">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-body-sm transition-colors',
                        isActive
                          ? 'bg-white/15 font-semibold text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    <Icon name={item.icon} size={16} />
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/admin/messages' && unread > 0 ? (
                      <span className="rounded-full bg-accent-gold px-1.5 py-0.5 text-[10px] font-bold text-gradient-midnight">
                        {unread}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-space-sm">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-label-md font-bold">
            {(user?.displayName ?? user?.username ?? 'A').charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-label-md font-semibold">{user?.displayName ?? 'Administrator'}</span>
            <span className="truncate text-label-sm text-white/50">{user?.username}</span>
          </span>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-body-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink size={16} />
          View website
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-body-sm text-white/70 transition-colors hover:bg-error/20 hover:text-white"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-gradient-midnight/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.34, ease: EASE }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline-variant/40 bg-surface-container-lowest/95 px-space-md py-space-sm backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="font-display text-label-lg font-bold text-on-surface">Albaik dashboard</span>
          {unread > 0 ? (
            <span className="ml-auto rounded-full bg-accent-gold px-2 py-0.5 text-[10px] font-bold text-gradient-midnight">
              {unread} new
            </span>
          ) : null}
        </header>

        <main className="min-w-0 flex-1 px-space-md py-space-lg md:px-space-lg">
          {status === 'loading' && !user ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <span className="size-6 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      <Toaster />
    </div>
  )
}
