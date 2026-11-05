# 02: API runs on MariaDB with migrations

**What to build:** A fresh MariaDB 10.10 database is created by EF migrations and the API serves the existing catalogue, home payload and admin login from it. The seeder remains idempotent, the health endpoint reports database connectivity, and the integration suite runs against a dedicated MariaDB test database.

**Blocked by:** 01 — MariaDB-ready model

**Status:** ready-for-agent

**Prerequisite (human):** local MariaDB 10.5+ is running. XAMPP ships 10.4.32 and must be upgraded (or replaced with MySQL 8); dev and test databases and connection strings must exist.

- [ ] Provider is Pomelo 9.0.0 with EF Core 9.0.x; the confirmed server version is recorded.
- [ ] An initial migration exists and is applied at startup or as a documented deploy step.
- [ ] `EnsureCreated` and the SQLite schema guard are gone.
- [ ] A fresh database migrates, seeds and serves home, catalogue and admin login.
- [ ] Seeding is idempotent on a second start.
- [ ] The health endpoint reports database connectivity.
- [ ] The integration test host uses a unique MariaDB test database, applies migrations and drops the database on dispose.
- [ ] Existing integration tests pass on MariaDB; SQLite-specific upgrade tests are rewritten or retired in this ticket.
- [ ] The EF model has no pending migration changes.
