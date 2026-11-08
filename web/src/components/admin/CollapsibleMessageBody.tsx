import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { splitQuotedText } from '@/lib/emailText'
import { cn } from '@/lib/utils'

/**
 * The new part of an email first, with the previous thread behind a deliberate
 * "Show quoted text" action. Long customer replies and Outlook/Gmail quote blocks
 * otherwise dominate the conversation and bury the actual message.
 */
export function CollapsibleMessageBody({ text, className }: { text: string; className?: string }) {
  const { main, quoted } = useMemo(() => splitQuotedText(text), [text])
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn('text-body-md leading-relaxed text-on-surface', className)}>
      <p className="whitespace-pre-wrap break-words">{main}</p>

      {quoted ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg text-label-md font-semibold text-secondary transition-colors hover:text-secondary/75 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Icon
              name="expand_more"
              size={15}
              className={cn('transition-transform duration-200', expanded && 'rotate-180')}
            />
            {expanded ? 'Hide quoted text' : 'Show quoted text'}
          </button>

          {expanded ? (
            <div className="mt-3 rounded-xl border-l-2 border-outline-variant/60 bg-surface-container-low/70 px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-body-sm leading-relaxed text-on-surface-variant/85">
                {quoted}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
