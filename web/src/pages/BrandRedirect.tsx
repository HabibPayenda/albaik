import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { PageLoader } from '@/components/ui/Feedback'
import { NotFoundPage } from './NotFoundPage'

/**
 * `/brands/albaik` has no category context, so resolve the first active brand with
 * that slug and forward to its canonical `/collections/:category/:brand` URL.
 */
export function BrandRedirect() {
  const { brandSlug = '' } = useParams()
  const brands = useAppSelector((state) => state.site.brands)
  const status = useAppSelector((state) => state.site.status)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  const match = brands.find((brand) => brand.slug === brandSlug)

  if (match?.categorySlug) {
    return <Navigate to={`/collections/${match.categorySlug}/${match.slug}`} replace />
  }

  if (status !== 'ready' && !settled) return <PageLoader label="Finding brand" />
  return <NotFoundPage />
}
