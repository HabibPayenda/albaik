import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, endpoints, errorMessage } from '@/lib/api'
import type { VerifyProduct } from '@/lib/types'
import { useDocumentHead, useSiteMeta } from '@/hooks/useDocumentHead'
import { verifyHead } from '@/lib/seo'
import { ButtonLink } from '@/components/ui/Button'
import { StatusPage } from '@/components/ui/StatusPage'
import { ProductImage } from '@/components/ui/ProductImage'
import { useI18n } from '@/i18n'

/** How long the confirmation stays on screen before continuing to the product. */
const HOLD_SECONDS = 5

/**
 * The page a scanned product QR code opens.
 *
 * A scan is a stranger on a phone with no context: they pointed a camera at a bottle and
 * something opened. So the page answers three questions in order — is this real, what is
 * it, and where do I go next — and then gets out of the way after five seconds.
 *
 * The confirmation is a lookup, not a claim: the code is matched against a published
 * product. An unknown code, or one belonging to a product we no longer publish, gets the
 * honest answer rather than a green tick (docs/adr/0008-verification-code-is-stored-not-derived.md).
 */
export function VerifyPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const site = useSiteMeta()
  const { t } = useI18n()

  // The result carries the code it belongs to, so a second scan that reuses this
  // component never shows the previous product while the new lookup is in flight.
  const [result, setResult] = useState<{ code: string; product?: VerifyProduct; failed?: string } | null>(null)
  const [seconds, setSeconds] = useState(HOLD_SECONDS)

  const product = result?.code === code ? (result.product ?? null) : null
  const failed = result?.code === code ? (result.failed ?? null) : null

  const head = useMemo(() => verifyHead(site), [site])
  useDocumentHead(head)

  // One request per scanned code. The response is either the product or a 404, so a
  // failed lookup is an answer rather than a retryable error.
  useEffect(() => {
    let cancelled = false

    api
      .get<VerifyProduct>(endpoints.verify(code))
      .then(({ data }) => {
        if (cancelled) return
        setResult({ code, product: data })
        setSeconds(HOLD_SECONDS)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setResult({ code, failed: errorMessage(error, t('verify.notFoundBody')) })
      })

    return () => {
      cancelled = true
    }
  }, [code, t])

  // Count down once the product is known. The timer runs even under reduced motion — it
  // is the page's behaviour, not an animation; only the ring is suppressed.
  useEffect(() => {
    if (!product) return
    if (seconds <= 0) {
      navigate(`/products/${product.slug}`, { replace: true })
      return
    }
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [product, seconds, navigate])

  if (failed) {
    return (
      <StatusPage
        icon="warning"
        title={t('verify.notFoundTitle')}
        body={t('verify.notFoundBody')}
        actions={
          <>
            <ButtonLink to="/" variant="gold" size="lg" icon="home">
              {t('verify.backHome')}
            </ButtonLink>
            <ButtonLink to="/collections" variant="glass" size="lg" iconRight="arrow_forward">
              {t('notFound.browseCollections')}
            </ButtonLink>
          </>
        }
      >
        <p className="text-center text-body-sm text-white/50">{failed}</p>
      </StatusPage>
    )
  }

  if (!product) {
    return (
      <StatusPage
        icon="verified_user"
        title={t('verify.searching')}
        body={t('verify.searchingBody')}
        contact={false}
      />
    )
  }

  return (
    <StatusPage
      icon="verified_user"
      eyebrow={t('verify.eyebrow')}
      title={t('verify.title')}
      body={t('verify.body')}
      contact={false}
      actions={
        <ButtonLink to={`/products/${product.slug}`} variant="gold" size="lg" iconRight="arrow_forward">
          {t('verify.continue')}
        </ButtonLink>
      }
    >
      {/* Naming the product is the point of the screen: a customer who scanned shampoo
          and reads "toothpaste" has learned something the tick alone could not tell them. */}
      <div
        role="status"
        aria-live="polite"
        className="mx-auto flex w-full max-w-md items-center gap-space-sm rounded-2xl border border-white/20 bg-white/10 p-space-sm text-left backdrop-blur-md"
      >
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
          <ProductImage src={product.imageUrl} alt={product.name} name={product.name} className="size-full" />
        </div>
        <div className="min-w-0">
          {product.brandName ? (
            <p className="text-label-sm font-bold uppercase tracking-wider text-accent-gold">
              {product.brandName}
            </p>
          ) : null}
          <p className="truncate font-display text-headline-sm font-semibold text-white">{product.name}</p>
          {product.ibn ? (
            <p className="mt-0.5 text-label-sm text-white/60">
              IBN <span dir="ltr">{product.ibn}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto mt-space-md w-full max-w-md">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-accent-gold transition-[width] duration-1000 ease-linear"
            style={{ width: `${(seconds / HOLD_SECONDS) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-center text-label-md text-white/60">
          {seconds > 0 ? t('verify.continuing', { seconds }) : t('verify.continuingNow')}
        </p>
      </div>
    </StatusPage>
  )
}

