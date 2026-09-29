import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import en from './locales/en'
import fa from './locales/fa'
import ps from './locales/ps'

export type LocaleCode = 'en' | 'fa' | 'ps'
export type Direction = 'ltr' | 'rtl'

export interface LocaleMeta {
  code: LocaleCode
  /** English label, used for accessibility / the switcher's title. */
  label: string
  /** Endonym — the name written in the language itself. */
  native: string
  dir: Direction
}

export const LOCALES: Record<LocaleCode, LocaleMeta> = {
  en: { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  fa: { code: 'fa', label: 'Dari', native: 'دری', dir: 'rtl' },
  ps: { code: 'ps', label: 'Pashto', native: 'پښتو', dir: 'rtl' },
}

const DICTS = { en, fa, ps } as const
const STORAGE_KEY = 'albaik.locale'
const DEFAULT_LOCALE: LocaleCode = 'en'

function lookup(dict: unknown, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part]
      }
      return undefined
    }, dict)
  return typeof value === 'string' ? value : undefined
}

export interface I18nValue {
  locale: LocaleCode
  dir: Direction
  /** Switch the active locale (persisted to localStorage). */
  setLocale: (locale: LocaleCode) => void
  /**
   * Translate a dot-keyed string. Falls back to English, then to the raw key, so a
   * missing key never crashes the render or shows a blank. Interpolates `{var}`.
   */
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function applyToDocument(locale: LocaleCode) {
  if (typeof document === 'undefined') return
  const meta = LOCALES[locale]
  const root = document.documentElement
  root.setAttribute('lang', locale)
  root.setAttribute('dir', meta.dir)
  root.classList.toggle('rtl', meta.dir === 'rtl')
  root.classList.toggle('ltr', meta.dir === 'ltr')
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_LOCALE
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && LOCALES[stored as LocaleCode] ? (stored as LocaleCode) : DEFAULT_LOCALE
  })

  // Keep <html> in sync on every change (and on first paint via the effect below).
  useEffect(() => {
    applyToDocument(locale)
  }, [locale])

  const setLocale = useCallback((next: LocaleCode) => {
    if (!LOCALES[next]) return
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage may be unavailable (private mode); degrade silently */
    }
    setLocaleState(next)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = lookup(DICTS[locale], key) ?? lookup(DICTS.en, key)
      if (value == null) return key
      if (vars) {
        return value.replace(/\{(\w+)\}/g, (_, name: string) =>
          vars[name] != null ? String(vars[name]) : `{${name}}`,
        )
      }
      return value
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, dir: LOCALES[locale].dir, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an <I18nProvider>')
  return ctx
}
