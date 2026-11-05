import axios, { AxiosError, type AxiosInstance } from 'axios'

export const TOKEN_KEY = 'albaik.admin.token'
export const USER_KEY = 'albaik.admin.user'

/**
 * In dev, Vite proxies /api to the .NET server (see vite.config.ts).
 * In production the SPA is served by the API itself, so a relative base works in both.
 *
 * No default `Content-Type` is set. Axios already sends `application/json` for plain
 * object bodies, and setting it here overrode the multipart one on uploads: the browser
 * then posted `{}` as JSON, the API's `IFormFile` endpoints require a multipart content
 * type, endpoint selection matched nothing, and every upload failed with a bare 404.
 */
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Raised when the session is no longer valid so the UI can bounce to /admin/login. */
export const AUTH_EXPIRED_EVENT = 'albaik:auth-expired'

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status
    const isAuthCall = error.config?.url?.includes('/auth/login')

    if (status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }

    return Promise.reject(error)
  },
)

/** Pull a human-readable message out of an axios failure. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; title?: string } | undefined
    if (data?.message) return data.message
    if (data?.title) return data.title
    if (error.code === 'ECONNABORTED') return 'The request timed out. Check your connection and try again.'
    if (!error.response) return 'Cannot reach the Albaik server. Is the API running?'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export const endpoints = {
  bootstrap: '/bootstrap',
  home: '/home',
  health: '/health',

  categories: '/catalog/categories',
  category: (slug: string) => `/catalog/categories/${slug}`,
  brands: '/catalog/brands',
  brand: (categorySlug: string, brandSlug: string) => `/catalog/brands/${categorySlug}/${brandSlug}`,
  products: '/catalog/products',
  product: (slug: string) => `/catalog/products/${slug}`,

  pages: '/pages',
  page: (slug: string) => `/pages/${slug}`,
  /** What a scanned product QR code resolves to. */
  verify: (code: string) => `/verify/${code}`,
  contact: '/contact',
  newsletter: '/contact/newsletter',

  login: '/auth/login',
  me: '/auth/me',
  changePassword: '/auth/change-password',

  admin: {
    stats: '/admin/stats',
    categories: '/admin/categories',
    brands: '/admin/brands',
    products: '/admin/products',
    product: (id: number) => `/admin/products/${id}`,
    // IBN + verification code + the absolute URL the QR encodes.
    productVerification: (id: number) => `/admin/products/${id}/verification`,
    // QR image: `svg` for print, `png` for a quick proof.
    productQr: (id: number, format: 'svg' | 'png') => `/admin/products/${id}/qr.${format}`,
    // Replaces the verification code; every printed label with the old one stops verifying.
    regenerateVerificationCode: (id: number) => `/admin/products/${id}/verification-code`,
    upload: '/admin/upload',
    // Product photographs must be exactly 1080×1350; this route enforces it, while the
    // general route above still accepts collection, brand and section artwork.
    // See docs/adr/0006-product-images-are-framed-4-5.md.
    productUpload: '/admin/upload/product',
    // Separate route with hero-sized ceilings, so a backdrop is not squeezed into the
    // product-card limits. See docs/adr/0002-backdrop-upload-route.md.
    backdropUpload: '/admin/upload/backdrop',
    // One path per art-directed breakpoint, each with its own dimension ceiling under the
    // same 300 KB budget. See docs/adr/0007-hero-backdrop-per-breakpoint.md.
    backdropVariantUpload: (variant: string) => `/admin/upload/backdrop/${variant}`,
    homeSections: '/admin/home-sections',
    heroStats: '/admin/hero-stats',
    testimonials: '/admin/testimonials',
    trustPillars: '/admin/trust-pillars',
    hairProfiles: '/admin/hair-profiles',
    navLinks: '/admin/nav-links',
    footerLinks: '/admin/footer-links',
    quickLinks: '/admin/quick-links',
    pages: '/admin/pages',
    page: (id: number) => `/admin/pages/${id}`,
    settings: '/admin/settings',
    icons: '/admin/icons',
    reorder: '/admin/reorder',
    emailStatus: '/admin/email-status',
    messages: '/admin/messages',
    messageRead: (id: number) => `/admin/messages/${id}/read`,
    message: (id: number) => `/admin/messages/${id}`,
  },
}
