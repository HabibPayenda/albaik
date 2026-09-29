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
