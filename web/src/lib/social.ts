/**
 * The networks the dashboard can hold a link for.
 *
 * Declared here rather than beside the icons: this module owns the settings keys, and
 * nothing under `lib/` imports from `components/` — that edge runs the other way round,
 * so the icon registry consumes this type rather than the reverse.
 */
export type SocialKey = 'facebook' | 'instagram' | 'linkedin' | 'tiktok'

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
 *
 * A scheme alone is not enough: `https://` has no host to open, so the result is checked
 * with `URL` and rejected if it names none. The dashboard saves through a button rather
 * than a form, which means a browser's `type="url"` validation never stands in the way.
 */
export function socialUrl(value?: string | null): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''

  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(raw)
      ? `https://${raw}`
      : ''
  if (!candidate) return ''

  try {
    return new URL(candidate).hostname ? candidate : ''
  } catch {
    return ''
  }
}

/** The four networks the dashboard can hold a URL for, in the order they are shown. */
const NETWORKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'tiktok', label: 'TikTok' },
] as const satisfies readonly { key: SocialKey; label: string }[]

export interface ConfiguredSocial {
  key: SocialKey
  href: string
  label: string
}

/** The four social URL fields, as `useSiteSettings` exposes them. */
export interface SocialSettings {
  facebook: string
  instagram: string
  linkedin: string
  tiktok: string
}

/**
 * The social networks a site actually has a link for.
 *
 * The footer and the contact card both show the same set, and both must hide a network
 * whose stored value is unusable (see `socialUrl`) — so the list is built once here rather
 * than twice, keeping the two rows from drifting apart.
 */
export function configuredSocials(settings: SocialSettings): ConfiguredSocial[] {
  const hrefs: Record<SocialKey, string> = {
    facebook: socialUrl(settings.facebook),
    instagram: socialUrl(settings.instagram),
    linkedin: socialUrl(settings.linkedin),
    tiktok: socialUrl(settings.tiktok),
  }

  return NETWORKS.flatMap(({ key, label }) => (hrefs[key] ? [{ key, href: hrefs[key], label }] : []))
}
