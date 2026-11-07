import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BreadcrumbItem = {
  /** The visible level name. */
  label: string
  /** The level's canonical route. Omitted for a level with no route of its own. */
  to?: string
}

/**
 * The public site's breadcrumb trail.
 *
 * Mirrors the server shell's `BreadcrumbList` hierarchy: Home > Collections >
 * Collection > Brand > Product, and Home > Page (or Home > Guides > Page) for content.
 * The last level is the current page and carries `aria-current="page"`.
 */
export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  if (!items.length) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('text-body-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight
                  size={13}
                  aria-hidden="true"
                  className="shrink-0 text-on-surface-variant/60"
                />
              ) : null}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-medium text-on-surface-variant transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('font-medium', isLast ? 'text-on-surface' : 'text-on-surface-variant')}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
