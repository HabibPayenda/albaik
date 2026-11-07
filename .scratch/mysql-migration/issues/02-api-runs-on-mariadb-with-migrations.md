# 02: API runs on MariaDB with migrations

**What to build:** A fresh MariaDB 10.10 database is created by EF migrations and the API serves the existing catalogue, home payload and admin login from it. The seeder remains idempotent, the health endpoint reports database connectivity, and the integration suite runs against a dedicated MariaDB test database.

**Blocked by:** 01 — MariaDB-ready model

**Status:** resolved

**Prerequisite (human):** local MariaDB 10.5+ is running. XAMPP ships 10.4.32 and must be upgraded (or replaced with MySQL 8); dev and test databases and connection strings must exist.

- [x] Provider is Pomelo 9.0.0 with EF Core 9.0.x; the confirmed server version is recorded.
- [x] An initial migration exists and is applied at startup or as a documented deploy step.
- [x] `EnsureCreated` and the SQLite schema guard are gone.
- [x] A fresh database migrates, seeds and serves home, catalogue and admin login.
- [x] Seeding is idempotent on a second start.
- [x] The health endpoint reports database connectivity.
- [x] The integration test host uses a unique MariaDB test database, applies migrations and drops the database on dispose.
- [x] Existing integration tests pass on MariaDB; SQLite-specific upgrade tests are rewritten or retired in this ticket.
- [x] The EF model has no pending migration changes.
## Resolution

Implemented on `integration/seo-mariadb`. The API suite (154 tests) and the web production build pass. Commit and merge pointers: `git log --oneline integration/seo-mariadb`.
