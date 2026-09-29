import { useId } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

/**
 * The pill tab bar used by dashboard screens that host several groups of content (the
 * Home page, Menus & footer). The active pill carries a shared layout animation, and
 * each tab may show an icon. Tab switches are owned by the caller, so it can also
 * update the URL — see HomeContentPage for the deep-linkable variant.
 */
export function AdminTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { key: T; label: string; icon?: string }[]
  active: T
  onChange: (key: T) => void
}) {
  const id = useId()
  return (
    <div className="mb-space-lg flex flex-wrap items-center gap-1.5 rounded-full bg-surface-container-low p-1">
      {tabs.map((item) => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-full px-4 py-2.5 text-label-md font-semibold transition-colors duration-300',
              isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={`admin-tab-${id}`}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-surface-container-lowest shadow-sm"
              />
            ) : null}
            {item.icon ? <Icon name={item.icon} size={16} className="relative z-10" /> : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}