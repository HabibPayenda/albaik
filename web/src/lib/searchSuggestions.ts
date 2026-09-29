/**
 * The search overlay's suggestion chips, shared by the overlay (rendering) and the
 * settings screen (editing). The value lives in the `search.suggestions` site setting as
 * a JSON array of label/query pairs; the parser and serializer here must stay in lock-step
 * with the API's `SearchChipDto` validation.
 */

export interface SearchSuggestion {
  label: string
  query: string
}

/** The bundled chips shown whenever the setting is blank or cannot be read. */
export const DEFAULT_SUGGESTIONS: SearchSuggestion[] = [
  { label: 'Anti-dandruff care', query: 'dandruff' },
  { label: 'Post-oil cleansing', query: 'purify' },
  { label: 'Repair & nourish', query: 'repair' },
  { label: 'Face wash', query: 'face' },
  { label: 'Avora Shine', query: 'avora' },
]

export const SEARCH_SUGGESTIONS_KEY = 'search.suggestions'

/**
 * Parses the stored value:
 *   * `null`            → blank or structurally invalid → caller falls back to the defaults
 *   * a list of chips   → what to render, possibly `[]` (an admin chose to hide all chips)
 */
export function parseSuggestions(raw: string | null | undefined): SearchSuggestion[] | null {
  if (!raw || !raw.trim()) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const chips = parsed.map((entry) => {
      const e = entry as { label?: unknown; query?: unknown } | null
      return {
        label: typeof e?.label === 'string' ? e.label.trim() : '',
        query: typeof e?.query === 'string' ? e.query.trim() : '',
      }
    })
    if (chips.some((c) => !c.label || !c.query)) return null
    return chips
  } catch {
    return null
  }
}

/** Serializes chips back into the setting value. */
export function serializeSuggestions(chips: SearchSuggestion[]): string {
  return JSON.stringify(chips)
}

/**
 * The suggestion chips that should actually render: the stored set when it parses, the
 * bundled defaults when the setting is blank or invalid, and nothing when the admin
 * explicitly saved an empty list.
 */
export function resolveSuggestions(raw: string | null | undefined): SearchSuggestion[] {
  return parseSuggestions(raw) ?? DEFAULT_SUGGESTIONS
}