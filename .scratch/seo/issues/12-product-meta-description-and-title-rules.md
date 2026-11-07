# 12: Product meta description and title rules

**What to build:** Staff can write a search description for each Product, and every public page has a unique, length-appropriate title and description. Brand titles include their Collection, and the site suffix is short enough not to truncate.

**Blocked by:** 07 — Brand and Product shells

**Status:** resolved

- [x] Product gains an optional meta-description field, editable in the dashboard and exposed through the catalogue API.
- [x] Product pages use the field when present and fall back to the short description.
- [x] Titles lead with the page subject and use the short `Albaik` suffix.
- [x] Brand titles include the Collection; the four Albaik Brand pages are distinct.
- [x] Descriptions are unique and target 120–160 characters; the home description is trimmed.
- [x] The server shell and the client head manager use the same rules.
- [x] Tests cover uniqueness and the field's round-trip through the dashboard API.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
