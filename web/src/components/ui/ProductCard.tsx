import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { asAccent, BadgeOverlay, Chip } from './Badge'
import { Icon } from './Icon'
import { ProductImage } from './ProductImage'
import { StarRating } from './StarRating'
import { cn, formatPrice } from '@/lib/utils'
import type { ProductCard as ProductCardModel } from '@/lib/types'

export interface ProductCardProps {
  product: ProductCardModel
  className?: string
  showPrice?: boolean
  priceOnRequest?: string
  ctaLabel?: string
  compact?: boolean
  priority?: boolean
}

/**
 * The product tile.
 *
 * **Density is the point.** The previous revision used a 4:5 image stage, `space-lg`
 * interior padding, a 24px display title, a two-line description, three chips and a
 * full-width action row — which measured roughly 700–760px tall. One row filled the
 * viewport and a visitor had to scroll to discover the range at all, which reads as a
 * slow, thin catalogue rather than a premium one.
 *
 * This version is built to fit **two rows in a laptop viewport** (~780px of usable
 * height at 900px after the header):
 *
 *   image     aspect-[4/3] instead of 4:5      -> -20% height
 *   padding   space-sm -> space-md             -> -16px
 *   title     headline-sm (20px), one line
 *   body      one line, clamped
 *   chips     at most two
 *   action    compact button, not a full row
 *
 * The grid that renders these uses up to four columns on wide screens, so the tiles
 * stay around 380px tall — two rows to a fold.
 *
 * No `variants` prop on purpose: this card is reused in grids, carousels and related
 * rows, and a variant contract only resolves inside a matching parent — anywhere else
 * framer-motion leaves it parked at `hidden` (opacity 0). Entrance animation belongs
 * to whichever container renders the grid.
 */
export function ProductCard({
  product,
  className,
  showPrice = true,
  priceOnRequest = 'Price on request',
  ctaLabel = 'View details',
  compact = false,
  priority = false,
}: ProductCardProps) {
  const href = `/products/${product.slug}`
  const price = formatPrice(product.price, product.currency, priceOnRequest)
  const hasNumericPrice = product.price !== null && product.price !== undefined

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm transition-shadow duration-300 hover:shadow-e2',
        compact ? 'p-space-sm' : 'p-3.5 md:p-space-md',
        className,
      )}
    >
      {/* Soft brand glow behind the tile */}
      <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-secondary-fixed/35 blur-2xl" />

      <Link to={href} className="relative block" aria-label={product.name}>
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          name={product.name}
          accentFrom={product.accentFrom}
          accentTo={product.accentTo}
          priority={priority}
          className="mb-space-sm aspect-[16/10] w-full rounded-xl"
        />

        {product.badge ? (
          <div className="absolute top-2.5 left-2.5">
            <BadgeOverlay accent={asAccent(product.badgeStyle)}>{product.badge}</BadgeOverlay>
          </div>
        ) : null}

        {product.size ? (
          <div className="absolute right-2.5 bottom-2.5 rounded-md bg-surface-container-lowest/92 px-2 py-1 text-label-sm font-bold text-primary-container shadow-sm backdrop-blur-md">
            {product.size}
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col justify-between gap-space-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-label-sm font-bold uppercase tracking-wider text-secondary">
              {product.formulationLabel ?? product.brandName ?? product.categoryName}
            </span>
            {product.rating ? <StarRating value={product.rating} count={product.reviewCount} /> : null}
          </div>

          <h3 className="font-display text-headline-sm font-semibold leading-snug text-on-surface transition-colors group-hover:text-secondary">
            <Link to={href} className="line-clamp-1">
              {product.name}
            </Link>
          </h3>

          {/*
            No description here on purpose. The card is sized so two full rows fit
            inside one viewport, and a one-line clamp of the short description read
            as a fragment rather than a sentence — it cost ~24px and earned none of
            it. The full copy lives on the product page, where there is room for it.
          */}

          {product.ingredients?.length ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {product.ingredients.slice(0, compact ? 1 : 2).map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-space-sm border-t border-outline-variant/30 pt-2">
          {/*
            One line, not two. The "Retail price" / "Pricing" eyebrow sat above the
            value and said nothing the value did not — the number is self-evidently
            a price. Dropping it saves a line of height and removes a redundant label.
          */}
          <span
            className={cn(
              'min-w-0 truncate font-display font-bold text-primary',
              hasNumericPrice ? 'text-label-lg' : 'text-body-sm',
            )}
          >
            {showPrice ? price : priceOnRequest}
          </span>

          <Link
            to={href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-royal-gradient-compact px-3 py-1.5 text-label-md font-semibold text-white shadow-sm transition-all duration-300 hover:brightness-110 hover:shadow-md"
          >
            {ctaLabel}
            <Icon name="arrow_forward" size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

/** Loading placeholder that matches the card's exact geometry. */
export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest',
        compact ? 'p-space-sm' : 'p-3.5 md:p-space-md',
      )}
    >
      <div className="skeleton mb-space-sm aspect-[16/10] w-full rounded-xl" />
      <div className="flex flex-col gap-2.5">
        <div className="skeleton h-2.5 w-1/3" />
        <div className="skeleton h-4 w-3/4" />
        <div className="mt-1 flex gap-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
