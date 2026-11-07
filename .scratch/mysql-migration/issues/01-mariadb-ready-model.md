# 01: MariaDB-ready model

**What to build:** The EF model carries explicit storage decisions — maximum lengths for indexed strings, decimal precision, date/time precision, boolean mapping and utf8mb4 intent — so the provider switch in the next ticket cannot fail on unbounded text indexes or implicit types. The public site and dashboard behave exactly as they do today on SQLite.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Every indexed string property has an explicit maximum length; composite unique indexes fit InnoDB limits.
- [x] Long-form content and JSON blobs remain unbounded text.
- [x] Prices, timestamps and booleans have explicit mappings.
- [x] The API still boots and seeds against SQLite; existing tests pass unchanged.
- [x] No public or dashboard behaviour changes.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
