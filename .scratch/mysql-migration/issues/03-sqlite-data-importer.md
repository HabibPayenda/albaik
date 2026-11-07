# 03: SQLite data importer

**What to build:** A one-off importer copies the live SQLite content into MariaDB — catalogue, images, settings, navigation, home content, pages, testimonials, messages and admin account — preserving primary keys, timestamps, password hashes and Verification codes. A Product's printed Verification code resolves to the same Product after the import.

**Blocked by:** 02 — API runs on MariaDB with migrations

**Status:** resolved

- [x] The importer reads a copy of the SQLite file and never mutates it.
- [x] Tables are copied in dependency order; primary keys, timestamps, hashes and Verification codes are preserved.
- [x] Row counts per table and a content checksum are verified before success is reported.
- [x] A retry is safe: the importer truncates its target tables or refuses a non-empty target unless forced.
- [x] A Verification code from the imported data resolves on MariaDB.
- [x] The importer is covered by a fixture-based test against a MariaDB test database.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
