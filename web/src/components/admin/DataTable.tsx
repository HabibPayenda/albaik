import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import { Icon } from '@/components/ui/Icon'
import { TableEmpty } from '@/components/ui/Feedback'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

export interface RowAction<T> {
  icon: string
  label: string
  onClick: (row: T) => void
  tone?: 'default' | 'danger' | 'primary'
}

export function DataTable<T extends { id: number }>({
  columns,
  rows,
  loading,
  emptyMessage = 'Nothing here yet.',
  actions,
  onRowClick,
  onMoveRow,
}: {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  emptyMessage?: string
  actions?: RowAction<T>[]
  onRowClick?: (row: T) => void
  /** Renders the up/down reorder control when the collection is reorderable. */
  onMoveRow?: (row: T, direction: -1 | 1) => void
}) {
  const alignClass = (align?: Column<T>['align']) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  const hasActions = Boolean(actions?.length || onMoveRow)
  const colSpan = columns.length + (hasActions ? 1 : 0)

  return (
    <div className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-outline-variant/50">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-space-sm py-2.5 text-label-md font-bold uppercase tracking-wider text-on-surface-variant',
                  alignClass(column.align),
                  column.className,
                )}
              >
                {column.label}
              </th>
            ))}
            {hasActions ? (
              <th scope="col" className="w-px px-space-sm py-2.5 text-right text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="border-b border-outline-variant/30">
                {columns.map((column) => (
                  <td key={column.key} className="px-space-sm py-3">
                    <div className="skeleton h-4 w-full max-w-[12rem]" />
                  </td>
                ))}
                {hasActions ? (
                  <td className="px-space-sm py-3">
                    <div className="skeleton ml-auto h-4 w-16" />
                  </td>
                ) : null}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <TableEmpty colSpan={colSpan} message={emptyMessage} />
          ) : (
            <AnimatePresence initial={false}>
              {rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE, delay: Math.min(index, 10) * 0.02 }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-outline-variant/30 transition-colors last:border-0 hover:bg-surface-container-low/60',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-space-sm py-3 align-middle text-body-sm text-on-surface', alignClass(column.align), column.className)}
                    >
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[column.key] ?? '—')}
                    </td>
                  ))}

                  {hasActions ? (
                    <td className="px-space-sm py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onMoveRow ? (
                          <>
                            <button
                              type="button"
                              title="Move up"
                              aria-label="Move up"
                              disabled={index === 0}
                              onClick={(event) => {
                                event.stopPropagation()
                                onMoveRow(row, -1)
                              }}
                              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface disabled:opacity-30"
                            >
                              <Icon name="arrow_upward" size={16} />
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              aria-label="Move down"
                              disabled={index === rows.length - 1}
                              onClick={(event) => {
                                event.stopPropagation()
                                onMoveRow(row, 1)
                              }}
                              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface disabled:opacity-30"
                            >
                              <Icon name="arrow_downward" size={16} />
                            </button>
                          </>
                        ) : null}

                        {actions?.map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            title={action.label}
                            aria-label={action.label}
                            onClick={(event) => {
                              event.stopPropagation()
                              action.onClick(row)
                            }}
                            className={cn(
                              'rounded-lg p-2 transition-colors',
                              action.tone === 'danger'
                                ? 'text-on-surface-variant hover:bg-error-container hover:text-error'
                                : action.tone === 'primary'
                                  ? 'text-primary-container hover:bg-water-foam'
                                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                            )}
                          >
                            <Icon name={action.icon} size={16} />
                          </button>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </motion.tr>
              ))}
            </AnimatePresence>
          )}
        </tbody>
      </table>
    </div>
  )
}
