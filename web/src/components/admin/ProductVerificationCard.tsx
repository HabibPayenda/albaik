import { useCallback, useEffect, useRef, useState } from 'react'
import { api, endpoints, errorMessage } from '@/lib/api'
import { AdminCard } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Feedback'
import { useAppDispatch } from '@/store/hooks'
import { pushToast } from '@/store/uiSlice'

interface VerificationInfo {
  ibn: string | null
  verificationCode: string
  verificationCodeDisplay: string
  verifyUrl: string
}

/**
 * The product's IBN and its printed QR code.
 *
 * The QR endpoints are authenticated, so the image cannot be a plain `<img src>` — the
 * browser would send no bearer token. The bytes are fetched with the API client instead
 * and turned into an object URL, which is also what the download buttons reuse.
 *
 * Replacing a code invalidates every label already printed for this product, so it asks
 * for the signed-in admin's password. That is the only guard between a mis-click and a
 * reprint of a production run.
 */
export function ProductVerificationCard({ productId, productName }: { productId: number; productName: string }) {
  const dispatch = useAppDispatch()
  // The loaded info carries its product id, so a switch to another product never shows
  // the previous product's code while the new one is loading.
  const [loaded, setLoaded] = useState<{ id: number; info: VerificationInfo } | null>(null)
  const info = loaded?.id === productId ? loaded.info : null
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const qrRef = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const loadQr = useCallback(async () => {
    const { data } = await api.get<Blob>(endpoints.admin.productQr(productId, 'png'), { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    if (qrRef.current) URL.revokeObjectURL(qrRef.current)
    qrRef.current = url
    setQrUrl(url)
  }, [productId])

  // Object URLs outlive the component unless revoked; do it once, on unmount.
  useEffect(
    () => () => {
      if (qrRef.current) URL.revokeObjectURL(qrRef.current)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    api
      .get<VerificationInfo>(endpoints.admin.productVerification(productId))
      .then(async ({ data }) => {
        if (cancelled) return
        setLoaded({ id: productId, info: data })
        await loadQr()
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(errorMessage(err))
      })

    return () => {
      cancelled = true
    }
  }, [productId, loadQr])

  const download = async (format: 'svg' | 'png') => {
    setBusy(true)
    try {
      const { data } = await api.get<Blob>(endpoints.admin.productQr(productId, format), { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${productName || 'product'}-qr.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      dispatch(pushToast({ tone: 'error', title: 'Could not download the QR code', description: errorMessage(err) }))
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post<VerificationInfo>(endpoints.admin.regenerateVerificationCode(productId), {
        password,
      })
      setLoaded({ id: productId, info: data })
      setConfirmOpen(false)
      setPassword('')
      await loadQr()
      dispatch(pushToast({ tone: 'success', title: 'New QR code generated', description: 'Labels printed with the old code will no longer verify.' }))
    } catch (err) {
      setError(errorMessage(err, 'The code could not be replaced.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard
      title="Verification QR code"
      description="Printed on the product. Scanning it opens a page that confirms the product is genuine, then continues to this product's page. The code is generated for this product alone and is not derived from the IBN."
      actions={
        <>
          <Button variant="ghost" size="sm" icon="download" onClick={() => void download('svg')} disabled={busy || !info}>
            SVG (print)
          </Button>
          <Button variant="ghost" size="sm" icon="download" onClick={() => void download('png')} disabled={busy || !info}>
            PNG
          </Button>
          <Button variant="outline" size="sm" icon="refresh" onClick={() => setConfirmOpen(true)} disabled={busy || !info}>
            Replace code
          </Button>
        </>
      }
    >
      {error ? (
        <p className="mb-space-sm rounded-lg bg-error-container/40 px-3 py-2 text-label-md text-error">{error}</p>
      ) : null}

      {/* The code is printed at a few centimetres, so it is shown large enough to check by
          eye: a phone camera needs it to fill a good part of the frame, and a thumbnail
          hides exactly the damage a bad print would cause. */}
      <div className="grid gap-space-md sm:grid-cols-[11rem_1fr] lg:grid-cols-[15rem_1fr]">
        <div className="mx-auto flex w-full max-w-[15rem] items-center justify-center rounded-xl border border-outline-variant/40 bg-white p-2 sm:mx-0">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR code for ${productName}`} className="aspect-square w-full" />
          ) : (
            <Skeleton className="aspect-square w-full" />
          )}
        </div>

        <div className="flex flex-col gap-space-sm">
          <Field
            label="Verification code"
            hint="What the QR carries. It is unguessable, and replacing it stops every label already printed with the old one from verifying."
          >
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-surface-container-high px-3 py-2 font-mono text-body-sm tracking-wider text-on-surface">
                {info?.verificationCodeDisplay ?? '…'}
              </code>
              <Button
                variant="ghost"
                size="sm"
                icon="copy"
                disabled={!info}
                onClick={() => {
                  if (!info) return
                  void navigator.clipboard?.writeText(info.verifyUrl)
                  dispatch(pushToast({ tone: 'success', title: 'Verification link copied' }))
                }}
              >
                Copy link
              </Button>
            </div>
          </Field>

          <Field
            label="Scanning opens"
            hint="Set the public site URL in Settings before printing — a QR generated without it points at whatever host the dashboard was opened on."
          >
            <TextInput value={info?.verifyUrl ?? ''} readOnly aria-label="Verification URL" />
          </Field>

          <p className="flex items-start gap-2 text-label-sm text-on-surface-variant">
            <Icon name="info" size={14} className="mt-0.5 shrink-0" />
            Only published products verify. If this product is hidden, its QR will say the code could not be verified.
          </p>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setPassword('')
        }}
        title="Replace the verification code?"
        description={`Every QR code already printed for “${productName}” will stop verifying. Enter your admin password to continue.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={!password} onClick={() => void regenerate()}>
              Replace code
            </Button>
          </>
        }
      >
        <Field label="Your password">
          <TextInput
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <p className="mt-2 text-label-md text-error">{error}</p> : null}
      </Modal>
    </AdminCard>
  )
}
