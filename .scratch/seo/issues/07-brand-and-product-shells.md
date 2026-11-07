# 07: Brand and Product shells

**What to build:** A Brand page returns a collection-scoped unique title and canonical, and a Product page returns the Product name, description, image, Brand, Collection, SKU and crawlable benefits/usage/safety copy, with Product and BreadcrumbList JSON-LD. A missing Product returns the 404 shell.

**Blocked by:** 06 — Collections and Collection shells

**Status:** resolved

- [x] Each Brand page has a title that includes its Collection and a self-referencing canonical.
- [x] The four Albaik Brand pages have distinct titles and canonicals.
- [x] Each Product page returns Product JSON-LD with name, absolute image, description, Brand, Collection, SKU and URL.
- [x] `gtin13` is emitted only when the IBN is a valid 13-digit EAN-13; it is omitted otherwise.
- [x] Product benefits, usage and safety copy are present in the shell.
- [x] A missing or inactive Product returns the 404 shell.
- [x] HTTP tests cover a Brand, a Product and a missing Product.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
