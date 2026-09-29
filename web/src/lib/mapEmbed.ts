/**
 * Turn the `contact.mapEmbed` setting into a usable iframe `src`.
 *
 * The dashboard documents the setting as the `src` URL, but Google Maps' "Share → Embed
 * a map" button copies the *whole* `<iframe …>…</iframe>` snippet, and pasting that
 * whole snippet is the normal case. Both forms are accepted:
 *
 *   - a bare `https://…` URL is used as-is;
 *   - an `<iframe src="…">` snippet has its `src` extracted.
 *
 * Anything else is treated as unset (empty string), so a malformed paste renders nothing
 * rather than a broken frame. Only the `src` is ever read, so no markup from the setting
 * is injected into the page.
 */
export function mapEmbedSrc(value?: string | null): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''

  const fromIframe = /<iframe\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1]
  const candidate = (fromIframe ?? raw).replace(/&amp;/g, '&').trim()

  return /^https?:\/\//i.test(candidate) ? candidate : ''
}

/** Pull the destination coordinates out of an embed URL, when it carries any. */
function embedLatLng(url: string): { lat: string; lng: string } | null {
  // Google's "Embed a map" pb payload carries the centre as !2d<lng> … !3d<lat>.
  const lat = /!3d(-?\d+(?:\.\d+)?)/.exec(url)?.[1]
  const lng = /!2d(-?\d+(?:\.\d+)?)/.exec(url)?.[1]
  if (lat && lng) return { lat, lng }

  // Other embed flavours and plain map links carry the centre as @lat,lng …
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url)
  if (at) return { lat: at[1], lng: at[2] }

  // … or as a q/query/ll/center/destination parameter.
  const query = /[?&](?:q|query|ll|center|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url)
  if (query) return { lat: query[1], lng: query[2] }

  return null
}

/**
 * "Get directions" target for the configured map.
 *
 * Built from the coordinates in the embed URL when it has them, so the button routes to
 * the exact pinned place instead of text-searching the address — the seeded address is a
 * placeholder ("Head Office, Kabul, Afghanistan") that Google resolves to nothing useful.
 * Falls back to an address search when the URL carries no coordinates, and to an empty
 * string (so the caller can hide the button) when there is neither.
 */
export function mapDirectionsUrl(value?: string | null, fallbackAddress = ''): string {
  const src = mapEmbedSrc(value)
  const coords = src ? embedLatLng(src) : null
  if (coords) return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`

  const address = fallbackAddress.trim()
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return ''
}
