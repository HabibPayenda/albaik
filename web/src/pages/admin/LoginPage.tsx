import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BrandMark } from '@/components/ui/BrandMark'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { login } from '@/store/authSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Field, TextInput } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EASE } from '@/lib/motion'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useSiteSettings()
  const { token, status, error } = useAppSelector((state) => state.auth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useDocumentTitle(`Sign in — ${settings.siteName}`)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  useEffect(() => {
    if (token) navigate(from, { replace: true })
  }, [token, navigate, from])

  if (token) return <Navigate to={from} replace />

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = await dispatch(login({ username, password }))
    if (login.fulfilled.match(result)) navigate(from, { replace: true })
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-royal-gradient px-4 py-space-xl">
      <div className="pointer-events-none absolute -top-32 -left-32 size-[34rem] rounded-full bg-secondary/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-[30rem] rounded-full bg-accent-gold/12 blur-[90px]" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-clinical-white shadow-e3"
      >
        <div className="flex flex-col items-center gap-2 bg-royal-gradient px-space-lg py-space-lg text-center text-white">
          <BrandMark
            tone="dark"
            variant="lockup"
            alt={settings.siteName}
            priority
            className="h-10 w-auto"
          />
          <p className="-mt-1 text-label-sm font-semibold uppercase tracking-[0.25em] text-accent-gold">
            Content Dashboard
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-space-md p-space-lg">
          <p className="text-body-sm text-on-surface-variant">
            Sign in to manage products, collections, pages and enquiries.
          </p>

          <Field label="Username" required htmlFor="login-username">
            <TextInput
              id="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              required
              placeholder="admin"
            />
          </Field>

          <Field label="Password" required htmlFor="login-password">
            <TextInput
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </Field>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-error-container bg-error-container/50 p-space-sm">
              <Icon name="error" size={16} className="mt-0.5 shrink-0 text-error" />
              <p className="text-body-sm text-on-error-container">{error}</p>
            </div>
          ) : null}

          <Button type="submit" variant="primary" size="lg" icon="lock" loading={status === 'loading'} block>
            Sign in
          </Button>

          <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-space-sm">
            <p className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
              Seeded credentials
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Username <code className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-on-surface">admin</code>{' '}
              · Password{' '}
              <code className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-on-surface">Albaik@2026</code>
            </p>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              Change this from Settings → Security after your first sign-in.
            </p>
          </div>

          {/*
            `min-h-6` is not decoration: with no vertical padding this link's box was
            only as tall as its line-height (16px), which is under the 24x24 CSS px
            minimum in WCAG 2.2 SC 2.5.8. It is the only interactive control on the
            screen with no other way to reach it.
          */}
          <Link
            to="/"
            className="inline-flex min-h-6 items-center justify-center gap-1.5 text-label-md font-semibold text-secondary transition-colors hover:text-primary"
          >
            <Icon name="arrow_back" size={14} />
            Back to the website
          </Link>
        </form>
      </motion.div>
    </div>
  )
}
