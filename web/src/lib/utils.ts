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

/**
 * The figure worth striking through beside the current price — and nothing when there is
 * no such figure. An absent compare-at price says nothing, one equal to the current price
 * is not a reduction, and one below it would display a "cut" that raises the price: only
 * a higher figure is the former price the strike-through claims.
 */
export function wasPrice(price: number | null | undefined, compareAt: number | null | undefined) {
  if (price === null || price === undefined || compareAt === null || compareAt === undefined) return null
  return compareAt > price ? compareAt : null
}

/**
 * Whether a link staff saved with "Open in a new tab" should actually open one. Only an
 * address that can leave the site can: an internal route must keep the site's
 * client-side navigation, or the click would force a full page reload for a link that
 * already lives here — and react-router would swallow a scheme-less `//host` into an
 * in-app path, so protocol-relative counts as external too. An unflagged link never
 * opens a tab whatever it points at.
 */
export function opensInNewTab(flag: boolean | undefined, path: string) {
  return Boolean(flag) && /^(?:https?:)?\/\//i.test(path)
}

export function formatDate(value: string | Date, withTime = false) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '�?"'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

/**
 * A timestamp in the viewer's browser timezone. The API sends UTC with a trailing Z,
 * so the conversion is correct. An explicit IANA zone can be supplied for a known
 * contact, with a safe fallback to the browser zone.
 */
export function formatLocalDateTime(value: string | Date, timeZone?: string | null) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '�?"'

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }

  if (timeZone) {
    try {
      return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(date)
    } catch {
      // Unknown IANA zone: fall back to the browser's local zone.
    }
  }

  return new Intl.DateTimeFormat('en-GB', options).format(date)
}

/** The viewer's browser timezone, used only as a human-readable label. */
export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
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
