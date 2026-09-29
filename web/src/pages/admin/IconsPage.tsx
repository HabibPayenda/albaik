import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AdminCard, AdminPageHeader, StatTile } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Toggle } from '@/components/ui/Field'
import { ICON_CATEGORIES, ICON_REGISTRY, type IconCategory, type IconEntry } from '@/icons/registry'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchIcons, saveIcons } from '@/store/iconsSlice'
import { pushToast } from '@/store/uiSlice'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'enabled' | 'disabled'

/**
 * Icon library.
 *
 * The registry itself ships with the front end, so this screen is only the switchboard:
 * it decides which of those icons the icon selectors across the dashboard are allowed to
 * offer. Turn something off here and it stops appearing in the pickers — content that
 * already uses it keeps its glyph, so disabling an icon can never blank out a page.
 *
 * Only the disabled names are saved. That keeps the stored setting small, and means an
 * icon added to the registry in a later build shows up on its own instead of staying
 * hidden until somebody enables it by hand.
 */
export default function IconsPage() {
  const dispatch = useAppDispatch()
  const saved = useAppSelector((state) => state.icons.disabled)
  const status = useAppSelector((state) => state.icons.status)
  const saving = useAppSelector((state) => state.icons.saving)

  const [disabled, setDisabled] = useState<string[]>([])
  const [seeded, setSeeded] = useState(false)
  const [term, setTerm] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (status === 'idle') dispatch(fetchIcons())
  }, [status, dispatch])

  /* Adopt the saved list once, then let local edits diverge until they are saved.
   * Re-syncing on every change would fight the operator mid-session. */
  useEffect(() => {
    if (seeded || status !== 'ready') return
    setDisabled(saved)
    setSeeded(true)
  }, [saved, status, seeded])

  const set = useMemo(() => new Set(disabled), [disabled])
  const dirty = useMemo(() => {
    if (disabled.length !== saved.length) return true
    const savedSet = new Set(saved)
    return disabled.some((name) => !savedSet.has(name))
  }, [disabled, saved])

  const matches = useMemo(() => {
    const needle = term.trim().toLowerCase()
    return ICON_REGISTRY.filter((entry) => {
      if (!needle) return true
      return (
        entry.label.toLowerCase().includes(needle) ||
        entry.name.toLowerCase().includes(needle.replace(/\s+/g, '_'))
      )
    })
  }, [term])

  const visible = useMemo(
    () =>
      matches.filter((entry) =>
        filter === 'all' ? true : filter === 'enabled' ? !set.has(entry.name) : set.has(entry.name),
      ),
    [matches, filter, set],
  )

  const grouped = useMemo(() => {
    const byCategory = new Map<IconCategory, IconEntry[]>()
    for (const entry of visible) {
      const list = byCategory.get(entry.category)
      if (list) list.push(entry)
      else byCategory.set(entry.category, [entry])
    }
    return ICON_CATEGORIES.map((category) => ({
      category,
      entries: byCategory.get(category.key) ?? [],
      total: ICON_REGISTRY.filter((entry) => entry.category === category.key).length,
    })).filter((group) => group.entries.length > 0)
  }, [visible])

  const toggle = (name: string) =>
    setDisabled((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    )

  const setGroup = (entries: IconEntry[], off: boolean) =>
    setDisabled((current) => {
      const next = new Set(current)
      for (const entry of entries) {
        if (off) next.add(entry.name)
        else next.delete(entry.name)
      }
      return [...next]
    })

  const onSave = async () => {
    const result = await dispatch(saveIcons(disabled))
    if (saveIcons.fulfilled.match(result)) {
      setSeeded(true)
      dispatch(pushToast({ tone: 'success', title: 'Icon library updated' }))
    } else {
      dispatch(pushToast({ tone: 'error', title: 'Could not save the icon library' }))
    }
  }

  const enabledCount = ICON_REGISTRY.length - set.size

  return (
    <div>
      <AdminPageHeader
        eyebrow="System"
        title="Icon library"
        description="Choose which icons the dashboard's icon selectors offer. Switching an icon off removes it from every picker; anything already using it keeps its glyph, so a live page can never lose an icon by accident."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDisabled([])
              }}
              disabled={!set.size}
            >
              Enable all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisabled(ICON_REGISTRY.map((entry) => entry.name))}
              disabled={!enabledCount}
            >
              Disable all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDisabled(saved)
                dispatch(pushToast({ tone: 'info', title: 'Changes discarded' }))
              }}
              disabled={!dirty}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="save"
              loading={saving}
              onClick={onSave}
              disabled={!dirty}
            >
              Save changes
            </Button>
          </>
        }
      />

      <div className="mb-space-lg grid gap-space-sm sm:grid-cols-3">
        <StatTile label="Icons in the library" value={ICON_REGISTRY.length} icon="palette" />
        <StatTile label="Available in selectors" value={enabledCount} icon="check_circle" accent="teal" />
        <StatTile label="Switched off" value={set.size} icon="visibility" />
      </div>

      <AdminCard>
        <div className="flex flex-col gap-space-sm border-b border-outline-variant/40 pb-space-md sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search by name, e.g. “shipping”"
              aria-label="Search icons"
              className="w-full rounded-lg border border-primary-container/15 bg-clinical-white py-2.5 pe-3 ps-9 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/18"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
            {(['all', 'enabled', 'disabled'] as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={cn(
                  'rounded-md px-3 py-1.5 text-label-md font-semibold capitalize transition-colors',
                  filter === key
                    ? 'bg-clinical-white text-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {key}
              </button>
            ))}
          </div>

          <span className="text-label-md text-on-surface-variant">
            {visible.length} shown
          </span>
        </div>

        {!grouped.length ? (
          <p className="py-space-xl text-center text-body-sm text-on-surface-variant">
            No icon matches “{term}”.
          </p>
        ) : (
          <div className="flex flex-col gap-space-lg pt-space-md">
            {grouped.map((group) => {
              const onCount = group.entries.filter((entry) => !set.has(entry.name)).length
              return (
                <section key={group.category.key} aria-labelledby={`icons-${group.category.key}`}>
                  <div className="mb-space-sm flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <h2
                        id={`icons-${group.category.key}`}
                        className="font-display text-headline-sm font-semibold text-on-surface"
                      >
                        {group.category.label}
                      </h2>
                      <span className="text-label-md text-on-surface-variant">
                        {onCount} of {group.total} on
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGroup(group.entries, false)}
                        disabled={onCount === group.entries.length}
                      >
                        All on
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGroup(group.entries, true)}
                        disabled={onCount === 0}
                      >
                        All off
                      </Button>
                    </div>
                  </div>

                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.entries.map((entry) => {
                      const on = !set.has(entry.name)
                      return (
                        <li key={entry.name}>
                          <div
                            className={cn(
                              'flex items-center gap-space-sm rounded-lg border px-space-sm py-2.5 transition-colors',
                              on
                                ? 'border-primary-container/15 bg-clinical-white'
                                : 'border-outline-variant/50 bg-surface-container-low',
                            )}
                          >
                            <span
                              className={cn(
                                'grid size-9 shrink-0 place-items-center rounded-md',
                                on ? 'bg-water-foam text-primary-container' : 'bg-surface-container text-on-surface-variant/60',
                              )}
                            >
                              <Icon name={entry.name} size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  'block truncate text-body-sm font-semibold',
                                  on ? 'text-on-surface' : 'text-on-surface-variant',
                                )}
                              >
                                {entry.label}
                              </span>
                              <span className="block truncate font-mono text-label-sm text-on-surface-variant/70">
                                {entry.name}
                              </span>
                            </span>
                            <Toggle
                              checked={on}
                              onChange={() => toggle(entry.name)}
                              aria-label={`${entry.label} icon`}
                              className="shrink-0"
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </AdminCard>
    </div>
  )
}
