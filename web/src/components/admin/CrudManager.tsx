import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loaders, saveResource, deleteResource, reorderResource, type ResourceKey } from '@/store/adminSlice'
import { pushToast } from '@/store/uiSlice'
import { AdminCard, AdminPageHeader, AdminToolbar } from './AdminUI'
import { DataTable, type Column } from './DataTable'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Select, TagInput, TextArea, TextInput, Toggle } from '@/components/ui/Field'
import { ImageField } from './ImageField'
import { IconPicker } from './IconPicker'
import { Icon } from '@/components/ui/Icon'

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'tags' | 'color' | 'image' | 'icon'
  options?: { value: string; label: string }[]
  hint?: string
  required?: boolean
  span?: 1 | 2
  placeholder?: string
  rows?: number
  /** Coerce the submitted value to a number (useful for numeric <select> options). */
  numeric?: boolean
  /** `image` fields only. `square` suits logos and icons, `video` suits banners. */
  aspect?: 'video' | 'square'
}

export interface CrudConfig<T extends { id: number }> {
  resource: ResourceKey
  title: string
  singular: string
  description?: string
  eyebrow?: string
  addLabel?: string
  columns: Column<T>[]
  fields: FieldDef[]
  defaults: Record<string, unknown>
  /** Field used to label a row in confirmations and toasts. */
  labelKey: keyof T & string
  searchKeys?: (keyof T & string)[]
  /** Enables the up/down control that swaps a row's position and persists the new order. */
  reorderable?: boolean
  /** Optional hook to reshape the payload just before it is sent. */
  transformOnSave?: (values: Record<string, unknown>) => unknown
  /** Optional extra content rendered above the table. */
  banner?: React.ReactNode
}

/**
 * Schema-driven CRUD screen.
 *
 * Every "simple" content collection in the dashboard (testimonials, trust pillars,
 * hair profiles, hero stats, nav links, footer links, home sections) is rendered by
 * this one component — the per-screen files only declare columns and fields.
 */
export function CrudManager<T extends { id: number }>({
  config,
  onEditRow,
  embedded = false,
}: {
  config: CrudConfig<T>
  onEditRow?: (row: T) => void
  /** Skip the page header — used when a screen hosts more than one collection. */
  embedded?: boolean
}) {
  const dispatch = useAppDispatch()
  const state = useAppSelector((store) => store.admin[config.resource])
  const rows = state.items as T[]

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<T | null>(null)
  const [creating, setCreating] = useState(false)
  const [values, setValues] = useState<Record<string, unknown>>(config.defaults)
  const [pendingDelete, setPendingDelete] = useState<T | null>(null)

  useEffect(() => {
    if (state.status === 'idle') dispatch(loaders[config.resource]())
  }, [state.status, dispatch, config.resource])

  const filtered = useMemo(() => {
    if (!search.trim() || !config.searchKeys?.length) return rows
    const term = search.trim().toLowerCase()
    return rows.filter((row) =>
      config.searchKeys!.some((key) => String(row[key] ?? '').toLowerCase().includes(term)),
    )
  }, [rows, search, config.searchKeys])

  const openCreate = () => {
    setValues({ ...config.defaults })
    setEditing(null)
    setCreating(true)
  }

  const openEdit = (row: T) => {
    if (onEditRow) return onEditRow(row)
    const next: Record<string, unknown> = { ...config.defaults }
    for (const field of config.fields) {
      next[field.name] = (row as Record<string, unknown>)[field.name] ?? config.defaults[field.name]
    }
    setValues(next)
    setEditing(row)
    setCreating(false)
  }

  const close = () => {
    setCreating(false)
    setEditing(null)
  }

  const onSave = async () => {
    const missing = config.fields.find(
      (field) => field.required && !String(values[field.name] ?? '').trim(),
    )
    if (missing) {
      dispatch(pushToast({ tone: 'error', title: `${missing.label} is required` }))
      return
    }

    const payload = config.transformOnSave ? config.transformOnSave(values) : coerce(config.fields, values)
    const result = await dispatch(
      saveResource({ resource: config.resource, id: editing?.id, payload }),
    )

    if (saveResource.fulfilled.match(result)) {
      dispatch(
        pushToast({
          tone: 'success',
          title: editing ? `${config.singular} updated` : `${config.singular} created`,
        }),
      )
      close()
    } else {
      dispatch(
        pushToast({
          tone: 'error',
          title: `Could not save ${config.singular.toLowerCase()}`,
          description: String(result.payload ?? ''),
        }),
      )
    }
  }

  const onDelete = async () => {
    if (!pendingDelete) return
    const result = await dispatch(deleteResource({ resource: config.resource, id: pendingDelete.id }))
    if (deleteResource.fulfilled.match(result)) {
      dispatch(pushToast({ tone: 'success', title: `${config.singular} deleted` }))
    } else {
      dispatch(
        pushToast({
          tone: 'error',
          title: `Could not delete ${config.singular.toLowerCase()}`,
          description: String(result.payload ?? ''),
        }),
      )
    }
    setPendingDelete(null)
  }

  /**
   * Swaps a row with its neighbour, then pushes the full ordered id list so the
   * server re-sequences every row. Hidden while searching — a filtered view does not
   * reflect real positions, so reordering there would scramble the live list.
   */
  const moveRow = async (row: T, direction: -1 | 1) => {
    const index = rows.findIndex((other) => other.id === row.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= rows.length) return

    const next = [...rows]
    ;[next[index], next[target]] = [next[target], next[index]]

    const result = await dispatch(
      reorderResource({ resource: config.resource, ids: next.map((other) => other.id) }),
    )
    if (reorderResource.fulfilled.match(result)) {
      dispatch(pushToast({ tone: 'success', title: `${config.singular} order updated` }))
    } else {
      dispatch(
        pushToast({
          tone: 'error',
          title: `Could not reorder ${config.title.toLowerCase()}`,
          description: String(result.payload ?? ''),
        }),
      )
    }
  }

  const columns: Column<T>[] = [
    ...config.columns,
    ...(onEditRow
      ? []
      : []),
  ]

  return (
    <>
      {embedded ? (
        <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-col">
            <h2 className="font-display text-headline-sm font-semibold text-on-surface">{config.title}</h2>
            {config.description ? (
              <p className="max-w-2xl text-body-sm text-on-surface-variant">{config.description}</p>
            ) : null}
          </div>
          <Button variant="primary" icon="add" onClick={openCreate}>
            {config.addLabel ?? `Add ${config.singular.toLowerCase()}`}
          </Button>
        </div>
      ) : (
        <AdminPageHeader
          eyebrow={config.eyebrow}
          title={config.title}
          description={config.description}
          actions={
            <Button variant="primary" icon="add" onClick={openCreate}>
              {config.addLabel ?? `Add ${config.singular.toLowerCase()}`}
            </Button>
          }
        />
      )}

      {config.banner}

      <AdminCard bodyClassName="p-0">
        {config.searchKeys?.length ? (
          <div className="p-space-md">
            <AdminToolbar className="mb-0">
              <div className="relative w-full max-w-sm">
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
                />
                <TextInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${config.title.toLowerCase()}…`}
                  className="pl-9"
                  aria-label={`Search ${config.title}`}
                />
              </div>
              <span className="ml-auto text-body-sm text-on-surface-variant">
                {filtered.length} of {rows.length}
              </span>
            </AdminToolbar>
          </div>
        ) : null}

        <DataTable
          columns={columns}
          rows={filtered}
          loading={state.status === 'loading'}
          emptyMessage={`No ${config.title.toLowerCase()} yet.`}
          actions={[
            { icon: 'edit', label: 'Edit', tone: 'primary', onClick: openEdit },
            { icon: 'delete', label: 'Delete', tone: 'danger', onClick: setPendingDelete },
          ]}
          onMoveRow={config.reorderable && !search.trim() ? moveRow : undefined}
        />
      </AdminCard>

      {/* ------------------------------------------------------------ form */}
      <Modal
        open={creating || Boolean(editing)}
        onClose={close}
        title={editing ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
        description={config.description}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={state.saving}>
              Cancel
            </Button>
            <Button variant="primary" icon="save" onClick={onSave} loading={state.saving}>
              {editing ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          {config.fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              hint={field.hint}
              required={field.required}
              htmlFor={`field-${field.name}`}
              className={field.span === 2 ? 'sm:col-span-2' : undefined}
            >
              <FieldControl
                field={field}
                value={values[field.name]}
                onChange={(next) => setValues((prev) => ({ ...prev, [field.name]: next }))}
              />
            </Field>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={onDelete}
        title={`Delete this ${config.singular.toLowerCase()}?`}
        description={
          pendingDelete
            ? `"${String((pendingDelete as Record<string, unknown>)[config.labelKey] ?? '')}" will be permanently removed.`
            : undefined
        }
        busy={state.saving}
      />
    </>
  )
}

/**
 * Normalise form values to the shapes the API expects — numbers stay numbers,
 * booleans stay booleans and tag fields are always arrays.
 */
function coerce(fields: FieldDef[], values: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of fields) {
    let value = values[field.name]

    if (field.type === 'number') {
      value = value === '' || value === null || value === undefined ? null : Number(value)
    } else if (field.type === 'bool') {
      value = Boolean(value)
    } else if (field.type === 'tags') {
      value = Array.isArray(value) ? value : []
    } else if (field.numeric) {
      value = value === '' || value === null || value === undefined ? null : Number(value)
    }

    payload[field.name] = value
  }
  return payload
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
}) {
  const id = `field-${field.name}`

  switch (field.type) {
    case 'textarea':
      return (
        <TextArea
          id={id}
          rows={field.rows ?? 3}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case 'number':
      return (
        <TextInput
          id={id}
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        />
      )
    case 'bool':
      return <Toggle checked={Boolean(value)} onChange={onChange} label="Enabled" />
    case 'select':
      return (
        <Select id={id} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )
    case 'tags':
      return (
        <TagInput
          id={id}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          placeholder={field.placeholder}
        />
      )
    case 'icon':
      return (
        <IconPicker id={id} value={String(value ?? '')} onChange={onChange} placeholder={field.placeholder} />
      )
    case 'image':
      return (
        <ImageField
          id={id}
          value={String(value ?? '')}
          onChange={onChange}
          aspect={field.aspect ?? 'video'}
          placeholder={field.placeholder}
        />
      )
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={String(value ?? '#0e3b9c')}
            onChange={(event) => onChange(event.target.value)}
            className="size-10 cursor-pointer rounded-lg border border-primary-container/15 bg-clinical-white p-1"
          />
          <TextInput
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
            placeholder="#0e3b9c"
          />
        </div>
      )
    default:
      return (
        <TextInput
          id={id}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }
}
