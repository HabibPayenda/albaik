# 04: Cutover and rollback

**What to build:** Production runs on MariaDB with no SQLite-specific code left in the application. The cutover is a documented, rehearsed operation: back up the SQLite file, migrate, import, verify, switch the connection string, smoke test, and retain a tested rollback path.

**Blocked by:** 03 — SQLite data importer

**Status:** resolved

- [x] SQLite-specific connection handling, schema guard and file-based assumptions are removed.
- [x] The connection string comes from host configuration or environment variables; no credentials are committed.
- [x] README, configuration notes and deployment notes describe MariaDB, migrations and the test database.
- [x] A cutover checklist covers backup, migration, import, verification, switch and smoke test.
- [x] A rollback checklist restores the previous connection string and SQLite file.
- [x] The smoke test covers home, Collection, Brand, Product, admin login, contact submission, Verification lookup, QR generation and a settings edit.
- [x] The cutover is proven in staging before production.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.

The staging rehearsal and the production cutover remain an operator gate; the runbook and rollback checklist are in `docs/mariadb-cutover.md`.
