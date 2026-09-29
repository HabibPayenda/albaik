import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Icon } from './Icon'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-gradient-midnight/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-clinical-white shadow-e3 sm:rounded-3xl',
              widths[size],
              className,
            )}
          >
            {title ? (
              <header className="flex items-start justify-between gap-space-md border-b border-outline-variant/40 px-space-lg py-space-md">
                <div className="flex flex-col gap-0.5">
                  <h2 className="font-display text-headline-sm font-semibold text-on-surface">{title}</h2>
                  {description ? (
                    <p className="text-body-sm text-on-surface-variant">{description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </header>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-space-lg py-space-md">{children}</div>

            {footer ? (
              <footer className="flex flex-wrap items-center justify-end gap-space-sm border-t border-outline-variant/40 bg-surface-container-low/50 px-space-lg py-space-md">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}

/** Destructive-action confirmation with the brand's warning styling. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Delete',
  busy = false,
  tone = 'danger',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmLabel?: string
  busy?: boolean
  tone?: 'danger' | 'primary'
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={busy} icon={tone === 'danger' ? 'delete' : undefined}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-space-sm">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-error-container text-error' : 'bg-water-foam text-primary-container',
          )}
        >
          <Icon name={tone === 'danger' ? 'warning' : 'info'} size={20} />
        </span>
        <p className="text-body-md text-on-surface-variant">
          {description ?? 'This action cannot be undone.'}
        </p>
      </div>
    </Modal>
  )
}
