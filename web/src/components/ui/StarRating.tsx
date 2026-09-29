import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  value = 0,
  count,
  size = 14,
  className,
  showValue = true,
}: {
  value?: number | null
  count?: number
  size?: number
  className?: string
  showValue?: boolean
}) {
  const rating = value ?? 0

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`Rated ${rating} out of 5`}>
      <div className="flex items-center gap-0.5 text-accent-gold">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={size}
            className={cn(index < Math.round(rating) ? 'fill-accent-gold' : 'fill-transparent opacity-40')}
            strokeWidth={1.75}
          />
        ))}
      </div>
      {showValue && rating > 0 ? (
        <span className="text-label-sm font-semibold text-on-surface">
          {rating.toFixed(1)}
          {count !== undefined && count > 0 ? (
            <span className="font-normal text-on-surface-variant"> ({count})</span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
