# 11: Cache and security headers

**What to build:** Repeat visits use cached hashed assets, content edits are picked up immediately, and the site sends the agreed security headers. The PWA and offline behaviour continue to work.

**Blocked by:** 09 — robots.txt and sitemap.xml

**Status:** ready-for-agent

- [ ] Hashed build assets return `Cache-Control: public, max-age=31536000, immutable`.
- [ ] HTML shells return `Cache-Control: no-cache` with a revalidation signal.
- [ ] `robots.txt` and `sitemap.xml` have their own cache policies.
- [ ] HSTS, `X-Content-Type-Options: nosniff` and a referrer policy are present on HTTPS.
- [ ] The service worker, manifest and offline navigation still work.
- [ ] HTTP tests assert the cache and security headers.
