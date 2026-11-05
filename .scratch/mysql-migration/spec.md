# SQLite to MariaDB (MySQL-compatible) Migration

**Status:** ready-for-agent

## Problem Statement

The API stores every Product, Collection, Brand, page, setting, message and admin account in a single SQLite file. The schema is created with `EnsureCreatedAsync()` and patched at startup by a SQLite-specific schema guard, and there are no EF migrations. That was a reasonable choice for a single-process shared host, but it now limits the project:

- Schema changes are applied by hand-written SQLite DDL, not versioned migrations. Adding a field means deleting the database in development or writing a migration by hand before it reaches real content.
- SQLite's file-level locking is a poor fit for concurrent dashboard writes and public reads as the catalogue grows.
- Backups and recovery are file copies rather than standard database tooling, and the host provides MariaDB 10.10.
- The application contains provider-specific code (connection-string path resolution, `PRAGMA table_info`, SQLite type mapping) that would have to be maintained alongside the real database.
- Printed Product QR codes depend on stored Verification codes. Any migration must preserve primary keys, timestamps and Verification codes exactly; reseeding is not an acceptable substitute.

From the business's point of view: staff content, enquiry history, admin access and printed QR codes must survive the switch, the public site must stay online, and future schema changes must not require deleting the database.

## Solution

Move the API to MariaDB 10.10 (MySQL-compatible) through EF Core, using a provider compatible with the confirmed server version, and make EF migrations the single schema authority. A one-off importer copies the existing SQLite data into MariaDB, preserving primary keys, timestamps and Verification codes. The connection string comes from host configuration or environment variables, and the API applies migrations at startup or as a deploy step. The SQLite-specific schema guard and connection-string handling are removed. Integration tests run against a dedicated MariaDB test database so the production provider is covered.

## User Stories

### Staff and business

1. As a staff member, I want every current Product, Collection, Brand, page, setting, testimonial, message and admin account in MariaDB, so that nothing is lost in the switch.
2. As a staff member, I want Product IDs and Verification codes preserved, so that printed QR codes continue to open the correct Verification page.
3. As a staff member, I want my dashboard login and editing screens to work after the switch, so that I can keep maintaining content.
4. As a staff member, I want future fields and tables to arrive through a migration, so that the database never has to be deleted to pick up a model change.
5. As a staff member, I want the sitemap, QR generation and catalogue queries to keep working unchanged, so that the SEO work is not blocked by the database move.
6. As a business, I want standard MySQL backups and restores, so that recovery does not depend on copying a file from the web root.
7. As a business, I want the public site to stay available during the cutover, so that visitors and enquiries are not lost.
8. As a business, I want a tested rollback path to the SQLite file, so that a failed cutover can be reversed quickly.
9. As a business, I want the switch documented for the hosting provider, so that the database server, credentials and backup policy are clear.

### Developers and operations

10. As a developer, I want one EF Core provider that works with the confirmed production server and my local database, so that development and production behave the same.
11. As a developer, I want EF migrations checked into the repository, so that schema changes are versioned and reviewable.
12. As a developer, I want the SQLite schema guard removed, so that there is one schema authority and no provider-specific DDL in the application.
13. As a developer, I want explicit column types and maximum lengths, so that indexes are valid and storage is predictable.
14. As a developer, I want the connection string read from environment configuration, so that credentials are not committed.
15. As a developer, I want a one-off importer that preserves IDs, timestamps and Verification codes, so that the cutover does not break printed packaging.
16. As a developer, I want the importer to verify row counts and key content, so that a partial or corrupt import is caught before cutover.
17. As a developer, I want the importer to be safely re-runnable, so that a failed import can be retried without duplicating rows.
18. As a developer, I want the seeder to skip when imported content already exists, so that it cannot overwrite live content.
19. As a developer, I want the API to fail fast on an unsupported server version or missing connection string, so that misconfiguration is obvious.
20. As a developer, I want a database readiness check, so that a broken connection is visible before staff start editing.
21. As a developer, I want integration tests to run on MariaDB, so that the production provider is exercised rather than assumed.
22. As a developer, I want the SQLite upgrade-scenario tests rewritten for migrations, so that the test suite reflects the new schema authority.
23. As a developer, I want the README and configuration notes updated, so that the next person knows how to run the project.

### Security and reliability

24. As a security owner, I want database credentials supplied by the host or environment, so that they never appear in the repository.
25. As a security owner, I want the database connection to use the host's required TLS mode, so that credentials and content are not sent in clear text.
26. As an operator, I want the cutover to run inside a maintenance window with a backup taken first, so that rollback is possible.
27. As an operator, I want the SQLite file retained read-only after cutover, so that it remains a recovery source until the MariaDB deployment is accepted.
28. As an operator, I want a documented smoke-test checklist after cutover, so that a successful import is proven, not assumed.

## Implementation Decisions

### Provider and versions

- **Production target: MariaDB 10.10 (confirmed host).** Use **Pomelo.EntityFrameworkCore.MySql 9.0.0** with **EF Core 9.0.x**. Pomelo 9 is tested against MariaDB 10.5-11.6; 10.10 sits between the tested 10.6 and 10.11 releases and is expected to be compatible. Confirm the exact server version with `SELECT VERSION()` during implementation and record it. Pomelo has no EF Core 10 release, so the EF Core packages are aligned to 9.0.x while the application remains on .NET 10.
- **Local development:** XAMPP ships MariaDB 10.4.32, which is below Pomelo 9's tested range. Upgrade the local server to MariaDB 10.5+ (preferably 10.10 or 10.11) or install MySQL 8 locally before development. Do not develop against 10.4 and assume production parity.
- Oracle's `MySql.EntityFrameworkCore` 10.0.12 is not used: it targets MySQL and does not officially support MariaDB. Do not mix providers.
- Require MariaDB 10.5+; MySQL 8.0 is also acceptable if the host changes. MySQL 5.7 is end of life and is not supported.
- The provider choice and the confirmed server version are recorded in the project documentation so a future upgrade does not silently swap providers.

### Schema authority

- Introduce **EF migrations** as the only way the schema changes. Generate an initial migration from the current model against an empty MariaDB database.
- Apply migrations at startup with `MigrateAsync()`, or as an explicit deploy step if the host prefers it. Do not use `EnsureCreatedAsync()` in the running application.
- Remove the SQLite schema guard and its startup call. Its two responsibilities are replaced: missing tables and columns are created by migrations, and the seeder remains responsible for content.
- The README's "no EF migrations" note is replaced with the migration workflow: add a migration, review it, apply it, never edit the database by hand.

### Model mapping

- Charset `utf8mb4` and collation `utf8mb4_unicode_ci`, so Dari and Pashto text already stored in the CMS remains valid on both the host and local server.
- Give every indexed string an explicit maximum length: slugs 200, setting/nav keys 100, usernames 64, IBN 32, Verification codes 32. Composite unique indexes must fit within InnoDB key limits.
- Give short copy explicit lengths and keep long-form content (page HTML, descriptions, JSON blobs) as `longtext`.
- Map prices to `decimal(18,2)`, timestamps to `datetime(6)`, booleans to `tinyint(1)`, and use the InnoDB engine.
- Preserve the existing unique indexes. MariaDB allows multiple NULLs in a unique index, so an optional IBN and an unminted Verification code remain valid.
- Preserve foreign-key behaviour: cascade for images and for brands under a Collection; restrict for Products under a Collection or Brand.
- Table and column names come from EF's model. Do not hand-write SQL that assumes a case-insensitive filesystem; Linux MySQL is case-sensitive for table names.

### Connection configuration

- The connection string is read from `ConnectionStrings:Default`, supplied by the host or the `ConnectionStrings__Default` environment variable. It is never committed with real credentials.
- Remove the SQLite-specific relative-path resolution from startup. A missing or malformed connection string fails fast with a clear message.
- Development uses the local MariaDB instance; production uses the host's MariaDB database. The required server version, database name, user, TLS mode and backup policy are documented.
- The connection string uses `utf8mb4`, the host's required TLS mode, and a bounded connection pool suitable for the host.

### Data migration

- Build a one-off importer, separate from the running API, that reads the SQLite file and writes MariaDB through the same EF model.
- The importer copies tables in dependency order, preserves primary keys, timestamps, Verification codes, admin password hashes and settings values, and never mutates the SQLite file.
- Run the import in a transaction per table, or one transaction if the data volume allows it. Verify row counts per table and compare a content checksum for the catalogue, settings and pages before declaring success.
- The importer truncates its target tables before a retry, or refuses to run against non-empty tables unless explicitly forced, so a failed run cannot duplicate rows.
- The seeder runs after migrations. It must detect that imported content exists and skip the catalogue and settings seeds. It remains the source of first-run defaults for an empty database.
- Take a copy of the SQLite file and a `mysqldump` of the target before the import. Keep both until the MariaDB deployment is accepted.

### Cutover and rollback

- Stop the API, back up the SQLite file, create the MariaDB database, apply migrations, run the importer, verify counts and key rows, switch the connection string, start the API, and run the smoke-test checklist.
- Smoke test: home page, a Collection, a Brand, a Product, the dashboard login, a contact submission, a Verification code lookup, QR generation, and a settings edit.
- Keep the SQLite file read-only and the pre-import MariaDB dump until the deployment is accepted. The rollback is: stop the API, restore the previous connection string and SQLite file, start the API.
- The cutover is a maintenance-window operation; the public site may be briefly unavailable, but no content or enquiry may be lost.

### Tests

- Switch the integration test host to a dedicated MariaDB test database. Each factory creates a uniquely named database, applies migrations, seeds, and drops the database on dispose.
- The test connection string comes from an environment variable. If MariaDB is unavailable, the suite fails with a clear prerequisite message rather than silently skipping.
- Rewrite the tests that manipulate SQLite directly. The schema-guard "missing table" scenario is retired because migrations create tables; the "missing settings are restored by the seeder" scenario is kept and runs against MariaDB.
- Add importer tests: a fixture SQLite database imported into a MariaDB test database, asserting row counts, preserved IDs, Verification codes, admin hash, timestamps and representative content; a second run proves the importer is safe to retry.
- Add migration tests: migrating an empty database creates the full schema; a second migration run is a no-op; the model has no pending changes.
- Add provider-specific tests: unique indexes on string columns, multiple NULLs in unique indexes, cascade and restrict deletes, UTF-8 content, and decimal and timestamp round-trips.
- Keep the existing HTTP-level API tests; they remain the highest seam and now run on the production provider.

### Operational visibility

- The health endpoint reports database connectivity so a broken connection is visible immediately after deployment.
- Startup logs the database name and server version, never the password.
- A failed migration or import stops startup rather than serving a half-migrated database.

### Documentation

- Update the README, the configuration table, the deployment notes and the "no migrations" note.
- Document the local MariaDB prerequisite, the test database environment variable, the migration commands, the importer command, the cutover checklist and the rollback steps.
- Note the provider version choice and the confirmed MariaDB server version.

## Testing Decisions

- **Primary seam:** HTTP API responses with a real MariaDB test database, using the existing `AlbaikApiFactory`. This is the same seam the existing integration tests use and the closest to production behaviour.
- A good test asserts externally observable behaviour: a migrated database has the expected schema; the seeder is idempotent; CRUD and verification work; unique constraints hold; the importer preserves IDs and Verification codes; a second migration or import is safe.
- Modules covered: startup migration, seeder idempotence, catalogue and content CRUD, Verification code lookup, contact submission, admin login, importer, health check, and provider-specific constraints.
- Prior art: the existing xUnit integration tests and the upgrade-scenario tests that boot the API twice against the same database. The importer test uses a prepared SQLite fixture rather than the live file.
- Avoid asserting EF-generated SQL or internal provider details. Assert data and behaviour.
- Manual verification: run the importer against a copy of the live SQLite file, compare counts and a sample of Products and Verification codes, then run the smoke-test checklist in staging before cutover.

## Out of Scope

- Changing the API contract, dashboard behaviour or public pages.
- Moving uploaded images to object storage or a CDN.
- Read replicas, sharding, clustering, managed cloud databases or multi-tenant support.
- Changing the hosting provider or IIS configuration beyond the connection string and database provisioning.
- A full data-access rewrite (Dapper, raw SQL, a different ORM).
- Dari/Pashto content changes or SEO work. The SEO spec is separate; its tests must run on the chosen provider once this migration lands.
- Migrating historical SQLite backups other than the current live file.
- MySQL 5.7 compatibility.

## Further Notes

- The host is MariaDB 10.10. Local XAMPP ships MariaDB 10.4.32, which is below Pomelo 9's tested range (MariaDB 10.5+); upgrade the local server to 10.5+ (ideally 10.10 or 10.11) before development.
- Provider facts verified during planning: Pomelo 9.0.0 depends on EF Core 9.0.x and MySqlConnector 2.4.0, and is tested against MariaDB 10.5-11.6. MariaDB 10.10 is expected to be compatible but is not explicitly in that list; confirm `SELECT VERSION()` on the host and record the exact build. Oracle `MySql.EntityFrameworkCore` 10.0.12 depends on EF Core 10.0.12 and officially targets MySQL, not MariaDB.
- The existing SQLite file is gitignored and holds live content. Copy it before the import and never commit it.
- Verification codes are printed on packaging. Preserving them is non-negotiable; the importer must be verified against the live file before cutover.
- Store timestamps in UTC. MySQL `datetime` has no timezone; do not switch to `timestamp`, which has range and timezone pitfalls.
- Table-name case sensitivity differs between Windows and Linux. Use EF's quoted identifiers and avoid hand-written SQL.
- The SEO work adds server-side reads but no provider-specific queries. Land this migration first where possible, so the SEO shell and its tests run on the production provider.
- Keep the SQLite file and a pre-import MariaDB dump until the new deployment has been accepted. Rollback must be a documented, tested operation, not an improvisation.


