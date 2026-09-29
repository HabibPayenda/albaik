import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone, Send } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { subscribeNewsletter } from '@/store/uiSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'
import { BrandMark } from '@/components/ui/BrandMark'
import { SOCIAL_ICONS, type SocialKey } from '@/components/ui/BrandIcons'
import { Reveal } from '@/components/ui/Reveal'

export function Footer() {
  const settings = useSiteSettings()
  const groups = useAppSelector((state) => state.site.footer)
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const columns = groups.reduce<Record<string, typeof groups>>((acc, link) => {
    acc[link.group] = acc[link.group] ?? []
    acc[link.group].push(link)
    return acc
  }, {})

  // Only networks with a URL configured in Settings appear in the footer.
  const socials = (
    [
      { key: 'facebook', href: settings.facebook, label: 'Facebook' },
      { key: 'instagram', href: settings.instagram, label: 'Instagram' },
      { key: 'linkedin', href: settings.linkedin, label: 'LinkedIn' },
      { key: 'tiktok', href: settings.tiktok, label: 'TikTok' },
    ] as { key: SocialKey; href?: string; label: string }[]
  ).filter((s) => Boolean(s.href))

  const onSubscribe = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    await dispatch(subscribeNewsletter({ email: email.trim() }))
    setBusy(false)
    setEmail('')
  }

  return (
    <footer className="w-full border-t border-outline-variant/30 bg-surface-container-lowest pt-space-xl pb-space-lg shadow-[0_-1px_16px_rgba(11,25,56,0.04)]">
      <div className="mx-auto max-w-[1360px] px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 gap-gutter border-b border-surface-container-high/60 pb-space-xl lg:grid-cols-12">
          {/* ------------------------------------------------- brand + newsletter */}
          <Reveal className="flex flex-col gap-space-sm lg:col-span-5 lg:pr-space-xl">
            <Link to="/" className="flex flex-col gap-space-xs" aria-label={settings.siteName}>
              {/* Footer sits on surface-container-lowest (#ffffff), so the mark uses the
                  navy artwork — `tone="light"` means "light background, dark logo". The
                  full three-line lockup fits here, unlike the 72px header bar. */}
              <BrandMark tone="light" variant="full" className="h-16 w-auto" />
              <span className="text-label-sm font-semibold uppercase tracking-widest text-accent-gold-ink">
                {settings.tagline}
              </span>
            </Link>

            <p className="max-w-md text-body-md text-on-surface-variant">{settings.footerBlurb}</p>

            <div className="pt-space-xs">
              <span className="mb-2 block text-label-md font-semibold uppercase tracking-wider text-on-surface">
                {settings.newsletterTitle}
              </span>
              <form onSubmit={onSubscribe} className="flex max-w-md items-center gap-space-xs">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.enterEmail')}
                  aria-label={t('contact.emailAddress')}
                  className="flex-1 rounded-lg border border-outline-variant/50 bg-surface-container-low px-space-md py-2.5 text-body-sm text-on-surface transition-all placeholder:text-on-surface-variant/60 focus:border-secondary focus:bg-clinical-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-royal-gradient-compact px-space-md py-2.5 text-label-md font-semibold text-white shadow-md transition-all duration-300 hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Send size={15} />
                  )}
                  {t('footer.join')}
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-1.5 pt-space-xs text-body-sm text-on-surface-variant">
              {settings.address ? (
                <span className="inline-flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-secondary" />
                  {settings.address}
                </span>
              ) : null}
              {settings.phone ? (
                <a href={`tel:${settings.phone}`} className="inline-flex items-center gap-2 hover:text-secondary">
                  <Phone size={15} className="shrink-0 text-secondary" />
                  {settings.phone}
                </a>
              ) : null}
              {settings.email ? (
                <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 hover:text-secondary">
                  <Mail size={15} className="shrink-0 text-secondary" />
                  {settings.email}
                </a>
              ) : null}
            </div>
          </Reveal>

          {/* ------------------------------------------------------- link columns */}
          <div className="grid grid-cols-2 gap-gutter md:grid-cols-4 lg:col-span-7">
            {Object.entries(columns).map(([group, links], index) => (
              <Reveal key={group} delay={index * 0.06} className="flex flex-col gap-space-sm">
                <h3 className="text-label-md font-bold uppercase tracking-widest text-on-surface">{group}</h3>
                <ul className="flex flex-col gap-2">
                  {links.map((link) => (
                    <li key={link.id}>
                      <Link
                        to={link.path}
                        className="text-body-sm text-on-surface-variant transition-colors hover:text-secondary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------- bottom bar */}
        <div className="flex flex-col items-center justify-between gap-space-md pt-space-lg md:flex-row">
          <p className="text-center text-body-sm text-on-surface-variant md:text-left">
            {settings.copyright}
            {/* The dashboard is a staff tool, not a shopfront. It used to sit in the
                header beside the search icon, where it competed with the customer CTAs;
                a quiet footer link is the right weight for it. */}
            {/* `text-on-surface-variant` at full strength, not /70. At 70% it rendered
                #7c7d86 against the light footer — 4.09:1, under the 4.5:1 this needs.
                The note above still stands: a quiet link is the right weight for a staff
                entrance, but "quiet" cannot mean "unreadable". */}
            <Link
              to="/admin"
              className="ml-2 text-on-surface-variant underline-offset-2 transition-colors hover:text-secondary hover:underline"
            >
              {t('footer.staffLogin')}
            </Link>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-space-md">
            {socials.length ? (
              <div className="flex items-center gap-2">
                <span className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                  {t('footer.followUs')}
                </span>
                {socials.map((social) => {
                  const SocialGlyph = SOCIAL_ICONS[social.key]
                  return (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={social.label}
                      className="flex size-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-all duration-300 hover:bg-royal-gradient-compact hover:text-white"
                    >
                      <SocialGlyph size={15} />
                    </a>
                  )
                })}
              </div>
            ) : null}

            {settings.whatsapp ? (
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 px-3 py-1.5',
                  'text-label-md font-semibold text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary',
                )}
              >
                <Icon name="whatsapp" size={14} />
                {t('footer.whatsapp')}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  )
}
