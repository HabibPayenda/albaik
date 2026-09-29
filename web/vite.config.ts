import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { defineConfig } from 'vite'

const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:5080'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Albaik Group of Companies',
        short_name: 'Albaik',
        description:
          'Personal care, hair care, beauty, oral care and everyday products. The Mark of Pure Perfection.',
        theme_color: '#0e3b9c',
        background_color: '#f7f9fc',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'en',
        dir: 'ltr',
        categories: ['shopping', 'health', 'beauty'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          // The dedicated maskable file, not pwa-512.png. A maskable icon is cropped
          // to whatever shape the launcher wants, so its artwork has to sit inside the
          // 80% safe zone — the optimiser insets it for exactly that. Pointing this at
          // the standard icon made Android clip the crown and wordmark.
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // `webp` must be here. Every brand mark is WebP, including the header lockup —
        // without it the logo is simply not in the precache and renders broken offline,
        // which defeats the offline-first requirement.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        // Product photography is deliberately excluded and handled by the runtime cache
        // below instead: precaching it works at today's 8 products but would balloon the
        // precache as the catalogue grows, and a growing precache is a growing install.
        globIgnores: ['**/products/**'],
        navigateFallback: '/index.html',
        // Never let the SPA fallback swallow API or upload requests.
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            // Catalogue data: fresh when online, cached copy when offline.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'albaik-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'albaik-media',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Brand-kit product photography shipped in the bundle. Cached on first
            // view so a product page still shows its picture offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/products/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'albaik-products',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
  /*
   * `vite preview` serves the production build, and without this it has no proxy —
   * so `/api` and `/uploads` 404 and every page renders its error state, which makes
   * a local smoke test of the real bundle useless. Mirror the dev proxy here.
   */
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        /**
         * Split third-party code into its own long-lived chunks.
         *
         * These libraries only change when we upgrade them, whereas page code changes
         * on every content or copy edit. Keeping them apart means a routine deploy
         * invalidates a few kilobytes instead of the whole 700 kB entry, and returning
         * visitors get the vendor chunks straight from cache.
         *
         * Ordered most-specific-first: `react-dom` must not fall into the generic
         * `react` branch, and `motion-dom` / `motion-utils` are framer-motion's own
         * runtime packages, so they belong with it rather than in the catch-all.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'vendor-motion'
          if (/[\\/](react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'vendor-react'
          if (/[\\/]react[\\/]/.test(id)) return 'vendor-react'
          if (/[\\/](@reduxjs|react-redux|immer|reselect)[\\/]/.test(id)) return 'vendor-state'
          if (/[\\/]lucide-react[\\/]/.test(id)) return 'vendor-icons'
          if (/[\\/]axios[\\/]/.test(id)) return 'vendor-http'
          if (/[\\/]lenis[\\/]/.test(id)) return 'vendor-scroll'
          return 'vendor'
        },
      },
    },
  },
})
