import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  KeyRound,
  Languages,
  Loader2,
  Mail,
  Megaphone,
  PanelBottom,
  Save,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react'

import { AdminCard, AdminPageHeader } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Badge'
import { Field, TextArea, TextInput, Toggle } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { SearchSuggestionsEditor } from '@/components/admin/SearchSuggestionsEditor'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadSettings, saveSettings } from '@/store/adminSlice'
import { pushToast } from '@/store/uiSlice'
import { api, endpoints, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import { SEARCH_SUGGESTIONS_KEY } from '@/lib/searchSuggestions'
import type { SiteSetting } from '@/lib/types'

/* ------------------------------------------------------------------ groups */

interface GroupDef {
  key: string
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  blurb: string
  /** Settings keys that read better as a long-form control regardless of inputType. */
  longKeys?: string[]
}

const GROUPS: GroupDef[] = [
  {
    key: 'general',
    label: 'Identity',
    icon: Building2,
    blurb: 'The company name, tagline and meta description used across the site and in search results.',
    // Only keys whose input type is not already multiline need listing here —
    // `site.heroNote` used to be here and no longer exists (it was speculative
    // mockup copy, removed as a source-of-truth violation).
    longKeys: ['site.description'],
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: Mail,
    blurb: 'How customers reach you. These values feed the footer, the contact page and every email we send.',
    longKeys: ['contact.address'],
  },
  { key: 'social', label: 'Social', icon: Share2, blurb: 'Leave a field empty to hide that network from the footer.' },
  {
    key: 'catalog',
    label: 'Catalogue',
    icon: ShoppingBag,
    blurb: 'How products are priced and displayed in the collection pages.',
  },
  {
    key: 'ticker',
    label: 'Announcement bar',
    icon: Megaphone,
    blurb: 'The thin strip pinned beneath the header. Great for launches, offers and notices.',
  },
  { key: 'footer', label: 'Footer', icon: PanelBottom, blurb: 'The closing block of every page.' },
  {
    key: 'search',
    label: 'Search',
    icon: Search,
    blurb: 'What the search overlay suggests when the field is empty. These behave like shortcuts into results, not like SEO copy.',
  },
  {
    key: 'labels',
    label: 'Labels',
    icon: Languages,
    blurb: 'Customer-facing copy — the product tab labels, the "All formulas" filter chip and the contact-form labels. Leave a field empty to restore its built-in text.',
  },
]

/** Input types the seeder may emit that we should render as a long-form control. */
const MULTILINE = new Set(['textarea'])

/* ------------------------------------------------------------------ helpers */

function isTrue(value: string | null | undefined) {
  return value === 'true' || value === '1' || value === 'yes'
}

/* ------------------------------------------------------------------ page */

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const { items, status } = useAppSelector((s) => s.admin.settings)

  const [active, setActive] = useState<string>('general')
  /** Local, unsaved edits keyed by setting key. */
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatch(loadSettings())
  }, [dispatch])

  const settings = items as SiteSetting[]

  // Group the rows the API returned, preserving the seeder's sort order.
  const byGroup = useMemo(() => {
    const map: Record<string, SiteSetting[]> = {}
    for (const row of settings) {
      const g = row.group || 'general'
      ;(map[g] ??= []).push(row)
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.sortOrder - b.sortOrder)
    return map
  }, [settings])

  // Any group present in the data but not in our tab list still gets a tab.
  const tabs = useMemo(() => {
    const known = GROUPS.filter((g) => byGroup[g.key]?.length)
    const extras = Object.keys(byGroup)
      .filter((k) => !GROUPS.some((g) => g.key === k))
      .map<GroupDef>((k) => ({
        key: k,
        label: k.charAt(0).toUpperCase() + k.slice(1),
        icon: SlidersHorizontal,
        blurb: 'Additional settings.',
      }))
    return [...known, ...extras]
  }, [byGroup])

  // If the active tab vanished (e.g. after a reload) fall back to the first one.
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.key === active)) setActive(tabs[0].key)
  }, [tabs, active])

  const valueOf = useCallback(
    (row: SiteSetting) => (row.key in draft ? draft[row.key] : (row.value ?? '')),
    [draft],
  )

  const set = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const dirtyKeys = useMemo(
    () =>
      Object.keys(draft).filter((key) => {
        const row = settings.find((s) => s.key === key)
        return row && (row.value ?? '') !== draft[key]
      }),
    [draft, settings],
  )

  const activeGroup = tabs.find((t) => t.key === active)
  const rows = byGroup[active] ?? []
  const dirtyInTab = dirtyKeys.filter((k) => rows.some((r) => r.key === k)).length

  const reset = () => {
    setDraft((prev) => {
      const next = { ...prev }
      for (const row of rows) delete next[row.key]
      return next
    })
  }

  /** Save every group — the endpoint is a bulk upsert, so one call covers all tabs. */
  const saveAll = async () => {
    if (!dirtyKeys.length) return
    setSaving(true)
    try {
      const payload = dirtyKeys.map((key) => {
        const row = settings.find((s) => s.key === key)!
        return {
          key,
          value: draft[key] === '' ? null : draft[key],
          group: row.group,
          label: row.label,
          inputType: row.inputType,
        }
      })
      await dispatch(saveSettings({ settings: payload })).unwrap()
      setDraft({})
      dispatch(
        pushToast({
          tone: 'success',
          title: 'Settings saved',
          description: `${payload.length} change${payload.length === 1 ? '' : 's'} published to the live site.`,
        }),
      )
    } catch (error) {
      dispatch(
        pushToast({
          tone: 'error',
          title: 'Could not save settings',
          description: typeof error === 'string' ? error : 'Please try again.',
        }),
      )
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' && !settings.length) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="pb-space-xl">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Site settings"
        description="Every field here is live: saving republishes the value across the public site immediately."
        actions={
          <>
            <Button variant="ghost" onClick={reset} disabled={!dirtyInTab || saving}>
              Discard
            </Button>
            <Button
              variant="primary"
              icon={saving ? Loader2 : Save}
              loading={saving}
              disabled={!dirtyKeys.length}
              onClick={saveAll}
            >
              {dirtyKeys.length ? `Save ${dirtyKeys.length} change${dirtyKeys.length === 1 ? '' : 's'}` : 'Saved'}
            </Button>
          </>
        }
      />

      {/* tab rail */}
      <div className="no-scrollbar -mx-1 mb-space-md flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => {
          const TabIcon = tab.icon
          const isActive = tab.key === active
          const count = dirtyKeys.filter((k) => (byGroup[tab.key] ?? []).some((r) => r.key === k)).length
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                'relative flex shrink-0 items-center gap-2 rounded-full px-space-md py-2.5 text-label-md font-semibold transition-colors duration-200',
                isActive
                  ? 'text-white'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-0 rounded-full bg-royal-gradient-compact shadow-e1"
                  transition={{ duration: 0.35, ease: EASE }}
                />
              ) : null}
              <span className="relative flex items-center gap-2">
                <TabIcon size={16} />
                {tab.label}
                {count ? (
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                      isActive ? 'bg-accent-gold text-accent-gold-deep' : 'bg-accent-gold/20 text-accent-gold-ink',
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      {activeGroup ? (
        <motion.p
          key={activeGroup.key}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mb-space-md max-w-3xl text-body-sm text-on-surface-variant"
        >
          {activeGroup.blurb}
        </motion.p>
      ) : null}

      <div className="grid gap-space-md xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ---------------------------------------------------------- fields */}
        <AdminCard
          key={active}
          title={activeGroup?.label}
          description={`${rows.length} field${rows.length === 1 ? '' : 's'}`}
        >
          <div className="grid gap-space-md md:grid-cols-2">
            {rows.map((row, index) => {
              const long = MULTILINE.has(row.inputType) || activeGroup?.longKeys?.includes(row.key)
              const value = valueOf(row)
              const isDirty = dirtyKeys.includes(row.key)
              // Setting keys are dotted (`ticker.text`), which is not a legal CSS
              // selector, so flatten them into a slug for the input's id.
              const id = `setting-${row.key.replace(/[^a-zA-Z0-9]+/g, '-')}`

              if (row.inputType === 'bool') {
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: Math.min(index * 0.03, 0.3) }}
                    className="flex items-center justify-between gap-space-sm rounded-xl border border-outline-variant/40 bg-surface-container-low/40 px-space-md py-space-sm md:col-span-2"
                  >
                    <Toggle
                      checked={isTrue(value)}
                      onChange={(next) => set(row.key, next ? 'true' : 'false')}
                      label={row.label || row.key}
                      description={
                        row.key === 'catalog.showPrices'
                          ? 'Turn off to hide prices everywhere and show the fallback label instead.'
                          : row.key === 'ticker.enabled'
                            ? 'Hides the strip entirely when off.'
                            : undefined
                      }
                    />
                    {isDirty ? (
                      <Chip accent="gold" className="shrink-0">
                        Unsaved
                      </Chip>
                    ) : null}
                  </motion.div>
                )
              }

              if (row.inputType === 'json' && row.key === SEARCH_SUGGESTIONS_KEY) {
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: Math.min(index * 0.03, 0.3) }}
                    className="md:col-span-2"
                  >
                    <Field
                      label={row.label || row.key}
                      hint={
                        isDirty
                          ? 'Saved when you hit Save. Until then the live site keeps showing the current chips.'
                          : undefined
                      }
                    >
                      <SearchSuggestionsEditor value={value} onChange={(next) => set(row.key, next)} />
                    </Field>
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={row.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE, delay: Math.min(index * 0.03, 0.3) }}
                  className={cn(long && 'md:col-span-2')}
                >
                  <Field
                    label={row.label || row.key}
                    htmlFor={id}
                    hint={
                      row.key === 'contact.email'
                        ? 'This is the address shown publicly. Notifications are sent to the address in the mail server settings below.'
                        : row.key === 'contact.mapEmbed'
                          ? 'Paste the src URL from Google Maps → Share → Embed a map, or the whole embed code — either works.'
                          : row.key === 'catalog.priceOnRequest'
                            ? 'Shown in place of a price when a product has none set.'
                            : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        {long ? (
                          <TextArea
                            id={id}
                            rows={row.key === 'site.description' ? 3 : 4}
                            value={value}
                            onChange={(e) => set(row.key, e.target.value)}
                          />
                        ) : (
                          <TextInput
                            id={id}
                            type={row.inputType === 'url' ? 'url' : 'text'}
                            value={value}
                            placeholder={row.inputType === 'url' ? 'https://…' : undefined}
                            onChange={(e) => set(row.key, e.target.value)}
                          />
                        )}
                      </div>
                      {isDirty ? <span className="size-2 shrink-0 rounded-full bg-accent-gold" title="Unsaved" /> : null}
                    </div>
                  </Field>
                </motion.div>
              )
            })}
          </div>
        </AdminCard>

        {/* ---------------------------------------------------------- sidebar */}
        <div className="flex flex-col gap-space-md">
          <EmailStatusCard />
          <SecurityCard />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ email status */

interface EmailStatus {
  configured: boolean
  host?: string | null
  port: string
  fromAddress: string
  notifyAddress?: string | null
  problems: string[]
}

/**
 * The contact form always stores the enquiry, but outbound mail needs SMTP credentials.
 * This card tells the operator the truth about what will actually send.
 */
function EmailStatusCard() {
  const [state, setState] = useState<{ loading: boolean; data?: EmailStatus; error?: string }>({ loading: true })

  useEffect(() => {
    let alive = true
    api
      .get<EmailStatus>(endpoints.admin.emailStatus)
      .then(({ data }) => alive && setState({ loading: false, data }))
      .catch((error) => alive && setState({ loading: false, error: errorMessage(error, 'Could not read mail status.') }))
    return () => {
      alive = false
    }
  }, [])

  const data = state.data

  return (
    <AdminCard title="Contact email delivery" description="Outbound mail server">
      {state.loading ? (
        <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Loader2 size={14} className="animate-spin" /> Checking…
        </div>
      ) : state.error ? (
        <p className="text-body-sm text-error">{state.error}</p>
      ) : (
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                data?.configured ? 'bg-success-container text-success' : 'bg-warning-container text-warning',
              )}
            >
              {data?.configured ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-on-surface">
                {data?.configured ? 'Mail is configured' : 'Mail is not configured yet'}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                {data?.configured
                  ? `Sending through ${data.host}:${data.port}.`
                  : 'Enquiries are still saved to the inbox below, but no notification email is sent.'}
              </p>
            </div>
          </div>

          {data?.configured ? (
            <dl className="flex flex-col gap-1.5 rounded-xl bg-surface-container-low/60 p-space-sm text-body-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">From</dt>
                <dd className="truncate font-medium text-on-surface">{data.fromAddress}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">Notifies</dt>
                <dd className="truncate font-medium text-on-surface">{data.notifyAddress ?? '—'}</dd>
              </div>
            </dl>
          ) : (
            <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-space-sm">
              <p className="mb-1.5 text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                To enable, set these in <code className="font-mono normal-case">api/appsettings.json</code>
              </p>
              <ul className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
                {(data?.problems?.length
                  ? data.problems
                  : ['Smtp:Host is not set.', 'Smtp:Username is not set.']
                ).map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-on-surface-variant" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </AdminCard>
  )
}

/* ------------------------------------------------------------------ security */

function SecurityCard() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && !busy

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(undefined)
    try {
      await api.post(endpoints.changePassword, { currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      dispatch(
        pushToast({
          tone: 'success',
          title: 'Password updated',
          description: 'Use the new password the next time you sign in.',
        }),
      )
    } catch (err) {
      const message = errorMessage(err, 'Could not change the password.')
      setError(message)
      dispatch(pushToast({ tone: 'error', title: 'Password not changed', description: message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard
      title="Security"
      description={user ? `Signed in as ${user.username}` : 'Change your password'}
      actions={<Icon name="lock" size={16} className="text-on-surface-variant" />}
    >
      <form onSubmit={submit} className="flex flex-col gap-space-sm">
        <Field label="Current password" htmlFor="pw-current" required>
          <TextInput
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>

        <Field
          label="New password"
          htmlFor="pw-new"
          required
          error={tooShort ? 'Use at least 8 characters.' : undefined}
          hint="At least 8 characters."
        >
          <TextInput
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="pw-confirm"
          required
          error={mismatch ? 'The two passwords do not match.' : undefined}
        >
          <TextInput
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        {error ? <p className="text-body-sm text-error">{error}</p> : null}

        <Button
          type="submit"
          variant="outline"
          icon={busy ? Loader2 : KeyRound}
          loading={busy}
          disabled={!canSubmit}
          block
        >
          Update password
        </Button>

        <p className="flex items-start gap-2 text-body-sm text-on-surface-variant/80">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          The seeded account uses the default password until you change it. Do this before the site goes live.
        </p>
      </form>
    </AdminCard>
  )
}
