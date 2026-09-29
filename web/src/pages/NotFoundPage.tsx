import { motion } from 'framer-motion'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EASE } from '@/lib/motion'
import { useI18n } from '@/i18n'

export function NotFoundPage() {
  const settings = useSiteSettings()
  const { t } = useI18n()
  useDocumentTitle(`${t('notFound.title')} — ${settings.siteName}`)

  return (
    <section className="relative w-full overflow-hidden bg-royal-gradient py-space-xl text-white">
      <div className="pointer-events-none absolute -top-32 -left-32 size-[34rem] rounded-full bg-secondary/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-[30rem] rounded-full bg-accent-gold/10 blur-[90px]" />

      <Container className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="font-display text-[6rem] leading-none font-bold text-white/15 md:text-[9rem]"
        >
          404
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="mt-2 font-display text-headline-lg-mobile font-semibold md:text-headline-lg"
        >
          {t('notFound.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
          className="mt-3 max-w-lg text-body-md text-white/80"
        >
          {t('notFound.body')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.26 }}
          className="mt-6 flex flex-wrap justify-center gap-space-sm"
        >
          <ButtonLink to="/" variant="gold" size="lg" icon="home">
            {t('notFound.back')}
          </ButtonLink>
          <ButtonLink to="/collections" variant="glass" size="lg" iconRight="arrow_forward">
            {t('notFound.browseCollections')}
          </ButtonLink>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-space-md text-label-md text-white/60"
        >
          <span className="flex items-center gap-2">
            <Icon name="phone" size={15} className="text-accent-gold" />
            {settings.phone || 'Contact the head office'}
          </span>
          <span className="flex items-center gap-2">
            <Icon name="mail" size={15} className="text-accent-gold" />
            {settings.email || 'info@albaik-group.com'}
          </span>
        </motion.div>
      </Container>
    </section>
  )
}
