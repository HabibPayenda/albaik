import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'
import { ButtonLink } from '@/components/ui/Button'
import { GlassTag } from '@/components/ui/Badge'
import { BrandMark } from '@/components/ui/BrandMark'
import type { HomeSection } from '@/lib/types'

/**
 * Which way the crop is biased, named for where the subject sits *relative to the
 * text* rather than for a physical edge. `away-from-text` keeps the subject on the
 * side the copy does not cover, which is what a hero backdrop almost always wants.
 */
export type FocalPoint = 'away-from-text' | 'centre' | 'toward-text'

export interface HeroSlide {
  /** Full-bleed backdrop behind this slide's text. Empty falls back, then to the gradient. */
  backdrop?: string
  focalPoint?: FocalPoint
  badge?: string
  badgeSubtitle?: string
  title?: string
  accentWord?: string
  body?: string
  primaryCtaLabel?: string
  primaryCtaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
}

export interface HeroSectionData {
  accentWord?: string
  /** Backdrop inherited by any slide that has none of its own. */
  defaultBackdrop?: string
  badgeTitle?: string
  badgeSubtitle?: string
}

/**
 * `object-position` for the picture, mirrored for RTL.
 *
 * These are the `object-*` utilities, not the `bg-*` ones. The picture is a real `<img>`
 * painted with `object-contain`, and `bg-right` styles a background-position, so the
 * `bg-*` classes silently did nothing here. `object-right` means `right center`: the
 * vertical half is fixed, which is what a contained, always-full-width picture needs.
 *
 * Under `contain` the horizontal value is usually a no-op, because the picture is far
 * wider than the hero is tall and is therefore constrained by the width — it spans edge
 * to edge and there is no horizontal slack to bias. It earns its keep in the opposite
 * regime, a very wide and short viewport, where the picture is constrained by height and
 * the bars appear on the left and right instead. The scrim is flipped by the same rule,
 * so the dark side and the bias always agree. See
 * docs/adr/0003-hero-composition-mirrors-with-text.md.
 */
const FOCAL_POSITION: Record<FocalPoint, string> = {
  'away-from-text': 'object-right rtl:object-left',
  centre: 'object-center',
  'toward-text': 'object-left rtl:object-right',
}

const FOCAL_POINTS: FocalPoint[] = ['away-from-text', 'centre', 'toward-text']

const ACCENT_TEXT: Record<string, string> = {
  gold: 'text-accent-gold-light',
  teal: 'text-tertiary-fixed',
  primary: 'text-white',
  secondary: 'text-white',
}

/** A single slide assembled from the legacy hero fields — used when no carousel is set. */
function fallbackSlide(section: HomeSection | undefined, data: HeroSectionData, settings: ReturnType<typeof useSiteSettings>): HeroSlide {
  return {
    backdrop: data.defaultBackdrop || '',
    focalPoint: 'away-from-text',
    badge: data.badgeTitle ?? 'Established Standard',
    badgeSubtitle: data.badgeSubtitle ?? 'Approved product documentation',
    title: section?.title ?? 'The Mark of',
    accentWord: data.accentWord ?? 'Pure Perfection.',
    body: section?.body ?? settings.description,
    primaryCtaLabel: section?.primaryCtaLabel ?? 'Explore the Collections',
    primaryCtaHref: section?.primaryCtaHref ?? '/collections',
    secondaryCtaLabel: section?.secondaryCtaLabel ?? 'Our Product Approach',
    secondaryCtaHref: section?.secondaryCtaHref ?? '/about',
  }
}

/**
 * The editorial hero: a full-bleed backdrop, ambient light orbs and serif display
 * type, with all of the copy in a single column.
 *
 * The hero is a carousel. `SlidesJson` on the hero section holds an array of slides
 * (backdrop, focal point, badge, headline = title + accent word, body, both CTAs); an
 * editor builds and reorders them from the dashboard, so the copy above the fold is
 * fully changeable. With one slide (or none set) it degrades to the original single
 * hero. A slide's backdrop falls back to the section's default, then to the royal
 * gradient, so a half-built carousel still looks finished.
 *
 * There is exactly one image in the hero and it is behind the text. The glassmorphic
 * product plinth that used to sit to the right is gone; the slide badge and the
 * featured-product strip it held moved into the copy column rather than being deleted,
 * so a field an editor fills is never a field the page silently ignores.
 *
 * The banner backdrop is 2.357:1 and composed with its left half flat and dark
 * (mean luminance 13%) and its subject in the right 44% (52-79%), so the copy sits in
 * deliberate negative space and the crop is biased away from the text. The scrim and
 * the crop bias are both defined toward the text and flipped together under one RTL
 * rule, because `dir=rtl` puts the copy on the other side and a physical gradient
 * would otherwise darken the wrong half.
 *
 * Two things were removed from the copy column earlier. `site.taglineAlt` printed a
 * Pashto tagline directly above the English headline, and the hero's `heritageNote` was a
 * glass card labelled "Bilingual heritage note" holding Dari and Pashto sentences.
 * Both belonged to the mockups, not to an English page — localised copy belongs in a
 * localised edition.
 *
 * The vertical rhythm is also tighter than it was: at `space-xl` top and bottom the
 * section measured 849px, so on a 900px viewport the hero alone overran the fold and
 * the scroll hint was never visible.
 */
export function Hero({ section }: { section?: HomeSection }) {
  const settings = useSiteSettings()
  const stats = useAppSelector((state) => state.home.data?.heroStats ?? [])
  const featured = useAppSelector((state) => state.home.data?.featuredProducts ?? [])
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const glowY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -60])

  const data = parseData(section?.dataJson)
  const hero = featured[0]

  const slides = useMemo<HeroSlide[]>(() => {
    const parsed = parseSlides(section?.slidesJson)
    if (parsed.length) return parsed
    return [fallbackSlide(section, data, settings)]
  }, [section, data, settings])

  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  // Clamp when the slide count changes (e.g. after an edit).
  useEffect(() => {
    setActive((i) => (i < slides.length ? i : 0))
  }, [slides.length])

  const go = useCallback(
    (next: number) => setActive(((next % slides.length) + slides.length) % slides.length),
    [slides.length],
  )

  // Auto-advance, paused on hover/focus and under reduced-motion.
  useEffect(() => {
    if (slides.length <= 1 || reduceMotion || paused) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 7000)
    return () => window.clearInterval(id)
  }, [slides.length, reduceMotion, paused])

  const slide = slides[active] ?? slides[0]
  const eyebrow = section?.eyebrow ?? settings.siteName
  const picture = slide.backdrop || data.defaultBackdrop
  const focalPosition = FOCAL_POSITION[slide.focalPoint ?? 'away-from-text']
  // Deliberately the site name and nothing more specific. Describing what the artwork
  // actually shows is a claim about the brand that has not been made, and an invented
  // alt is worse than a plain one.
  const pictureAlt = settings.siteName

  // The hero's height is the picture's height: the section's box is locked to the image's
  // real proportions so that object-fit has no room to crop and no bar to leave. The ratio
  // is read from the loaded <img> rather than assumed, so it follows an editor's upload.
  const [pictureRatio, setPictureRatio] = useState<string | undefined>(undefined)

  return (
    <section
      ref={ref}
      data-hero=""
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      style={pictureRatio ? ({ '--hero-aspect': pictureRatio } as React.CSSProperties) : undefined}
      className={cn(
        'relative w-full overflow-hidden border-b border-white/10 bg-royal-gradient text-white',
        pictureRatio && 'hero-height-locks-to-picture',
        picture ? 'py-space-md' : 'py-space-lg md:py-space-xl',
      )}
    >
      {picture ? (
        <>
          <AnimatePresence mode="wait">
            <motion.img
              key={picture}
              src={picture}
              alt={pictureAlt}
              /* The hero picture is the page's LCP element. A real <img> lets the browser
                 discover it in the HTML and prioritise it; as a CSS background it was
                 invisible until the stylesheet parsed, and had no alt text at all. */
              fetchPriority="high"
              decoding="async"
              onLoad={(e) => setPictureRatio(`${e.currentTarget.naturalWidth} / ${e.currentTarget.naturalHeight}`)}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              /* The section's box is the picture's own proportions, so nothing can crop
                 and nothing needs bars; object-cover keeps the picture glued to every edge
                 even against the moment before --hero-aspect is known. */
              className={cn('absolute inset-0 size-full object-cover', focalPosition)}
            />
          </AnimatePresence>
        </>
      ) : null}

      {/* Ambient luminous orbs */}
      <motion.div
        style={{ y: glowY }}
        className="pointer-events-none absolute -top-32 -left-32 size-[34rem] rounded-full bg-secondary/30 blur-[100px]"
      />
      <motion.div
        style={{ y: glowY }}
        className="pointer-events-none absolute top-1/4 -right-24 size-[42rem] rounded-full bg-secondary-container/20 blur-[120px]"
      />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[30rem] rounded-full bg-accent-gold/10 blur-[90px]" />

      <div className="relative z-10 mx-auto max-w-[1360px] px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 items-center gap-gutter lg:grid-cols-12">
          {/* --------------------------------------------------------- copy column */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
            className="flex flex-col items-start gap-space-sm lg:col-span-7"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`badge-${active}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="flex items-center gap-space-xs"
              >
                <Icon name="workspace_premium" size={22} className="shrink-0 text-accent-gold" />
                <span className="flex flex-col">
                  <span className="text-label-sm font-bold uppercase tracking-widest text-accent-gold">
                    {slide.badge ?? 'Albaik Standard'}
                  </span>
                  <span className="text-label-md font-semibold text-white/85">
                    {slide.badgeSubtitle ?? 'Approved product documentation'}
                  </span>
                </span>
              </motion.div>
            </AnimatePresence>

            <motion.div variants={fadeChild}>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 shadow-inner backdrop-blur-md">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-gold opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-accent-gold" />
                </span>
                <span className="text-label-sm font-bold uppercase tracking-widest text-white/90">
                  {eyebrow}
                </span>
              </span>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="flex flex-col items-start gap-space-sm"
              >
                <h1 className="font-display text-display-lg-mobile font-semibold tracking-tight text-white md:text-headline-lg">
                  {slide.title}{' '}
                  <br className="hidden sm:inline" />
                  <span className="font-display text-headline-lg-mobile font-normal italic text-accent-gold-light md:text-headline-lg">
                    {slide.accentWord}
                  </span>
                </h1>

                {slide.body ? (
                  <p className="max-w-xl text-body-md leading-relaxed text-white/85">{slide.body}</p>
                ) : null}

                <div className="flex w-full flex-wrap items-center gap-space-sm pt-space-xs sm:w-auto">
                  <ButtonLink
                    to={slide.primaryCtaHref ?? '/collections'}
                    variant="gold"
                    size="md"
                    iconRight="arrow_forward"
                    className="w-full sm:w-auto"
                  >
                    {slide.primaryCtaLabel ?? 'Explore the Collections'}
                  </ButtonLink>
                  <ButtonLink
                    to={slide.secondaryCtaHref ?? '/about'}
                    variant="glass"
                    size="md"
                    icon="science"
                    className="w-full sm:w-auto"
                  >
                    {slide.secondaryCtaLabel ?? 'Our Product Approach'}
                  </ButtonLink>
                </div>
              </motion.div>
            </AnimatePresence>

            {hero ? (
              <motion.div
                variants={fadeChild}
                className="flex w-full max-w-lg flex-wrap items-center justify-between gap-x-space-md gap-y-space-xs rounded-2xl border border-white/20 bg-gradient-midnight/85 px-space-md py-space-sm text-white shadow-lg backdrop-blur-md"
              >
                <div className="flex min-w-0 items-center gap-space-sm">
                  <BrandMark tone="dark" variant="crown" className="size-8 shrink-0" alt="" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-headline-sm font-semibold text-white">{hero.name}</span>
                    <span className="truncate text-body-sm text-white/70">
                      {hero.formulationLabel ?? hero.brandName}
                    </span>
                  </div>
                </div>
                {hero.size ? (
                  <div className="flex shrink-0 items-center gap-space-xs">
                    <span className="text-label-sm font-bold uppercase tracking-wider text-accent-gold">
                      Bottle size
                    </span>
                    <span className="text-label-lg font-bold text-white">{hero.size}</span>
                  </div>
                ) : null}
              </motion.div>
            ) : null}

            {stats.length ? (
              <motion.div variants={fadeChild} className="grid w-full max-w-lg grid-cols-3 gap-space-xs pt-space-sm">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.6 + index * 0.1 }}
                    className="rounded-xl border border-white/15 bg-white/10 p-3.5 text-center shadow-lg backdrop-blur-md transition-colors duration-300 hover:bg-white/15"
                  >
                    <span className={cn('block font-display text-headline-md font-bold', ACCENT_TEXT[stat.accent ?? 'primary'])}>
                      {stat.value}
                    </span>
                    <span className="text-label-sm uppercase tracking-wider text-white/70">{stat.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}

            {slides.length > 1 ? (
              <motion.div variants={fadeChild} className="flex items-center gap-space-sm pt-space-xs">
                <button
                  type="button"
                  onClick={() => go(active - 1)}
                  aria-label="Previous slide"
                  className="grid size-9 place-items-center rounded-full border border-white/25 text-white/90 transition-colors hover:bg-white/15"
                >
                  <Icon name="chevron_left" size={18} />
                </button>
                <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      role="tab"
                      aria-selected={index === active}
                      aria-label={`Go to slide ${index + 1}`}
                      onClick={() => setActive(index)}
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        index === active ? 'w-7 bg-accent-gold' : 'w-2 bg-white/40 hover:bg-white/70',
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => go(active + 1)}
                  aria-label="Next slide"
                  className="grid size-9 place-items-center rounded-full border border-white/25 text-white/90 transition-colors hover:bg-white/15"
                >
                  <Icon name="chevron_right" size={18} />
                </button>
              </motion.div>
            ) : null}

            {/* The tagline was a mobile-only pill under the visual column, which no
                longer exists. It stays in the copy column so it is not lost. */}
            <GlassTag className="lg:hidden">{settings.tagline}</GlassTag>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint, painted over the picture rather than in flow, so it cannot push
          the hero taller than the picture's own box. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute inset-x-0 bottom-2 z-10 flex justify-center"
      >
        <Link
          to={slide.primaryCtaHref ?? '/collections'}
          className="flex flex-col items-center gap-1 text-label-sm uppercase tracking-[0.25em] text-white/90 transition-colors hover:text-white"
        >
          Explore
          <motion.span
            animate={reduceMotion ? {} : { y: [0, 7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon name="arrow_downward" size={16} />
          </motion.span>
        </Link>
      </motion.div>
    </section>
  )
}

const fadeChild = {
  hidden: { opacity: 0, y: 26, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: EASE },
  },
}

export function parseData(json?: string | null): HeroSectionData {
  if (!json) return {}
  try {
    return JSON.parse(json) as HeroSectionData
  } catch {
    return {}
  }
}

export function parseSlides(json?: string | null): HeroSlide[] {
  if (!json) return []
  try {
    const value = JSON.parse(json)
    if (Array.isArray(value)) {
      return value
        .filter((s): s is HeroSlide => s && typeof s === 'object')
        .map((s) => ({
          backdrop: typeof s.backdrop === 'string' ? s.backdrop : '',
          focalPoint: FOCAL_POINTS.includes(s.focalPoint as FocalPoint)
            ? (s.focalPoint as FocalPoint)
            : 'away-from-text',
          badge: typeof s.badge === 'string' ? s.badge : '',
          badgeSubtitle: typeof s.badgeSubtitle === 'string' ? s.badgeSubtitle : '',
          title: typeof s.title === 'string' ? s.title : '',
          accentWord: typeof s.accentWord === 'string' ? s.accentWord : '',
          body: typeof s.body === 'string' ? s.body : '',
          primaryCtaLabel: typeof s.primaryCtaLabel === 'string' ? s.primaryCtaLabel : '',
          primaryCtaHref: typeof s.primaryCtaHref === 'string' ? s.primaryCtaHref : '',
          secondaryCtaLabel: typeof s.secondaryCtaLabel === 'string' ? s.secondaryCtaLabel : '',
          secondaryCtaHref: typeof s.secondaryCtaHref === 'string' ? s.secondaryCtaHref : '',
        }))
    }
  } catch {
    /* fall through */
  }
  return []
}
