# 03: SQLite data importer

**What to build:** A one-off importer copies the live SQLite content into MariaDB — catalogue, images, settings, navigation, home content, pages, testimonials, messages and admin account — preserving primary keys, timestamps, password hashes and Verification codes. A Product's printed Verification code resolves to the same Product after the import.

**Blocked by:** 02 — API runs on MariaDB with migrations

**Status:** ready-for-agent

- [ ] The importer reads a copy of the SQLite file and never mutates it.
- [ ] Tables are copied in dependency order; primary keys, timestamps, hashes and Verification codes are preserved.
- [ ] Row counts per table and a content checksum are verified before success is reported.
- [ ] A retry is safe: the importer truncates its target tables or refuses a non-empty target unless forced.
- [ ] A Verification code from the imported data resolves on MariaDB.
- [ ] The importer is covered by a fixture-based test against a MariaDB test database.
