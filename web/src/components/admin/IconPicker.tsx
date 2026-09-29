import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import { Icon, iconLabel } from '@/components/ui/Icon'
import { ICON_CATEGORIES, type IconCategory } from '@/icons/registry'
import { useIconLibrary } from '@/hooks/useIconLibrary'
import { cn } from '@/lib/utils'

const PANEL_WIDTH = 340
const PANEL_MAX_HEIGHT = 400
const GAP = 6

/**
 * Icon selector: a searchable, categorised listbox where every option shows its glyph
 * beside its name.
 *
 * Why this is not a `<select>`
 * ----------------------------
 * The brief asks for the icon next to the name. A native `<select>` cannot do that —
 * `<option>` only accepts text — and a hand-rolled `<div>` list needs the keyboard and
 * focus behaviour a native control would have given us for free, so both are
 * implemented here (`role="listbox"`, arrow keys, Escape, click-outside).
 *
 * Why the panel is `position: fixed`
 * ----------------------------------
 * These pickers live inside the admin form modal, whose body is `overflow-y-auto`
 * inside an `overflow-hidden` shell. An absolutely positioned panel would be clipped at
 * the modal edge. Anchoring to the trigger's viewport rect escapes both, at the cost of
 * having to reposition on scroll — hence the scroll/resize listener below.
 *
 * Switching an icon off in the library removes it from here; content already using it
 * keeps its glyph, so a stored value never renders as "unknown".
 */
export function IconPicker({
  value,
  onChange,
  id,
  placeholder = 'Choose an icon',
  disabled,
}: {
  value: string
  onChange: (name: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
}) {
  const { enabled, all } = useIconLibrary()

  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState<IconCategory | 'all'>('all')
  const [activeIndex, setActiveIndex] = useState(0)
  const [layout, setLayout] = useState({ top: 0, left: 0, width: PANEL_WIDTH, maxHeight: PANEL_MAX_HEIGHT })

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLDivElement | null)[]>([])

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()
    return enabled.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false
      if (!needle) return true
      return (
        entry.label.toLowerCase().includes(needle) ||
        entry.name.toLowerCase().includes(needle.replace(/\s+/g, '_'))
      )
    })
  }, [enabled, term, category])

  /* ---------------------------------------------------------------- positioning */

  const reposition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - GAP - 12
    const spaceAbove = rect.top - GAP - 12
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow

    setLayout({
      top: openUp ? Math.max(12, rect.top - GAP - Math.min(PANEL_MAX_HEIGHT, spaceAbove)) : rect.bottom + GAP,
      left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - PANEL_WIDTH - 12)),
      width: Math.min(PANEL_WIDTH, window.innerWidth - 24),
      maxHeight: Math.min(PANEL_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow),
    })
  }, [])

  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    // The modal body scrolls, so a fixed panel has to follow its trigger.
    const onMove = () => reposition()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, reposition])

  /* ---------------------------------------------------------------- open / close */

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openPanel = () => {
    if (disabled) return
    setTerm('')
    setCategory('all')
    setOpen(true)
  }

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  /* Park the cursor on the current value so Enter re-confirms it. */
  useEffect(() => {
    if (!open) return
    const index = filtered.findIndex((entry) => entry.name === value)
    setActiveIndex(index >= 0 ? index : 0)
  }, [open, value, filtered])

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  /* ---------------------------------------------------------------- interaction */

  const select = (name: string) => {
    onChange(name)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!filtered.length) return
    const perRow = 2

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => Math.min(filtered.length - 1, i + perRow))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => Math.max(0, i - perRow))
        break
      case 'ArrowRight':
        event.preventDefault()
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
        break
      case 'ArrowLeft':
        event.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(filtered.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        select(filtered[activeIndex].name)
        break
      default:
        break
    }
  }

  /* Keep DOM focus on the active option so arrow keys continue to be delivered. */
  useEffect(() => {
    if (!open || document.activeElement !== gridRef.current) return
    optionRefs.current[activeIndex]?.focus()
  }, [activeIndex, open])

  const label = value ? iconLabel(value) : ''

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={cn(
          'flex w-full items-center gap-space-sm rounded-lg border border-primary-container/15 bg-clinical-white px-space-md py-2.5 text-start text-body-sm text-on-surface transition-all',
          'hover:border-primary-container/40 focus:border-primary-container focus:outline-none focus:ring-[3px] focus:ring-primary-container/18',
          disabled && 'bg-surface-container-low text-on-surface-variant',
        )}
      >
        {value ? (
          <Icon name={value} size={18} className="text-primary-container" />
        ) : (
          <span className="grid size-[18px] place-items-center rounded border border-dashed border-outline-variant text-on-surface-variant/60">
            <Search size={11} />
          </span>
        )}
        <span className={cn('flex-1 truncate', !value && 'text-on-surface-variant/60')}>
          {label || placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className={cn(
            'shrink-0 text-on-surface-variant transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          className="fixed z-[120] flex flex-col overflow-hidden rounded-xl border border-primary-container/15 bg-clinical-white shadow-e3"
          style={{ top: layout.top, left: layout.left, width: layout.width }}
        >
          <div className="border-b border-primary-container/10 p-space-sm">
            <div className="relative">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                ref={searchRef}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    gridRef.current?.focus()
                  }
                }}
                placeholder="Search icons"
                aria-label="Search icons"
                className="w-full rounded-lg border border-primary-container/15 bg-surface-container-lowest py-2 pe-3 ps-9 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/18"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
                All
              </CategoryChip>
              {ICON_CATEGORIES.filter((entry) =>
                enabled.some((icon) => icon.category === entry.key),
              ).map((entry) => (
                <CategoryChip
                  key={entry.key}
                  active={category === entry.key}
                  onClick={() => setCategory(entry.key)}
                >
                  {entry.label}
                </CategoryChip>
              ))}
            </div>
          </div>

          <div
            ref={gridRef}
            role="listbox"
            aria-label="Icons"
            tabIndex={-1}
            onKeyDown={onGridKeyDown}
            style={{ maxHeight: layout.maxHeight }}
            className="grid grid-cols-2 gap-1 overflow-y-auto overscroll-contain p-space-sm outline-none"
          >
            {filtered.map((entry, index) => {
              const selected = entry.name === value
              return (
                <div
                  key={entry.name}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={() => select(entry.name)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm transition-colors',
                    selected
                      ? 'bg-water-foam font-semibold text-primary-container'
                      : 'text-on-surface hover:bg-surface-container-low',
                    index === activeIndex && !selected && 'bg-surface-container-low',
                  )}
                >
                  <Icon
                    name={entry.name}
                    size={18}
                    className={selected ? 'text-primary-container' : 'text-on-surface-variant'}
                  />
                  <span className="truncate">{entry.label}</span>
                </div>
              )
            })}

            {!filtered.length ? (
              <p className="col-span-2 px-2 py-6 text-center text-body-sm text-on-surface-variant">
                No icon matches “{term}”.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-primary-container/10 px-space-sm py-2">
            <span className="text-label-sm text-on-surface-variant">
              {filtered.length} of {all.length} icons
            </span>
            <Link
              to="/admin/icons"
              onClick={() => setOpen(false)}
              className="rounded px-1 py-0.5 text-label-sm font-semibold text-primary-container underline-offset-2 hover:underline"
            >
              Manage library
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-2.5 py-1 text-label-sm font-semibold transition-colors',
        active
          ? 'bg-primary-container text-on-primary'
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high',
      )}
    >
      {children}
    </button>
  )
}
