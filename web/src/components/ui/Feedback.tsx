import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { dismissToast } from '@/store/uiSlice'
import { cn } from '@/lib/utils'
import { Button, ButtonLink } from './Button'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ toasts */

const TONE = {
  success: { icon: CheckCircle2, ring: 'text-marine', bar: 'bg-marine' },
  error: { icon: AlertTriangle, ring: 'text-error', bar: 'bg-error' },
  info: { icon: Info, ring: 'text-secondary', bar: 'bg-secondary' },
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.ui.toasts)
  const dispatch = useAppDispatch()

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      role="region"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE[toast.tone]
          const Glyph = tone.icon
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border border-white/15 bg-royal-gradient p-space-md text-white shadow-e3"
            >
              <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} />
              <div className="flex items-start gap-space-sm pl-2">
                <Glyph size={20} className={cn('mt-0.5 shrink-0', tone.ring)} />
                <div className="min-w-0 flex-1">
                  <p className="text-label-lg font-bold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-body-sm text-white/80">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(dismissToast(toast.id))}
                  className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </div>
              <ToastTimer id={toast.id} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function ToastTimer({ id }: { id: string }) {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(id)), 5200)
    return () => clearTimeout(timer)
  }, [id, dispatch])
  return null
}

/* ---------------------------------------------------------------- loading */

export function Spinner({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container',
        className,
      )}
      style={{ width: size, height: size }}
    />
  )
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-space-sm">
      <Spinner size={30} />
      <p className="text-label-md uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

/* ------------------------------------------------------------ empty/error */

export function EmptyState({
  icon = 'info',
  title,
  description,
  actionLabel,
  onAction,
  to,
  className,
}: {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  to?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-space-sm rounded-3xl border border-dashed border-outline-variant bg-surface-container-lowest/60 px-space-lg py-space-xl text-center',
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-container-low text-primary-container">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="font-display text-headline-sm font-semibold text-on-surface">{title}</h3>
      {description ? (
        <p className="max-w-md text-body-sm text-on-surface-variant">{description}</p>
      ) : null}
      {actionLabel && (onAction || to) ? (
        <div className="pt-space-xs">
          {to ? (
            <ButtonLink variant="primary" iconRight="arrow_forward" to={to}>
              {actionLabel}
            </ButtonLink>
          ) : (
            <Button variant="primary" iconRight="arrow_forward" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
  level = 1,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  /**
   * Heading level. `1` for every current usage — an ErrorState replaces the whole page,
   * so it *is* the page's heading, and rendering it as an `<h3>` left those pages with
   * no `<h1>` at all. Pass `3` if it is ever used inline inside a page that already has
   * a heading.
   */
  level?: 1 | 3
}) {
  const Heading = (level === 1 ? 'h1' : 'h3') as 'h1' | 'h3'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-space-sm rounded-2xl border border-error-container bg-error-container/40 px-space-lg py-space-lg text-center',
        className,
      )}
    >
      <AlertTriangle size={26} className="text-error" />
      <Heading className="font-display text-headline-sm font-semibold text-on-surface">
        {title}
      </Heading>
      {description ? <p className="max-w-md text-body-sm text-on-surface-variant">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

/** Inline empty row used inside dashboard tables. */
export function TableEmpty({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-space-md py-space-xl text-center text-body-sm text-on-surface-variant">
        {message}
      </td>
    </tr>
  )
}
