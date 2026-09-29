import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

/**
 * Lenis-powered smooth scrolling.
 *
 * Lenis drives the real document scroll (rather than a transform), so framer-motion's
 * `useScroll`, sticky positioning and IntersectionObserver reveals all keep working.
 * It is disabled automatically when the visitor prefers reduced motion.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Let the admin tables and modals opt out with data-lenis-prevent.
      prevent: (node) => node.hasAttribute?.('data-lenis-prevent') ?? false,
    })

    lenisRef.current = lenis
    let frame = 0

    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    // Expose it so route changes can jump to top through the same pipeline.
    const onNavigate = () => lenis.scrollTo(0, { immediate: true })
    window.addEventListener('albaik:scroll-top', onNavigate)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('albaik:scroll-top', onNavigate)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return null
}

/** Jump back to the top of the page through Lenis, so the easing stays consistent. */
export function scrollToTop(immediate = true) {
  window.dispatchEvent(new CustomEvent('albaik:scroll-top'))
  if (immediate) {
    // Fallback for when Lenis is disabled (reduced motion) or not yet mounted.
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}
