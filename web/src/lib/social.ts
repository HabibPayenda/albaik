/**
 * Turn a configured social link into a usable href.
 *
 * Staff paste all sorts — a full URL, a bare domain, sometimes a handle — and the footer
 * renders whatever is stored. A value with no scheme becomes a *relative* link and 404s
 * (the "the links don't work" report was `social.facebook = "ccc"`), so:
 *
 *   - a value that already has a scheme is used as-is;
 *   - a bare domain (`host.tld`, optionally with a path) gets `https://` prepended;
 *   - anything else — a handle, a stray word — is treated as unset, so a half-typed value
 *     never becomes a broken link and the network simply does not render.
 */
export function socialUrl(value?: string | null): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(raw)) return `https://${raw}`
  return ''
}
