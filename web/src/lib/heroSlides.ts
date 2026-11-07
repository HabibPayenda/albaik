/**
 * The hero carousel's data model: what a slide is, and how its backdrop is chosen.
 *
 * Kept out of `Hero.tsx` because a module that exports both a component and plain
 * values defeats Fast Refresh, and the dashboard editor imports the same helpers —
 * they are shared, not private to the component.
 */

/**
 * Which way the crop is biased, named for where the subject sits *relative to the
 * text* rather than for a physical edge. `away-from-text` keeps the subject on the
 * side the copy does not cover, which is what a hero backdrop almost always wants.
 */
export type FocalPoint = 'away-from-text' | 'centre' | 'toward-text'

/**
 * The art-directed breakpoints a backdrop can be supplied for.
 *
 * The banner is not one picture cropped four ways: each breakpoint is its own
 * composition, so the copy stays in negative space and the subject is never cut. The
 * widest comes first, which is both the `<source>` order (first match wins) and the
 * fallback order (a bigger picture downscales better than a smaller one upscales).
 */
export type HeroVariant = 'ultrawide' | 'desktop' | 'tablet' | 'mobile'

export const HERO_VARIANTS: HeroVariant[] = ['ultrawide', 'desktop', 'tablet', 'mobile']

/** The media query each variant serves. Empty means "the default `<img src>`". */
export const HERO_VARIANT_MEDIA: Record<HeroVariant, string> = {
  ultrawide: '(min-width: 1600px)',
  desktop: '(min-width: 1024px)',
  tablet: '(min-width: 768px)',
  mobile: '',
}

export interface HeroSlide {
  /** One picture for every breakpoint — the fallback for any variant left unset. */
  backdrop?: string
  /** One art-directed picture per breakpoint. */
  backdrops?: Partial<Record<HeroVariant, string>>
  focalPoint?: FocalPoint
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
  /** Per-breakpoint version of the above, inherited by slides with no set of their own. */
  defaultBackdrops?: Partial<Record<HeroVariant, string>>
}

export const FOCAL_POINTS: FocalPoint[] = ['away-from-text', 'centre', 'toward-text']

/**
 * The picture to paint at `variant`.
 *
 * Order: the slide's own variant, then the next wider one, then the slide's single
 * legacy backdrop, then the section default by the same rule, then nothing (the royal
 * gradient). Falling back to a *wider* picture rather than a narrower one means an
 * under-supplied slide is merely cropped by `object-cover`, never upscaled.
 */
export function resolveBackdrop(
  slide: HeroSlide,
  data: HeroSectionData,
  variant: HeroVariant,
): string {
  const fromSet = (
    set: Partial<Record<HeroVariant, string>> | undefined,
    single: string | undefined,
  ): string => {
    // Walk toward *wider* compositions (the list is widest-first), never toward a
    // narrower one: a desktop-only slide must supply the mobile image, not vanish.
    for (let index = HERO_VARIANTS.indexOf(variant); index >= 0; index -= 1) {
      const url = set?.[HERO_VARIANTS[index]]
      if (typeof url === 'string' && url) return url
    }
    return single || ''
  }

  return (
    fromSet(slide.backdrops, slide.backdrop) ||
    fromSet(data.defaultBackdrops, data.defaultBackdrop)
  )
}

export function parseData(json?: string | null): HeroSectionData {
  if (!json) return {}
  try {
    return JSON.parse(json) as HeroSectionData
  } catch {
    return {}
  }
}

/** Keeps only the known breakpoints, and only when they carry a real URL. */
function parseBackdrops(value: unknown): Partial<Record<HeroVariant, string>> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = HERO_VARIANTS.flatMap((variant) => {
    const url = (value as Record<string, unknown>)[variant]
    return typeof url === 'string' && url.trim() ? [[variant, url] as const] : []
  })
  return entries.length ? (Object.fromEntries(entries) as Partial<Record<HeroVariant, string>>) : undefined
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
          backdrops: parseBackdrops(s.backdrops),
          focalPoint: FOCAL_POINTS.includes(s.focalPoint as FocalPoint)
            ? (s.focalPoint as FocalPoint)
            : 'away-from-text',
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
