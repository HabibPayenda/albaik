import { useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { isTruthy } from '@/lib/utils'

/**
 * Convenience accessor for the global settings map that the bootstrap thunk loads.
 * Keeps components from re-deriving `settings['catalog.showPrices']` everywhere.
 */
export function useSiteSettings() {
  const settings = useAppSelector((state) => state.site.settings)
  const status = useAppSelector((state) => state.site.status)

  return useMemo(
    () => ({
      status,
      raw: settings,
      get: (key: string, fallback = '') => settings[key] ?? fallback,
      bool: (key: string, fallback = false) => isTruthy(settings[key], fallback),
      /** `get` with a blank/whitespace value treated as unset, so a cleared site-owned copy setting restores its built-in text. */
      text: (key: string, fallback = '') => (settings[key] ?? '').trim() || fallback,

      siteName: settings['site.name'] || 'Albaik Group of Companies',
      // Trimmed where the others are not: this one is painted as the Product plate's
      // wordmark, and a value of only spaces would render a wordless plate rather than
      // the built-in wordmark.
      shortName: (settings['site.shortName'] ?? '').trim() || 'ALBAIK',
      tagline: settings['site.tagline'] || 'The Mark of Pure Perfection',
      description: settings['site.description'] || '',

      email: settings['contact.email'] || '',
      phone: settings['contact.phone'] || '',
      whatsapp: settings['contact.whatsapp'] || '',
      address: settings['contact.address'] || '',
      hours: settings['contact.hours'] || '',
      mapEmbed: settings['contact.mapEmbed'] || '',

      facebook: settings['social.facebook'] || '',
      instagram: settings['social.instagram'] || '',
      tiktok: settings['social.tiktok'] || '',
      linkedin: settings['social.linkedin'] || '',
      whatsappChannel: settings['social.whatsapp'] || '',

      showPrices: isTruthy(settings['catalog.showPrices'], true),
      priceOnRequest: settings['catalog.priceOnRequest'] || 'Price on request',
      currency: settings['catalog.currency'] || 'AFN',

      tickerEnabled: isTruthy(settings['ticker.enabled'], true),
      tickerText: settings['ticker.text'] || '',
      tickerLeft: settings['ticker.left'] || '',
      tickerRight: settings['ticker.right'] || '',

      footerBlurb: settings['footer.blurb'] || '',
      newsletterTitle: settings['footer.newsletterTitle'] || 'Join the Albaik mailing list',
      copyright: settings['footer.copyright'] || '',
    }),
    [settings, status],
  )
}
