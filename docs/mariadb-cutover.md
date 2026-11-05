# MariaDB cutover and rollback

This runbook moves the Albaik API from the legacy SQLite file to MariaDB. It is a
maintenance-window operation: the public site may be briefly unavailable, but no
content, enquiry or printed QR code may be lost.

**Staging rehearsal is a required gate.** Run this entire document against the
staging host and record the results before touching production. Do not cut production
over on the strength of a local test alone.

## Provider facts

| Item | Value |
|---|---|
| Provider | `Pomelo.EntityFrameworkCore.MySql` 9.0.0 |
| EF Core packages | 9.0.x (the application itself stays on .NET 10) |
| Production target | MariaDB 10.10 (confirmed host version) |
| Local server used for verification | MariaDB 13.0.2 |
| Minimum supported | MariaDB 10.5+ |
| Alternative | MySQL 8.0 is acceptable if the host changes |
| Not supported | MySQL 5.7 (end of life) |

The API pins `MariaDbServerVersion(10, 10, 0)` so local and production generate the
same SQL. Record the exact production build with `SELECT VERSION();` during
pre-flight and note any deviation from 10.10.

## Pre-flight

Do these before the maintenance window opens.

- [ ] Announce the maintenance window to staff and anyone who submits enquiries.
- [ ] Confirm the production host is MariaDB 10.5+ and record `SELECT VERSION();`.
- [ ] Provision the production database and a least-privilege application user:

  ```sql
  CREATE DATABASE albaik
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

  CREATE USER 'albaik_app'@'%' IDENTIFIED BY '<strong-password>';
  GRANT ALL PRIVILEGES ON albaik.* TO 'albaik_app'@'%';
  FLUSH PRIVILEGES;
  ```

- [ ] Configure TLS in the connection string using the host's required mode (for
  example `SslMode=Required`). Do not fall back to an unencrypted connection.
- [ ] Take a file-level backup of the SQLite database and its sidecars while it is
  quiescent. Never commit the file.

  ```powershell
  # Stop the API first, then copy the database and any WAL/SHM sidecars.
  Copy-Item albaik.db      C:\backup\albaik-<date>.db
  Copy-Item albaik.db-wal  C:\backup\albaik-<date>.db-wal  -ErrorAction SilentlyContinue
  Copy-Item albaik.db-shm  C:\backup\albaik-<date>.db-shm  -ErrorAction SilentlyContinue
  Get-FileHash C:\backup\albaik-<date>.db -Algorithm SHA256
  ```

- [ ] If the MariaDB target already contains data, take a pre-import dump:

  ```powershell
  mysqldump --single-transaction --routines --triggers `
    -h <host> -u <user> -p albaik > C:\backup\pre-import-<date>.sql
  ```

- [ ] Preserve the current (SQLite) API build/publish folder so rollback can restore
  the exact release that still understands SQLite.
- [ ] Record the current connection string and where it is set (host panel, IIS
  environment variable or `ConnectionStrings__Default`).

## Cutover steps

Run in this order. Stop if any step fails; do not skip verification.

1. **Stop the API.** Stop the IIS app pool / service so no writes reach SQLite.
2. **Copy the live SQLite file.** Copy `albaik.db` (and `-wal`/`-shm`) to the backup
   location and record the SHA-256. Keep the original in place, untouched.
3. **Create the target database and user** if not already done in pre-flight. Confirm
   charset `utf8mb4` and collation `utf8mb4_unicode_ci`.
4. **Apply migrations.** Either let the importer do it with `--migrate`, or run:

   ```powershell
   $env:ConnectionStrings__Default = "Server=<host>;Port=3306;User=albaik_app;Password=<password>;Database=albaik;CharSet=utf8mb4;SslMode=Required"
   dotnet ef database update --project api
   ```

   The running API applies migrations at startup too; never use `EnsureCreated`.
5. **Import the copy** (the importer always reads the copy, never the source):

   ```powershell
   dotnet run --project api/Albaik.Importer -- `
     --source C:\backup\albaik-<date>.db `
     --target $env:ConnectionStrings__Default `
     --migrate
   ```

   On a failed or interrupted import, re-run with `--force`; it truncates the
   imported tables and replaces them. Without `--force` it refuses a non-empty target.
6. **Verify counts and content.** The importer exits `0` only when every table's row
   count and SHA-256 content checksum matches the SQLite source, and every minted
   Verification code resolves to the same Product Id and slug. Also spot-check:

   ```sql
   SELECT COUNT(*) FROM Products;
   SELECT Id, Slug, VerificationCode FROM Products ORDER BY Id LIMIT 5;
   SELECT Id, Slug, VerificationCode
   FROM Products
   WHERE Id = 1 AND Slug = 'albaik-anti-dandruff-shampoo';
   ```

   The single live Verification code is
   **Product 1, `albaik-anti-dandruff-shampoo`, `GGK69TAE7FPN96ZR`**. The importer
   preserves it verbatim; if that value differs after cutover, stop and roll back.

7. **Switch the connection string.** Set `ConnectionStrings__Default` in the host
   configuration (or the IIS app-pool environment). It must not be committed and must
   not be written into `appsettings.json`. Leave `appsettings.json`'s `Default` empty.
8. **Start the API.** Confirm the startup log reports the database name and MariaDB
   server version, and that `/api/health` returns `200` with `"database":"connected"`.
9. **Run the smoke-test checklist** below. Record who ran it and the outcome.
10. **Accept or roll back.** Only after the checklist passes does the new deployment
    count as accepted.

## Smoke-test checklist

Run against the deployed site and API. Every row must pass before acceptance.

- [ ] **Home page** (`/`) renders the hero, collections, featured products and
      trust content from MariaDB.
- [ ] **Collection** (`/collections/hair-care`) lists its brands and products.
- [ ] **Brand** (`/collections/hair-care/albaik`) lists that brand's products.
- [ ] **Product** (`/products/albaik-anti-dandruff-shampoo`) renders details, price
      state and product images/plate.
- [ ] **Admin login** (`/admin/login`) succeeds with the seeded administrator.
- [ ] **Contact submission** (`/contact`) stores an enquiry; it appears in
      **Dashboard → Inbox** and is not lost even if SMTP is unconfigured.
- [ ] **Verification lookup** (`/verify/GGK69TAE7FPN96ZR`) confirms Product 1 and
      continues to its product page after five seconds.
- [ ] **QR generation** (`GET /api/admin/products/1/qr.svg` or `.png` with a bearer
      token) returns a valid image containing the preserved verification URL.
- [ ] **Settings edit** (Dashboard → Settings) saves a value and the public site
      reflects it; restore the original value afterwards.
- [ ] `/api/health` returns `200` and `"database":"connected"`.
- [ ] Startup log names the MariaDB database and server version, and never the
      password.
- [ ] No new rows are written to `albaik.db` after cutover (it stays read-only).

## Retention

Keep these until the MariaDB deployment is formally accepted, and preferably for the
agreed backup window after that:

- [ ] The original SQLite file and its `-wal`/`-shm` sidecars, made **read-only**
  (`attrib +R C:\backup\albaik-<date>.db` on Windows, `chmod 0444` on Linux).
- [ ] The pre-import MariaDB dump (`pre-import-<date>.sql`).
- [ ] The previous SQLite API build/publish folder.
- [ ] The recorded SHA-256 of the source file and the importer's verification output.

The SQLite file is a recovery source only. Do not point the new API at it; the new
build does not include a SQLite provider.

## Rollback checklist

Roll back if verification or any smoke test fails, or if the deployment is otherwise
rejected.

1. **Stop the API / app pool.**
2. **Restore the previous application release** — the build that still uses the
   SQLite provider. The MariaDB build cannot read `albaik.db`.
3. **Restore the previous connection string** (`ConnectionStrings:Default` /
   `ConnectionStrings__Default`) that points at the SQLite file, including the
   original relative-path behaviour of that release.
4. **Restore the SQLite file** from the backup taken at the start of the window
   (and the `-wal`/`-shm` sidecars). Clear the read-only attribute if needed so the
   restored process can write.
5. **Start the API** and confirm `/api/health` and the admin login work.
6. **Re-run the smoke-test checklist** against the restored SQLite deployment.
7. Record the rollback, the reason and the time in the maintenance log.

Do not delete the MariaDB database or its dump during rollback; leave it for the
post-mortem and the next rehearsal.

## Notes

- Schema changes after cutover are made with EF migrations only:
  `dotnet ef migrations add <Name> --project api --output-dir Migrations`, review the
  generated SQL, then apply it. Never edit the MariaDB schema by hand.
- Table-name case sensitivity differs between Windows and Linux. Use EF's quoted
  identifiers and avoid hand-written SQL that assumes case-insensitive names.
- Store timestamps in UTC in `datetime(6)`; do not switch to `timestamp`.
