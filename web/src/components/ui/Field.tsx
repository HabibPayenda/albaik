import { forwardRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ shell */

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
  htmlFor,
}: {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant"
        >
          {label}
          {required ? <span className="ml-1 text-error">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-body-sm text-error">{error}</p>
      ) : hint ? (
        <p className="text-body-sm text-on-surface-variant/80">{hint}</p>
      ) : null}
    </div>
  )
}

const CONTROL =
  'w-full rounded-lg border border-primary-container/15 bg-clinical-white px-space-md py-2.5 text-body-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:border-primary-container focus:outline-none focus:ring-[3px] focus:ring-primary-container/18 disabled:bg-surface-container-low disabled:text-on-surface-variant'

/* ------------------------------------------------------------------ inputs */

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...rest} />
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(CONTROL, 'resize-y', className)} {...rest} />
  },
)

/**
 * A `<select>` styled to match the text inputs.
 *
 * `appearance-none` strips the platform arrow, and the previous revision reserved room
 * for a replacement with `pr-9` but never rendered one — so every dropdown in the
 * dashboard was indistinguishable from a plain text field until you clicked it.
 *
 * The chevron is decorative: the control takes its accessible name from the surrounding
 * `<Field>` label, so it is `aria-hidden` rather than announced. Inset and padding use
 * logical properties (`end-*` / `pe-*`) so the arrow sits on the correct side once the
 * interface is switched to Dari or Pashto.
 */
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(CONTROL, 'cursor-pointer appearance-none pe-9', className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
      </div>
    )
  },
)

/** Controlled checkbox presented as a switch. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
  /**
   * Needed when the switch has no visible text: the control is a bare button, so
   * without a name a screen reader announces it as just "switch".
   */
  'aria-label'?: string
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-space-sm',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300',
          checked ? 'bg-primary-container' : 'bg-surface-container-highest',
        )}
      >
        <span
          className={cn(
            'inline-block size-4.5 rounded-full bg-white shadow-sm transition-transform duration-300',
            checked ? 'translate-x-[1.55rem]' : 'translate-x-1',
          )}
          style={{ width: 18, height: 18 }}
        />
      </button>
      {label || description ? (
        <span className="flex flex-col">
          {label ? <span className="text-body-sm font-semibold text-on-surface">{label}</span> : null}
          {description ? (
            <span className="text-body-sm text-on-surface-variant">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  )
}

/**
 * Free-text list editor used for the product "benefits" and "ingredient" arrays.
 * Enter or comma commits a tag; Backspace on an empty field removes the last one.
 */
export function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter',
  className,
  id,
}: {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
  id?: string
}) {
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const part of parts) if (!next.includes(part)) next.push(part)
    onChange(next)
    setDraft('')
  }

  return (
    <div
      className={cn(
        'flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-lg border border-primary-container/15 bg-clinical-white p-2 transition-all focus-within:border-primary-container focus-within:ring-[3px] focus-within:ring-primary-container/18',
        className,
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1 text-label-sm font-semibold text-on-surface"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded-full p-0.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
            aria-label={`Remove ${tag}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit(draft)
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => commit(draft)}
          className="rounded-md p-1 text-primary-container transition-colors hover:bg-water-foam"
          aria-label="Add"
        >
          <Plus size={14} />
        </button>
      ) : null}
    </div>
  )
}
