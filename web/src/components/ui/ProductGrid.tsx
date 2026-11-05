import { AnimatePresence, motion } from 'framer-motion'
import { ProductCard, ProductCardSkeleton } from './ProductCard'
import { EmptyState } from './Feedback'
import { Button } from './Button'
import { EASE } from '@/lib/motion'
import type { ProductCard as ProductCardModel } from '@/lib/types'

/**
 * Shared responsive product grid used by the collections, category, brand and
 * search results screens. Handles the loading, empty and populated states so the
 * pages themselves stay thin.
 */
export function ProductGrid({
  products,
  loading,
  showPrice = true,
  priceOnRequest,
  currency,
  emptyTitle = 'No products found',
  emptyDescription = 'Try a different collection or clear your filters.',
  onReset,
  columns = 4,
  skeletonCount = 8,
}: {
  products: ProductCardModel[]
  loading?: boolean
  showPrice?: boolean
  priceOnRequest?: string
  /** The site's default currency, for products that carry none of their own. */
  currency?: string
  emptyTitle?: string
  emptyDescription?: string
  onReset?: () => void
  columns?: 2 | 3 | 4
  skeletonCount?: number
}) {
  /*
   * Four columns by default, so the tiles stay small enough that two rows clear a
   * laptop fold. The gap drops to `space-md` below `lg` — at `gutter` the cards were
   * separated by 24px in both axes, which fought the density the card itself was
   * tightened for.
   */
  const gridClass =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  const gapClass = 'gap-space-md lg:gap-gutter'

  if (loading && !products.length) {
    return (
      <div className={`grid ${gapClass} ${gridClass}`}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (!loading && !products.length) {
    return (
      <EmptyState
        icon="search"
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={onReset ? 'Clear filters' : undefined}
        onAction={onReset}
      />
    )
  }

  return (
    <motion.div layout className={`grid ${gapClass} ${gridClass}`}>
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.42, ease: EASE, delay: Math.min(index, 8) * 0.05 }}
            className="h-full"
          >
            <ProductCard
              product={product}
              showPrice={showPrice}
              priceOnRequest={priceOnRequest}
              currency={currency}
              priority={index < 3}
              className="h-full"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

/** Compact result-count + sort bar shown above a grid. */
export function ResultsBar({
  total,
  label = 'products',
  right,
}: {
  total: number
  label?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-space-md flex flex-wrap items-center justify-center gap-space-sm border-b border-outline-variant/40 pb-space-sm text-center md:justify-between md:text-left">
      <p className="text-body-sm text-on-surface-variant">
        <span className="font-semibold text-on-surface">{total}</span> {label}
      </p>
      {right}
    </div>
  )
}

/** Simple pagination control. */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  )

  return (
    <nav className="mt-space-xl flex items-center justify-center gap-2" aria-label="Pagination">
      <Button variant="subtle" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>

      {pages.map((p, index) => {
        const previous = pages[index - 1]
        const gap = previous && p - previous > 1
        return (
          <span key={p} className="flex items-center gap-2">
            {gap ? <span className="text-on-surface-variant">…</span> : null}
            <button
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={
                p === page
                  ? 'size-9 rounded-lg bg-royal-gradient-compact text-label-md font-bold text-white'
                  : 'size-9 rounded-lg text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface'
              }
            >
              {p}
            </button>
          </span>
        )
      })}

      <Button variant="subtle" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  )
}
