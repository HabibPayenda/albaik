import { useI18n, LOCALES, type LocaleCode } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Three-way language switcher (English / Dari / Pashto).
 *
 * The desktop header is dark, so this renders a compact segmented control in
 * white-on-translucent styling. The mobile drawer reuses the same logic via the
 * `block` variant (full-width, stacked). Each button carries its own `lang`
 * attribute so the Arabic-script endonyms (`دری` / `پښتو`) are laid out by the
 * browser's script direction regardless of the page's current `dir`.
 *
 * Switching only swaps UI chrome + CMS `nameDari`/`namePashto` fallbacks — it
 * never invents copy, and English is the safe fallback for anything untranslated.
 */
const ORDER: LocaleCode[] = ['en', 'fa', 'ps']

export function LocaleSwitcher({ variant = 'inline' }: { variant?: 'inline' | 'block' }) {
  const { locale, setLocale } = useI18n()

  const buttons = ORDER.map((code) => {
    const meta = LOCALES[code]
    const active = code === locale
    return (
      <button
        key={code}
        type="button"
        onClick={() => setLocale(code)}
        aria-pressed={active}
        lang={code}
        title={meta.label}
        className={cn(
          'rounded-md font-semibold transition-colors',
          variant === 'block'
            ? 'flex-1 px-3 py-2 text-label-md'
            : 'px-2 py-1 text-label-sm',
          active
            ? 'bg-accent-gold text-gradient-midnight shadow-sm'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
        )}
      >
        {code === 'en' ? 'EN' : meta.native}
      </button>
    )
  })

  if (variant === 'block') {
    return (
      <div
        role="group"
        aria-label="Language"
        className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 p-1"
      >
        {buttons}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="hidden items-center gap-0.5 rounded-lg border border-white/15 bg-white/5 p-0.5 md:flex"
    >
      {buttons}
    </div>
  )
}
