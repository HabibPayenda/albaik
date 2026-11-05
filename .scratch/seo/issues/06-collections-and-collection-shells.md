# 06: Collections and Collection shells

**What to build:** The Collections index and each Collection return their own title, description, canonical, social tags, ItemList JSON-LD and crawlable links to the Products and Brands they contain. Filtered views follow the canonical/noindex rules.

**Blocked by:** 05 — Home page server-rendered shell

**Status:** ready-for-agent

- [ ] The Collections index has a unique title, description, canonical, social tags and ItemList JSON-LD.
- [ ] Each Collection has a unique title, description, canonical, social tags, ItemList JSON-LD and crawlable Product/Brand links.
- [ ] A Collection selected in the filter canonicalises to its own Collection URL; search and other filtered views are noindex, follow.
- [ ] The shell content matches the hydrated page.
- [ ] HTTP tests cover the index, a Collection, a filtered view and a search view.
