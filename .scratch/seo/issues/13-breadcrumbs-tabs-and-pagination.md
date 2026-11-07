# 13: Breadcrumbs, tabs and pagination

**What to build:** Visitors and crawlers get visible breadcrumbs with matching BreadcrumbList data, all Product tab copy is present in the page, and pagination works as real links without JavaScript.

**Blocked by:** 08 — Content, Contact, Verification and 404 shells

**Status:** resolved

- [x] Product, Brand, Collection and content pages show breadcrumbs that match their BreadcrumbList JSON-LD.
- [x] All Product tab panels are present in the DOM; inactive panels are hidden rather than unmounted.
- [x] Pagination renders `<a href>` links with the page parameter and works without JavaScript.
- [x] Filtered and search views keep their canonical/noindex rules.
- [x] Tests assert breadcrumb links, tab copy and pagination URLs in the HTML.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
