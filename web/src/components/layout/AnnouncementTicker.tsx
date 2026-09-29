import { motion } from 'framer-motion'
import { BadgeCheck, Image as ImageIcon } from 'lucide-react'
import { useSiteSettings } from '@/hooks/useSiteSettings'

/**
 * The luxury announcement strip. In the source mockup this sat in normal document
 * flow beneath a fixed header (so it was never visible); here it lives inside the
 * fixed header stack, which is clearly the intent, and the message marquees on
 * narrow viewports where the side badges have to drop out.
 */
export function AnnouncementTicker() {
  const settings = useSiteSettings()
  if (!settings.tickerEnabled || !settings.tickerText) return null

  return (
    <aside
      aria-label="Announcement"
      className="w-full overflow-hidden border-b border-white/10 bg-gradient-to-r from-[#050d24] via-[#0e3b9c] to-[#050d24] text-white"
    >
      <div className="mx-auto flex h-9 max-w-[1360px] items-center justify-between gap-space-md px-margin-mobile md:px-margin">
        {settings.tickerLeft ? (
          <span className="hidden shrink-0 items-center gap-2 text-label-md font-semibold uppercase tracking-widest text-accent-gold md:inline-flex">
            <BadgeCheck size={15} />
            {settings.tickerLeft}
          </span>
        ) : null}

        <div className="relative flex-1 overflow-hidden">
          <div className="mask-fade-x hidden justify-center md:flex">
            <p className="truncate text-center text-label-md tracking-wide text-white/95">
              {settings.tickerText}
            </p>
          </div>

          {/* Marquee on small screens so long copy still reads */}
          <div className="mask-fade-x flex md:hidden">
            <motion.div
              className="flex shrink-0 items-center gap-8 whitespace-nowrap text-label-md tracking-wide text-white/95"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
            >
              <span>{settings.tickerText}</span>
              <span aria-hidden="true">{settings.tickerText}</span>
            </motion.div>
          </div>
        </div>

        {settings.tickerRight ? (
          <span className="hidden shrink-0 items-center gap-1.5 text-label-md font-semibold text-tertiary-fixed lg:inline-flex">
            <ImageIcon size={14} />
            {settings.tickerRight}
          </span>
        ) : null}
      </div>
    </aside>
  )
}
