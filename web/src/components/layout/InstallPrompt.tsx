import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { EASE } from '@/lib/motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'albaik.pwa.dismissed'

/**
 * Offers to install the PWA once the browser fires `beforeinstallprompt`.
 * Dismissal is remembered so the banner never nags.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      // Let the page settle before sliding the banner in.
      setTimeout(() => setVisible(true), 4000)
    }

    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && deferred ? (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed inset-x-4 bottom-4 z-[75] mx-auto flex max-w-md items-center gap-space-sm rounded-2xl border border-white/15 bg-royal-gradient p-space-sm text-white shadow-e3 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:mx-0"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-gold">
            <Download size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label-lg font-bold">Install the Albaik app</p>
            <p className="text-body-sm text-white/75">
              Add it to your home screen for offline access to the full catalogue.
            </p>
          </div>
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-lg bg-gold-gradient px-3.5 py-2 text-label-md font-bold text-gradient-midnight"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
