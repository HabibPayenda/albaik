import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { asAccent, BadgeOverlay, Chip } from './Badge'
import { Icon } from './Icon'
import { ProductImage } from './ProductImage'
import { StarRating } from './StarRating'
import { cn, formatPrice, wasPrice } from '@/lib/utils'
import type { ProductCard as ProductCardModel } from '@/lib/types'

export interface ProductCardProps {
  product: ProductCardModel
  className?: string
  showPrice?: boolean
  priceOnRequest?: string
  /** The site's default currency, used when the product carries none of its own. */
  currency?: string
  ctaLabel?: string
  compact?: boolean
  priority?: boolean
  /** Centre the copy on narrow screens, for a page whose whole layout is centred on a phone. */
  centered?: boolean
}

/**
 * The product tile.
 *
 * The image stage is a 4:5 Product frame showing the whole photograph (`object-contain`,
 * never cropped), so a 1080×1350 product image appears exactly as shot. This supersedes
 * the earlier "two rows per laptop viewport" goal: the frame used to be a 16:10 landscape
 * stage cropped to fill, which cut a 4:5 photo roughly in half, and a portrait frame is
 * necessarily taller. Density is still managed everywhere else — `space-md` padding, a
 * single-line title, no description, at most two chips and a compact action button — and
 * the grid keeps up to four columns on wide screens, so the page grows in length, not in
 * clutter. See docs/adr/0006-product-images-are-framed-4-5.md.
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
  currency,
  ctaLabel = 'View details',
  compact = false,
  priority = false,
  centered = true,
}: ProductCardProps) {
  const href = `/products/${product.slug}`
  const priced = product.currency || currency
  const price = formatPrice(product.price, priced, priceOnRequest)
  const hasNumericPrice = product.price !== null && product.price !== undefined
  const was = wasPrice(product.price, product.compareAtPrice)
  const current = showPrice ? price : priceOnRequest

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
          className="mb-space-sm aspect-[4/5] w-full rounded-xl"
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

      <div className={cn('flex flex-1 flex-col justify-between gap-space-sm', centered && 'text-center md:text-left')}>
        <div className="flex flex-col gap-1">
          <div className={cn('flex items-center justify-between gap-2', centered && 'justify-center md:justify-between')}>
            <span className="truncate text-label-sm font-bold uppercase tracking-wider text-secondary">
              {product.formulationLabel ?? product.brandName ?? product.categoryName}
            </span>
            {product.rating ? <StarRating value={product.rating} count={product.reviewCount} /> : null}
          </div>

          <h3 className="font-display text-headline-sm font-semibold leading-snug text-on-surface transition-colors group-hover:text-secondary">
            <Link to={href} className="md:line-clamp-1">
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
            <div className={cn('flex flex-wrap gap-1 pt-0.5', centered && 'justify-center md:justify-start')}>
              {product.ingredients.slice(0, compact ? 1 : 2).map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          ) : null}
        </div>

        <div className={cn('flex items-center justify-between gap-space-sm border-t border-outline-variant/30 pt-2', centered && 'justify-center md:justify-between')}>
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
            {/* Only ever a figure the product used to cost, and only while prices are on:
                an on-request card must not leak a number. The struck figure is also the
                one that yields — in a narrow card it ellipsises, so the price the customer
                actually pays is never the part that gets cut. */}
            {showPrice && was !== null ? (
              <span className="inline-flex min-w-0 items-baseline gap-1.5">
                <s className="min-w-0 shrink truncate text-label-sm font-medium text-on-surface-variant">
                  <span className="sr-only">Was </span>
                  {formatPrice(was, priced, priceOnRequest)}
                </s>
                <span className="shrink-0">{current}</span>
              </span>
            ) : (
              current
            )}
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
      <div className="skeleton mb-space-sm aspect-[4/5] w-full rounded-xl" />
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
