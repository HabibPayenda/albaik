# Albaik.Importer

The one-off SQLite -> MariaDB content importer. It exists only for the cutover and is
**never part of the running API**: `Albaik.Api.csproj` excludes this folder, and the
API's startup, migrations and seeding do not reference it.

The importer writes through the same EF model the API reads, so imported content
cannot land in a shape the application does not understand.

## Source safety

- Point `--source` at a **copy** of the live `albaik.db`, ideally taken while the API
  is stopped (or with `sqlite3 albaik.db ".backup copy.db"`). The importer opens that
  copy read-only and again copies it to a private temporary folder before reading,
  so the file you pass is never opened for writing, never locked by our reads, and
  never modified. The temporary copy includes any `-wal`/`-shm` sidecars and is
  deleted afterwards.
- The importer does not need the original file in place. Keep the original and a
  pre-import `mysqldump` of the target until the MariaDB deployment is accepted.
- `--force` truncates the target's imported tables. It never touches the source.

## Usage

```powershell
dotnet run --project api/Albaik.Importer -- `
  --source C:\backup\albaik.db `
  --target "Server=127.0.0.1;Port=3306;User=root;Password=;Database=albaik;CharSet=utf8mb4" `
  --migrate
```

| Option | Meaning |
|---|---|
| `--source <path>` | Copy of the live SQLite file. Required. |
| `--target <conn>` | MariaDB connection string. Defaults to `ConnectionStrings__Default`. |
| `--migrate` | Apply the API's EF migrations to the target first. Use it on a new, empty database. |
| `--force` | Truncate the imported tables instead of refusing a non-empty target (safe retry). |
| `-h`, `--help` | Print usage. |

A normal first import is `--migrate` on an empty database. A rerun after a failed or
interrupted import is `--force`, which truncates and replaces the imported tables.
Without `--force`, the importer refuses a target that already has rows and writes
nothing.

## What it proves before reporting success

- Tables are copied in dependency order (Collection -> Brand -> Product -> Images,
  then settings, navigation, home content, pages, messages and the admin account).
- Primary keys, timestamps (to the microsecond), admin password hashes, JSON blobs,
  Dari/Pashto text and **Verification codes** are preserved.
- Per-table row counts and a SHA-256 content checksum are compared between the parsed
  SQLite rows and the rows read back from MariaDB.
- Every minted Verification code resolves on MariaDB to the same Product Id and slug.
- The test suite hashes the source file before and after the run to prove it was not
  written.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Imported; all row counts, checksums and Verification codes match. |
| `1` | Import or verification failed (target unreachable, schema missing, source unreadable, mismatch). |
| `2` | Refused or bad arguments: non-empty target without `--force`, missing `--source`, bad option, missing file. |

## Tests

The importer is covered by `SqliteImportTests` in `api/tests/Albaik.Api.Tests`:
a hand-written SQLite fixture is imported into a freshly created MariaDB database,
asserted, retried (refusal and `--force`), then the database is dropped. The test
needs a reachable MariaDB at `127.0.0.1:3306` (root, no password) or the
`ALBAIK_TEST_MYSQL` connection string.

```powershell
dotnet test api/tests/Albaik.Api.Tests/Albaik.Api.Tests.csproj `
  --filter FullyQualifiedName~SqliteImportTests --nologo
```

Cutover, rollback and host configuration belong to ticket 04; this file only covers
the importer itself.
