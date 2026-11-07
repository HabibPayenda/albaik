# 08: Content, Contact, Verification and 404 shells

**What to build:** Every remaining public page returns the correct shell: content pages and guides, Contact, and the Verification page. Verification is noindex, unknown public addresses return a real 404, and dashboard routes carry noindex directives.

**Blocked by:** 06 — Collections and Collection shells

**Status:** resolved

- [x] About, Quality, Safety, Distribution, Privacy, Terms, guides and generic pages return unique titles, descriptions, canonicals and BreadcrumbList JSON-LD.
- [x] Contact returns its own title, description and canonical; enquiry variants canonicalise to Contact.
- [x] The Verification page returns noindex, nofollow and is excluded from the sitemap.
- [x] Unknown public paths return the not-found shell with a 404 status and noindex.
- [x] The dashboard and its routes return `X-Robots-Tag: noindex, nofollow`.
- [x] Unknown `/api` and `/uploads` paths keep returning 404.
- [x] HTTP tests cover each page type and the indexation headers.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
