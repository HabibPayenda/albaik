import { Fragment, useMemo } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import {
  DEFAULT_SUGGESTIONS,
  parseSuggestions,
  serializeSuggestions,
} from '@/lib/searchSuggestions'
import type { SearchSuggestion } from '@/lib/searchSuggestions'

/**
 * Editor for the `search.suggestions` setting: the chips shown in the search overlay
 * while the field is empty. The value is a JSON string in the same shape the public
 * site parses, so any edit is serialised immediately and the overlay reacts the moment
 * settings are saved.
 *
 * * Blank value → renders the bundled chips; a note says the site is showing its
 *   defaults until a list is saved.
 * * Explicit `[]` → renders an empty state; the overlay will show no chips.
 * * Each row needs a label and a query; the server rejects an incomplete row with a
 *   clear message, so the row is only pinned down when it is filled in or removed.
 */
export function SearchSuggestionsEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const rows = useMemo<SearchSuggestion[]>(
    () => parseSuggestions(value) ?? DEFAULT_SUGGESTIONS,
    [value],
  )
  const isBundleFallback = parseSuggestions(value) === null

  const updateRow = (index: number, patch: Partial<SearchSuggestion>) => {
    onChange(serializeSuggestions(rows.map((row, i) => (i === index ? { ...row, ...patch } : row))))
  }
  const removeRow = (index: number) => {
    onChange(serializeSuggestions(rows.filter((_, i) => i !== index)))
  }
  const addRow = () => {
    onChange(serializeSuggestions([...rows, { label: '', query: '' }]))
  }
  const resetToDefaults = () => {
    onChange(serializeSuggestions(DEFAULT_SUGGESTIONS))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm text-on-surface-variant/80">
          The chips shown under the search bar when it opens empty. Each needs a short
          label and the query it searches for.
        </p>
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetToDefaults}>
          Reset to built-in chips
        </Button>
      </div>

      {isBundleFallback ? (
        <p className="rounded-lg bg-surface-container-low/70 px-3 py-2 text-body-sm text-on-surface-variant">
          The site is currently showing its built-in chips because this setting has no
          value yet — they will stay until you save your own list.
        </p>
      ) : null}

      {rows.length ? (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="grid flex-1 gap-1.5 sm:grid-cols-2">
                <TextInput
                  aria-label={`Chip ${index + 1} label`}
                  value={row.label}
                  className={row.label.trim() ? undefined : 'border-error/40'}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                />
                <TextInput
                  aria-label={`Chip ${index + 1} query`}
                  value={row.query}
                  className={row.query.trim() ? undefined : 'border-error/40'}
                  placeholder="Search query"
                  onChange={(e) => updateRow(index, { query: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label={`Remove chip ${index + 1}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/40 px-4 py-6 text-center">
          <p className="text-body-sm text-on-surface-variant">
            No chips — the overlay will hide the suggestions row entirely.
          </p>
          <Button variant="outline" size="sm" icon={Plus} onClick={addRow}>
            Add first chip
          </Button>
        </div>
      )}

      {rows.length ? (
        <Fragment>
          <Button variant="outline" size="sm" icon={Plus} onClick={addRow} className="self-start">
            Add chip
          </Button>
          <p className="text-body-sm text-on-surface-variant/80">
            An emptied row is rejected on save — remove it if you no longer want that chip.
          </p>
        </Fragment>
      ) : null}
    </div>
  )
}