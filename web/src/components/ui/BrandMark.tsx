import { cn } from '@/lib/utils'

/**
 * The Albaik brand mark.
 *
 * The brand kit ships as eight 4500×4500 PNGs (see
 * `.workbuddy-ai/scripts/optimise-assets.py`, which trims and re-encodes them to
 * WebP). Three of them are load-bearing here:
 *
 * - `header-lockup-{dark,light}` — crown + "Albaik", derived by cropping the small-caps
 *   "Group of Companies" line off the full lockup. The full lockup is ~1.66:1 and its
 *   third line is illegible in a 72px bar; this variant is ~2:1 and reads cleanly.
 * - `lockup-{white,navy}` — the complete three-line lockup, for the footer and anywhere
 *   with room to breathe.
 * - `crown-{white,navy}` — the emblem alone, for tight or square contexts.
 *
 * `tone` is about the *background*, not the artwork: `tone="dark"` means "I am sitting
 * on a dark surface, give me the light mark". Getting this backwards is the classic way
 * to ship an invisible logo.
 *
 * Width and height are always set so the header cannot shift once the image loads.
 */
export type BrandVariant = 'lockup' | 'full' | 'crown'

const SOURCES: Record<BrandVariant, { light: string; dark: string; w: number; h: number }> = {
  // crown + "Albaik"
  lockup: { light: '/brand/header-lockup-light.webp', dark: '/brand/header-lockup-dark.webp', w: 480, h: 241 },
  // crown + "Albaik" + "Group of Companies"
  full: { light: '/brand/lockup-navy.webp', dark: '/brand/lockup-white.webp', w: 480, h: 295 },
  // emblem only
  crown: { light: '/brand/crown-navy.webp', dark: '/brand/crown-white.webp', w: 480, h: 286 },
}

export function BrandMark({
  tone = 'dark',
  variant = 'lockup',
  className,
  alt,
  priority = false,
}: {
  /** The surface the mark sits on — `dark` returns the white artwork. */
  tone?: 'light' | 'dark'
  variant?: BrandVariant
  className?: string
  alt?: string
  priority?: boolean
}) {
  const source = SOURCES[variant]
  return (
    <img
      src={tone === 'dark' ? source.dark : source.light}
      alt={alt ?? 'Albaik Group of Companies'}
      width={source.w}
      height={source.h}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('block object-contain', className)}
    />
  )
}

/**
 * The emblem in a fixed square, for use as an avatar/badge where the lockup would be
 * the wrong shape. Falls back to the crown artwork inside a brand-tinted tile.
 */
export function BrandEmblem({
  tone = 'dark',
  size = 40,
  className,
}: {
  tone?: 'light' | 'dark'
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        tone === 'dark' ? 'bg-white/10 ring-1 ring-white/15' : 'bg-surface-container-low ring-1 ring-outline-variant/40',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <BrandMark
        tone={tone}
        variant="crown"
        className="w-[68%]"
        alt=""
      />
    </span>
  )
}
