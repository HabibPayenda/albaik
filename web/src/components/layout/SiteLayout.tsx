import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchBootstrap } from '@/store/siteSlice'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/motion'
import { Header } from './Header'
import { Footer } from './Footer'
import { AnnouncementTicker } from './AnnouncementTicker'
import { SearchOverlay } from './SearchOverlay'
import { SmoothScroll, scrollToTop } from './SmoothScroll'
import { Toaster } from '@/components/ui/Feedback'
import { InstallPrompt } from './InstallPrompt'

/**
 * The public marketing shell. React Router renders every visitor-facing route inside
 * this layout, so the header, ticker, footer and overlays mount exactly once.
 *
 * The announcement strip and the header are both **in normal flow** — the strip
 * scrolls away, the header sticks to the top. That is deliberate, and it is the fix
 * for a persistent hairline seam between the header and the hero.
 *
 * The previous build kept the pair `position: fixed` and reserved their height with a
 * spacer div measured by a ResizeObserver. Two problems followed: the measurement was
 * `Math.round`ed and only ever allowed to grow, so at fractional device-pixel ratios
 * (Windows display scaling at 125% / 150%) the reserved height and the painted height
 * disagreed by a sub-pixel — which the compositor renders as a one-pixel row of page
 * background between the dark header and the dark hero. And the header shrank
 * 80px → 68px on scroll, so the spacer could not simply track it.
 *
 * Sticky removes the whole class of bug: the browser positions the header itself, the
 * following content starts at its real bottom edge, and there is nothing left to
 * measure, round, or fall out of step.
 */
export function SiteLayout() {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const status = useAppSelector((state) => state.site.status)

  // Load global configuration once for the whole session.
  useEffect(() => {
    if (status === 'idle') dispatch(fetchBootstrap())
  }, [status, dispatch])

  // Every navigation starts at the top of the new page.
  useEffect(() => {
    scrollToTop()
  }, [location.pathname])

  return (
    /*
     * `overflow-x-clip` contains the decorative glow orbs and the announcement
     * marquee, which are deliberately wider than the viewport. `clip` rather than
     * `hidden` on purpose: unlike `hidden` it does not create a scroll container,
     * so `position: sticky` below keeps resolving against the viewport.
     */
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-surface">
      <SmoothScroll />

      <AnnouncementTicker />
      <Header />

      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <SearchOverlay />
      <BackToTop />
      <InstallPrompt />
      <Toaster />
    </div>
  )
}

/** Floating scroll-to-top control that appears after the first viewport. */
function BackToTop() {
  const [visible, setVisible] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.9)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: 0.24 }}
          onClick={() => scrollToTop()}
          aria-label="Back to top"
          className={cn(
            'fixed right-4 bottom-20 z-40 flex size-11 items-center justify-center rounded-full sm:right-6 sm:bottom-24',
            'bg-royal-gradient-compact text-white shadow-e2 transition-transform duration-300 hover:scale-105',
          )}
        >
          {/* Progress ring */}
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
            <motion.circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="#d4af37"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ pathLength: progress }}
            />
          </svg>
          <ArrowUp size={18} className="relative z-10" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
