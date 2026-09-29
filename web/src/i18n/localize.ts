import { useI18n } from './index'

/**
 * Resolve a localized value for a CMS-backed content record.
 *
 * Content (product / brand / category names, nav labels, page titles…) carries
 * `FieldDari` / `FieldPashto` siblings of its English `Field`. When the active
 * locale is Dari or Pashto we prefer the translated sibling and fall back to the
 * English base, so untranslated records still render coherently instead of blank.
 *
 * This deliberately never *invents* a translation — if the team has not entered a
 * Dari/Pashto value, the English copy shows. Filling the fields in is a content
 * task for native reviewers, not something the build should guess at.
 */
export function useLocalized(
  record: Record<string, unknown> | undefined | null,
  field: string,
): string {
  const { locale } = useI18n()
  if (!record) return ''
  const base = record[field]
  if (locale === 'en') return typeof base === 'string' ? base : ''
  const localized = record[`${field}${locale === 'fa' ? 'Dari' : 'Pashto'}`]
  if (typeof localized === 'string' && localized.trim()) return localized
  return typeof base === 'string' ? base : ''
}
