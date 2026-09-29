import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, endpoints, errorMessage } from '@/lib/api'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadMessages } from '@/store/adminSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { AdminCard, AdminPageHeader, StatTile } from '@/components/admin/AdminUI'
import { ButtonLink } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { cn, formatDate } from '@/lib/utils'
import type { AdminStats } from '@/lib/types'

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const settings = useSiteSettings()
  const user = useAppSelector((state) => state.auth.user)

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string>()

  useDocumentTitle(`Dashboard — ${settings.siteName}`)

  const load = () => {
    setError(undefined)
    api
      .get<AdminStats>(endpoints.admin.stats)
      .then(({ data }) => setStats(data))
      .catch((err) => setError(errorMessage(err)))
  }

  useEffect(() => {
    load()
    dispatch(loadMessages())
  }, [dispatch])

  if (error) {
    return (
      <>
        <AdminPageHeader title="Dashboard" />
        <ErrorState title="Could not load statistics" description={error} onRetry={load} />
      </>
    )
  }

  /*
   * Two of these are things the source document never supplied, and both are currently
   * visible to the public: the contact details are seeded guesses (the docx says
   * "[Insert official phone number]") and the Privacy/Terms pages hold placeholder copy.
   * Neither was on this list before, which is exactly how a placeholder reaches a live
   * site. `to` makes each item clickable so the fix is one click away.
   */
  const contactDigits = `${settings.phone} ${settings.whatsapp}`.replace(/[^\d]/g, '')
  const contactIsPlaceholder = !contactDigits || /0{3}/.test(contactDigits)

  const checklist: { label: string; done: boolean; to?: string }[] = [
    {
      label: contactIsPlaceholder
        ? `Replace the placeholder contact details (currently ${settings.phone || 'unset'})`
        : 'Contact details are real and confirmed',
      done: !contactIsPlaceholder,
      to: '/admin/settings',
    },
    {
      label: 'Replace the placeholder Privacy Policy and Terms of Use copy',
      done: false,
      to: '/admin/pages',
    },
    { label: 'Set real prices, or leave them as “on request”.', done: false, to: '/admin/products' },
    { label: 'Upload approved product photography.', done: false, to: '/admin/products' },
    { label: 'Publish genuine, attributable testimonials.', done: false, to: '/admin/home?tab=testimonials' },
    { label: 'Configure SMTP so enquiries reach your inbox.', done: false, to: '/admin/settings' },
    { label: 'Change the seeded admin password.', done: false, to: '/admin/settings' },
  ]

  return (
    <>
      <AdminPageHeader
        eyebrow={`Welcome back${user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}`}
        title="Dashboard"
        description="Manage the Albaik catalogue, website content and incoming enquiries."
        actions={
          <>
            <ButtonLink to="/admin/products/new" variant="primary" icon="add">
              New product
            </ButtonLink>
            <ButtonLink to="/" variant="outline" icon="visibility">
              View site
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Products"
          value={stats?.products ?? '—'}
          hint={stats ? `${stats.activeProducts} active · ${stats.featuredProducts} featured` : undefined}
          icon="product"
          accent="primary"
          to="/admin/products"
        />
        <StatTile
          label="Collections"
          value={stats?.categories ?? '—'}
          hint={stats ? `${stats.brands} brands` : undefined}
          icon="category"
          accent="secondary"
          delay={0.05}
          to="/admin/categories"
        />
        <StatTile
          label="Unread messages"
          value={stats?.unreadMessages ?? '—'}
          hint={stats ? `${stats.messages} total enquiries` : undefined}
          icon="mail"
          accent={stats && stats.unreadMessages > 0 ? 'gold' : 'teal'}
          delay={0.1}
          to="/admin/messages"
        />
        <StatTile
          label="Mailing list"
          value={stats?.subscribers ?? '—'}
          hint={stats ? `${stats.pages} content pages` : undefined}
          icon="users"
          accent="teal"
          delay={0.15}
        />
      </div>

      <div className="mt-space-lg grid grid-cols-1 gap-space-lg xl:grid-cols-3">
        <AdminCard
          title="Recent enquiries"
          description="The five most recent contact and wholesale submissions."
          className="xl:col-span-2"
          delay={0.1}
          actions={
            <ButtonLink to="/admin/messages" variant="subtle" size="sm" iconRight="arrow_forward">
              Open inbox
            </ButtonLink>
          }
          bodyClassName="p-0"
        >
          {stats?.recentMessages.length ? (
            <ul className="divide-y divide-outline-variant/30">
              {stats.recentMessages.map((message) => (
                <li key={message.id}>
                  <Link
                    to="/admin/messages"
                    className="flex items-start gap-space-sm px-space-md py-space-sm transition-colors hover:bg-surface-container-low"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-royal-gradient-compact text-label-md font-bold text-white">
                      {message.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-body-sm font-semibold text-on-surface">{message.name}</span>
                        <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                          {message.kind}
                        </span>
                        {!message.isRead ? (
                          <span className="rounded-full bg-accent-gold/20 px-2 py-0.5 text-label-sm font-bold text-accent-gold-ink">
                            New
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate text-body-sm text-on-surface-variant">{message.message}</span>
                      <span className="text-label-sm text-on-surface-variant/70">
                        {formatDate(message.createdAt, true)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-space-md py-space-xl text-center">
              <Icon name="mail" size={26} className="text-on-surface-variant" />
              <p className="text-body-sm text-on-surface-variant">
                No enquiries yet. Submissions from the contact form appear here.
              </p>
            </div>
          )}
        </AdminCard>

        <AdminCard title="Quick actions" delay={0.15}>
          <div className="flex flex-col gap-2">
            {[
              { to: '/admin/products/new', label: 'Add a product', icon: 'add' },
              { to: '/admin/home', label: 'Edit home page content', icon: 'home' },
              { to: '/admin/navigation', label: 'Manage menus & footer', icon: 'navigation' },
              { to: '/admin/home?tab=testimonials', label: 'Review testimonials', icon: 'star' },
              { to: '/admin/pages', label: 'Edit content pages', icon: 'page' },
              { to: '/admin/settings', label: 'Site settings & email', icon: 'settings' },
            ].map((action) => (
              <ButtonLink
                key={action.to}
                to={action.to}
                variant="ghost"
                icon={action.icon}
                className="justify-start border border-outline-variant/40"
              >
                {action.label}
              </ButtonLink>
            ))}
          </div>

          {/*
            The go-live list is computed wherever the data allows it. A fixed set of
            bullets never changes, so people stop reading it; an item that clears itself
            still means something. The contact check is derived from the settings map,
            so it disappears the moment real numbers are saved.

            The seeded contact values are guesses the seeder had to make: the source
            document leaves them as "[Insert official phone number]". A run of zeros is
            the tell, and it is unambiguous.
          */}
          <div className="mt-space-md rounded-xl border-l-[3px] border-accent-gold bg-surface-container-low p-space-sm">
            <p className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
              Before going live
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5 text-body-sm">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-[7px] size-1.5 shrink-0 rounded-full',
                      item.done ? 'bg-success' : 'bg-warning',
                    )}
                  />
                  {item.to ? (
                    <Link
                      to={item.to}
                      className={cn(
                        'transition-colors hover:underline',
                        item.done
                          ? 'text-on-surface-variant/60 line-through'
                          : 'text-on-surface-variant',
                      )}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        item.done
                          ? 'text-on-surface-variant/60 line-through'
                          : 'text-on-surface-variant',
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-label-sm font-semibold text-on-surface-variant/80">
              {checklist.every((item) => item.done)
                ? 'Everything on this list is done.'
                : `${checklist.filter((item) => !item.done).length} of ${checklist.length} still need attention.`}
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  )
}
