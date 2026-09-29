import { useState } from 'react'
import { Icon } from './Icon'
import { accentGradient, cn } from '@/lib/utils'

/**
 * Product artwork.
 *
 * No product photography ships with the source material, so when a product has no
 * image we render a branded gradient plate instead of a broken <img>. The admin can
 * upload real photography per product, which then takes over automatically.
 *
 * The photo is fitted, never cropped — the whole product must be visible inside the
 * Product frame, so `object-contain` is the default and callers only set the frame's
 * size (4:5 everywhere). See docs/adr/0006-product-images-are-framed-4-5.md.
 */
export function ProductImage({
  src,
  alt,
  name,
  accentFrom,
  accentTo,
  className,
  imageClassName,
  zoomOnHover = true,
  priority = false,
}: {
  src?: string | null
  alt?: string
  name: string
  accentFrom?: string | null
  accentTo?: string | null
  className?: string
  imageClassName?: string
  zoomOnHover?: boolean
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden',
        !showImage && 'bg-surface-container-low',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src as string}
          alt={alt ?? name}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            'size-full object-contain object-center transition-transform duration-700 ease-out',
            zoomOnHover && 'group-hover:scale-105',
            imageClassName,
          )}
        />
      ) : (
        <PlaceholderPlate name={name} accentFrom={accentFrom} accentTo={accentTo} />
      )}
    </div>
  )
}

function PlaceholderPlate({
  name,
  accentFrom,
  accentTo,
}: {
  name: string
  accentFrom?: string | null
  accentTo?: string | null
}) {
  return (
    <div
      className="relative flex size-full flex-col items-center justify-center gap-3 p-6 text-center"
      style={{ backgroundImage: accentGradient(accentFrom, accentTo) }}
    >
      {/*
        Scrim. `accentFrom`/`accentTo` are free-text hex inputs on the product editor,
        so this plate's legibility cannot be a property of the accent — a hand-typed
        pale accent would put white text on a light backdrop. Measured before this
        existed, the seeded accents already failed: the gold pair (#8a6d1f -> #d4af37)
        put the product name at 3.07:1 and the wordmark at 1.91:1, against 4.5 required.
        Teal (#003337 -> #008891) failed the wordmark too, and so did the compact
        sapphire pair, which is why "Albaik" is no longer drawn at 60% either.

        A 65% midnight wash is provably safe across the whole space an admin can type
        into: against a pure-white accent it still leaves the name at 6.12:1 and the
        wordmark at 4.61:1. The accent survives as a hue shift — a gold plate reads
        bronze, a teal plate reads deep teal — rather than as the dominant colour, which
        also keeps a grid of these coherent with DESIGN.md's sapphire dominance instead
        of reading as four unrelated cards.
      */}
      <div className="absolute inset-0 bg-gradient-midnight/65" aria-hidden="true" />

      {/* Ambient light orbs, matching the mockup's hero treatment. Above the scrim so
          they stay a light source rather than being washed out by it. */}
      <div className="pointer-events-none absolute -top-10 -left-10 size-40 rounded-full bg-white/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 bottom-0 size-32 rounded-full bg-accent-gold/15 blur-3xl" />

      {/* Droplet lattice */}
      <svg className="pointer-events-none absolute inset-0 size-full opacity-[0.14]" aria-hidden="true">
        <defs>
          <pattern id={`dots-${name.replace(/\W/g, '')}`} width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#ffffff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${name.replace(/\W/g, '')})`} />
      </svg>

      <Icon
        name="spa"
        size={30}
        className="relative z-10 text-accent-gold-light/90"
        strokeWidth={1.4}
      />
      <span className="relative z-10 max-w-[85%] font-display text-headline-sm font-semibold leading-snug text-white">
        {name}
      </span>
      {/* 80%, not 60%. At 60% this composited to 3.49:1 on the compact sapphire pair and
          1.58:1 on the gold pair — the old probe reported it as pure white and missed
          both, because it dropped the alpha channel. */}
      <span className="relative z-10 text-label-sm uppercase tracking-[0.22em] text-white/80">
        Albaik
      </span>
    </div>
  )
}
