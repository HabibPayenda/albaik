import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { PageLoader } from '@/components/ui/Feedback'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ErrorPage } from '@/pages/ErrorPage'
import { BrandRedirect } from '@/pages/BrandRedirect'

/*
 * Everything below the landing page is code-split.
 *
 * `HomePage` stays a static import on purpose: it is the route almost every visitor
 * lands on, and deferring it would add a round trip before the hero can paint. The
 * secondary routes are reached by navigating, so their code can arrive afterwards —
 * which keeps the initial bundle to the shell plus the home page.
 *
 * These pages use named exports (the admin screens use default exports), so each
 * `import()` is mapped to the `{ default }` shape `lazy()` expects.
 */
const CollectionsPage = lazy(() =>
  import('@/pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage })),
)
const CategoryPage = lazy(() =>
  import('@/pages/CategoryPage').then((m) => ({ default: m.CategoryPage })),
)
const BrandPage = lazy(() => import('@/pages/BrandPage').then((m) => ({ default: m.BrandPage })))
const ProductPage = lazy(() =>
  import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })),
)
const ContentPage = lazy(() =>
  import('@/pages/ContentPage').then((m) => ({ default: m.ContentPage })),
)
const ContactPage = lazy(() =>
  import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })),
)
const VerifyPage = lazy(() => import('@/pages/VerifyPage').then((m) => ({ default: m.VerifyPage })))

/* The dashboard is only ever loaded by administrators, so it is code-split away
   from the public marketing bundle. */
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminCategories = lazy(() => import('@/pages/admin/CategoriesPage'))
const AdminBrands = lazy(() => import('@/pages/admin/BrandsPage'))
const AdminProducts = lazy(() => import('@/pages/admin/ProductsPage'))
const AdminProductEditor = lazy(() => import('@/pages/admin/ProductEditorPage'))
const AdminHomeContent = lazy(() => import('@/pages/admin/HomeContentPage'))
const AdminNavigation = lazy(() => import('@/pages/admin/NavigationPage'))
const AdminPages = lazy(() => import('@/pages/admin/PagesPage'))
const AdminMessages = lazy(() => import('@/pages/admin/MessagesPage'))
const AdminSettings = lazy(() => import('@/pages/admin/SettingsPage'))
const AdminIcons = lazy(() => import('@/pages/admin/IconsPage'))

const withSuspense = (node: React.ReactNode, label = 'Loading page') => (
  <Suspense fallback={<PageLoader label={label} />}>{node}</Suspense>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    // A thrown route error is not a 404: `ErrorPage` distinguishes a crash, a missing
    // page and an offline device before it says anything.
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },

      { path: 'collections', element: withSuspense(<CollectionsPage />) },
      { path: 'collections/:categorySlug', element: withSuspense(<CategoryPage />) },
      { path: 'collections/:categorySlug/:brandSlug', element: withSuspense(<BrandPage />) },
      { path: 'products/:productSlug', element: withSuspense(<ProductPage />) },

      // Simple brand URLs resolve to their canonical category-scoped route.
      { path: 'brands/:brandSlug', element: <BrandRedirect /> },

      { path: 'contact', element: withSuspense(<ContactPage />) },

      // What a printed product QR code opens. Public, and deliberately short-lived.
      { path: 'verify/:code', element: withSuspense(<VerifyPage />) },

      // Named static pages, all served by the CMS-backed ContentPage.
      { path: 'about', element: withSuspense(<ContentPage slugOverride="about" />) },
      { path: 'quality', element: withSuspense(<ContentPage slugOverride="quality" />) },
      { path: 'safety', element: withSuspense(<ContentPage slugOverride="safety" />) },
      { path: 'distribution', element: withSuspense(<ContentPage slugOverride="distribution" />) },
      { path: 'privacy', element: withSuspense(<ContentPage slugOverride="privacy" />) },
      { path: 'terms', element: withSuspense(<ContentPage slugOverride="terms" />) },
      { path: 'guides/:pageSlug', element: withSuspense(<ContentPage />) },
      { path: 'pages/:pageSlug', element: withSuspense(<ContentPage />) },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: withSuspense(<LoginPage />, 'Loading dashboard'),
  },
  {
    path: '/admin',
    element: withSuspense(<AdminLayout />, 'Loading dashboard'),
    // The dashboard's own failure surface, so a broken screen does not throw a visitor-
    // facing 404 over the staff UI.
    errorElement: <ErrorPage variant="admin" />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />, 'Loading dashboard') },
      { path: 'categories', element: withSuspense(<AdminCategories />, 'Loading dashboard') },
      { path: 'brands', element: withSuspense(<AdminBrands />, 'Loading dashboard') },
      { path: 'products', element: withSuspense(<AdminProducts />, 'Loading dashboard') },
      { path: 'products/new', element: withSuspense(<AdminProductEditor />, 'Loading dashboard') },
      { path: 'products/:productId', element: withSuspense(<AdminProductEditor />, 'Loading dashboard') },
      { path: 'home', element: withSuspense(<AdminHomeContent />, 'Loading dashboard') },

      // The home page content moved into tabs on the Home page screen; these old
      // URLs keep working and land on the matching tab.
      { path: 'hero-stats', element: <Navigate to="/admin/home?tab=hero-stats" replace /> },
      { path: 'testimonials', element: <Navigate to="/admin/home?tab=testimonials" replace /> },
      { path: 'trust-pillars', element: <Navigate to="/admin/home?tab=trust-pillars" replace /> },
      { path: 'hair-profiles', element: <Navigate to="/admin/home?tab=hair-profiles" replace /> },

      { path: 'navigation', element: withSuspense(<AdminNavigation />, 'Loading dashboard') },
      { path: 'pages', element: withSuspense(<AdminPages />, 'Loading dashboard') },
      { path: 'messages', element: withSuspense(<AdminMessages />, 'Loading dashboard') },
      { path: 'icons', element: withSuspense(<AdminIcons />, 'Loading dashboard') },
      { path: 'settings', element: withSuspense(<AdminSettings />, 'Loading dashboard') },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}

export default App
