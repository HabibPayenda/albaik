# 06: Collections and Collection shells

**What to build:** The Collections index and each Collection return their own title, description, canonical, social tags, ItemList JSON-LD and crawlable links to the Products and Brands they contain. Filtered views follow the canonical/noindex rules.

**Blocked by:** 05 — Home page server-rendered shell

**Status:** resolved

- [x] The Collections index has a unique title, description, canonical, social tags and ItemList JSON-LD.
- [x] Each Collection has a unique title, description, canonical, social tags, ItemList JSON-LD and crawlable Product/Brand links.
- [x] A Collection selected in the filter canonicalises to its own Collection URL; search and other filtered views are noindex, follow.
- [x] The shell content matches the hydrated page.
- [x] HTTP tests cover the index, a Collection, a filtered view and a search view.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
