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
import {
  HERO_VARIANTS,
  HERO_VARIANT_MEDIA,
  parseData,
  parseSlides,
  resolveBackdrop,
  type FocalPoint,
  type HeroSlide,
  type HeroSectionData,
  type HeroVariant,
} from '@/lib/heroSlides'

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
  'away-from-text': 'object-top md:object-right md:rtl:object-left',
  centre: 'object-top md:object-center',
  'toward-text': 'object-top md:object-left md:rtl:object-right',
}

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
 * (backdrop set, focal point, headline = title + accent word, body, both CTAs); an
 * editor builds and reorders them from the dashboard, so the copy above the fold is
 * fully changeable. With one slide (or none set) it degrades to the original single
 * hero. A slide's backdrop falls back to the section's default, then to the royal
 * gradient, so a half-built carousel still looks finished.
 *
 * There is exactly one image in the hero and it is behind the text. The glassmorphic
 * product plinth that used to sit to the right is gone, and the featured-product strip
 * it held moved into the copy column. The slide badge and the site-name eyebrow that
 * used to open the column were removed outright: they restated the brand and the
 * section's own heading, so they were noise above the headline.
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
  const variantSources = useMemo(
    () =>
      Object.fromEntries(
        HERO_VARIANTS.map((variant) => [variant, resolveBackdrop(slide, data, variant)]),
      ) as Record<HeroVariant, string>,
    [slide, data],
  )
  // The narrowest picture doubles as the `<img src>`: the default when no `<source>`
  // matches, and the only picture a browser without `<picture>` support ever loads.
  const picture = variantSources.mobile
  const focalPosition = FOCAL_POSITION[slide.focalPoint ?? 'away-from-text']
  // Deliberately the site name and nothing more specific. Describing what the artwork
  // actually shows is a claim about the brand that has not been made, and an invented
  // alt is worse than a plain one.
  const pictureAlt = settings.siteName

  // The hero is one screen tall and the picture is always painted whole (`object-contain`),
  // so nothing is cropped and nothing has to be scrolled to be seen. The copy then has to
  // be placed where the artwork is dark, and the scrim below makes that a guarantee rather
  // than a property of whichever photograph an editor happened to upload.
  const [pictureSize, setPictureSize] = useState<{ w: number; h: number } | null>(null)

  return (
    <section
      ref={ref}
      data-hero=""
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      style={
        {
          // The copy on a phone starts below the bright top band of the portrait
          // composition: its height at full width, two-thirds down. Derived from the
          // loaded file rather than hard-coded, so a different upload still behaves.
          '--hero-copy-top': pictureSize
            ? `calc(100vw * ${pictureSize.h} / ${pictureSize.w} * 0.66)`
            : '0px',
        } as React.CSSProperties
      }
      className="relative flex min-h-[calc(100svh-var(--site-chrome-h,0px))] w-full flex-col overflow-hidden border-b border-white/10 bg-royal-gradient text-white"
    >
      {picture ? (
        <picture className="absolute inset-0 block size-full">
          {/* Widest first — the first matching media query wins. A variant that is not
              supplied is simply absent, and the `<img src>` below still covers it. */}
          {HERO_VARIANTS.map((variant) =>
            HERO_VARIANT_MEDIA[variant] && variantSources[variant] ? (
              <source
                key={variant}
                media={HERO_VARIANT_MEDIA[variant]}
                srcSet={variantSources[variant]}
              />
            ) : null,
          )}
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={picture}
              alt={pictureAlt}
              /* The hero picture is the page's LCP element. A real <img> lets the browser
                 discover it in the HTML and prioritise it; as a CSS background it was
                 invisible until the stylesheet parsed, and had no alt text at all. */
              fetchPriority="high"
              decoding="async"
              onLoad={(e) => setPictureSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              /* Contained, never cropped: the whole composition is on screen at every
                 viewport, which is what makes the four art-directed files worth having.
                 On a phone it is pinned to the top so the copy can sit under its bright
                 band; on wider screens the focal point decides the horizontal bias. */
              className={cn('absolute inset-0 size-full object-contain', focalPosition)}
            />
          </AnimatePresence>
        </picture>
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

      {/* The scrim is the legibility contract. White type on an uploadable photograph
          cannot rely on the photograph being dark where the copy happens to land, so the
          copy side is darkened on top of the picture: bottom-up on a phone (the portrait
          composition is bright at the top), and on the text side from the breakpoint where
          the copy sits beside the subject. */}
      {picture ? (
        <>
          {/* Phone: the portrait composition is bright across its top half, so everything
              from the copy's first line down is darkened outright — a fade that starts
              above the copy would leave the headline on bare artwork. The short gradient
              above softens the edge instead of cutting it. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--hero-copy-top)] bg-[#050d24]/90 md:hidden" />
          <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--hero-copy-top)-6rem)] h-24 bg-gradient-to-b from-transparent to-[#050d24]/90 md:hidden" />
          {/* Tablet: one column, so the copy spans the composition rather than sitting
              beside the subject — the whole frame has to carry the darkening. */}
          <div className="pointer-events-none absolute inset-0 hidden bg-[#050d24]/78 md:block lg:hidden" />
          {/* Desktop: the copy sits on the composition's dark side. The strong stop runs
              past the copy column, so the last stat label is still on a dark ground, and
              fades out over the subject so the artwork stays visible. */}
          <div className="pointer-events-none absolute inset-y-0 start-0 hidden w-[72%] bg-gradient-to-r from-[#050d24]/95 via-[#050d24]/85 via-65% to-transparent lg:block rtl:bg-gradient-to-l" />
        </>
      ) : null}

      <div
        className={cn(
          // Bottom-aligned on a phone so the copy lands on the composition's dark lower
          // band; centred beside the subject once there is room for two columns.
          'relative z-10 mx-auto flex w-full max-w-[1360px] flex-1 flex-col justify-end px-margin-mobile pb-space-lg md:justify-center md:px-margin md:py-space-md',
          picture ? 'pt-[var(--hero-copy-top)]' : 'pt-space-lg',
        )}
      >
        <div className="grid grid-cols-1 items-center gap-gutter lg:grid-cols-12">
          {/* --------------------------------------------------------- copy column */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
            className="flex flex-col items-center gap-space-sm text-center lg:col-span-7 md:items-start md:text-left"
          >
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

                <div className="flex w-full flex-wrap items-center justify-center gap-space-sm pt-space-xs sm:w-auto md:justify-start">
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
              <motion.div variants={fadeChild} className="flex items-center justify-center gap-space-sm pt-space-xs md:justify-start">
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
        className="absolute inset-x-0 bottom-2 z-10 hidden justify-center md:flex"
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

