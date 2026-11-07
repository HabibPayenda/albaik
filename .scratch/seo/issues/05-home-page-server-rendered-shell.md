# 05: Home page server-rendered shell

**What to build:** A request for the home page returns real HTML containing the home title, meta description, canonical URL, absolute Open Graph/Twitter tags, Organization and WebSite JSON-LD, and the page's primary content. React hydrates over it and the page looks and behaves exactly as before.

**Blocked by:** 02 — API runs on MariaDB with migrations (in the MariaDB migration workstream)

**Status:** resolved

- [x] The route resolver and HTML shell template are in place for public routes.
- [x] The home page returns a unique title and description, a self-referencing absolute canonical, Open Graph and Twitter fields with absolute images, and Organization/WebSite JSON-LD.
- [x] The shell contains the home page's primary crawlable content.
- [x] React hydrates without duplicate headings, duplicate IDs or stale text.
- [x] The shell content matches what a visitor sees (no cloaking).
- [x] HTTP tests assert status, title, description, canonical, social tags and JSON-LD shape.
- [x] Unknown public paths fall through to the 404 handling delivered by ticket 08; API and upload paths keep their 404s.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
