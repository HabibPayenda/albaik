# 10: Canonical host and path redirects

**What to build:** One canonical address per page. `www` redirects to the apex host, `http` redirects to `https`, trailing slashes and path case normalise, and `/brands/:brandSlug` redirects to the collection-scoped Brand URL — all as permanent 301s that preserve path and query.

**Blocked by:** 02 — API runs on MariaDB with migrations (in the MariaDB migration workstream)

**Status:** resolved

- [x] `www` requests 301 to the apex host, preserving path and query.
- [x] `http` requests 301 to `https`, preserving path and query.
- [x] Trailing-slash and path-case variants 301 to the canonical form.
- [x] `/brands/:brandSlug` 301s to the collection-scoped Brand URL; the first active Brand by sort order wins when the slug spans Collections.
- [x] The public site URL setting is validated as `https` with no trailing slash and is used by canonical, sitemap and QR generation.
- [x] Tests send host and forwarded-proto headers through the test host and assert 301 plus `Location`.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
