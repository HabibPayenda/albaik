import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Every `--text-*` size token declared in index.css's `@theme` block.
 *
 * tailwind-merge only knows Tailwind's built-in scale, so an unknown `text-label-lg`
 * gets bucketed as a text *colour*. That makes it collide with real colours: in
 * `cn('text-white', 'text-label-lg')` one of the two is silently dropped — which is
 * how the royal-gradient buttons lost their white label. Registering the tokens as
 * font sizes keeps colour and size in separate groups.
 */
const TEXT_SIZES = [
  'display-lg',
  'display-lg-mobile',
  'headline-lg',
  'headline-lg-mobile',
  'headline-md',
  'headline-sm',
  'body-lg',
  'body-md',
  'body-sm',
  'label-lg',
  'label-md',
  'label-sm',
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: TEXT_SIZES }],
    },
  },
})

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** `plural(1, 'product')` → "1 product"; `plural(4, 'product')` → "4 products". */
export function plural(count: number, singular: string, pluralForm?: string) {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`
}

/** Format a price using the currency stored on the product. */
export function formatPrice(
  price: number | null | undefined,
  currency = 'AFN',
  fallback = 'Price on request',
) {
  if (price === null || price === undefined) return fallback
  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price)
  return `${value} ${currency}`
}

export function formatDate(value: string | Date, withTime = false) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

/** "Soraya Noori" -> "SN" */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(value: string, max = 120) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

/** Turn a settings array into a plain lookup object. */
export function toSettingsMap(settings: { key: string; value?: string | null }[]) {
  return settings.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value ?? ''
    return acc
  }, {})
}

export function isTruthy(value: string | undefined | null, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return value === 'true' || value === '1'
}

/** Deterministic gradient for products that have no artwork yet. */
export function accentGradient(from?: string | null, to?: string | null) {
  return `linear-gradient(140deg, ${from ?? '#050d24'} 0%, ${to ?? '#0e3b9c'} 100%)`
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
