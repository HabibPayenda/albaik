# 04: Cutover and rollback

**What to build:** Production runs on MariaDB with no SQLite-specific code left in the application. The cutover is a documented, rehearsed operation: back up the SQLite file, migrate, import, verify, switch the connection string, smoke test, and retain a tested rollback path.

**Blocked by:** 03 — SQLite data importer

**Status:** ready-for-agent

- [ ] SQLite-specific connection handling, schema guard and file-based assumptions are removed.
- [ ] The connection string comes from host configuration or environment variables; no credentials are committed.
- [ ] README, configuration notes and deployment notes describe MariaDB, migrations and the test database.
- [ ] A cutover checklist covers backup, migration, import, verification, switch and smoke test.
- [ ] A rollback checklist restores the previous connection string and SQLite file.
- [ ] The smoke test covers home, Collection, Brand, Product, admin login, contact submission, Verification lookup, QR generation and a settings edit.
- [ ] The cutover is proven in staging before production.
