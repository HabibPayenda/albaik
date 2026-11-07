# 14: Client head manager parity

**What to build:** Navigating inside the SPA updates the document title, description, canonical and social tags to match the server-rendered shell, and a page without a description does not inherit the previous page's description.

**Blocked by:** 08 — Content, Contact, Verification and 404 shells

**Status:** resolved

- [x] Client navigation updates title, description, canonical, Open Graph and Twitter tags from the route data.
- [x] A page without a description resets it rather than keeping the previous page's value.
- [x] Only one canonical and one description tag exist after navigation.
- [x] The client rules match the server shell for the same route.
- [x] Manual browser verification covers a Product → Collection → Home sequence; no new front-end test harness is added.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
