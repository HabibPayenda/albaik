# 11: Cache and security headers

**What to build:** Repeat visits use cached hashed assets, content edits are picked up immediately, and the site sends the agreed security headers. The PWA and offline behaviour continue to work.

**Blocked by:** 09 — robots.txt and sitemap.xml

**Status:** resolved

- [x] Hashed build assets return `Cache-Control: public, max-age=31536000, immutable`.
- [x] HTML shells return `Cache-Control: no-cache` with a revalidation signal.
- [x] `robots.txt` and `sitemap.xml` have their own cache policies.
- [x] HSTS, `X-Content-Type-Options: nosniff` and a referrer policy are present on HTTPS.
- [x] The service worker, manifest and offline navigation still work.
- [x] HTTP tests assert the cache and security headers.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
