using System.Data;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Albaik.Api.Data;

namespace Albaik.Api.Services;

/// <summary>
/// Reconciles the live SQLite schema with the EF Core model at startup.
///
/// Why this exists
/// ---------------
/// This project has no EF migrations by design — <c>EnsureCreatedAsync()</c> builds
/// the schema once and then never touches it again. That is a reasonable trade for
/// a small CMS, but it has one sharp edge: adding a property to an entity compiles
/// cleanly, passes every build and every test, and then throws
/// <c>SQLite Error 1: no such column: X</c> the first time that row is written.
///
/// That is not hypothetical. <c>ContactMessage.ProductSlug</c> and
/// <c>ProductName</c> were added for the product-enquiry feature and the failure
/// would only have surfaced when a customer submitted the form.
///
/// So this runs on every boot and adds any column the model expects but the file
/// lacks. It is additive only: it never drops, renames, retypes or reorders
/// anything, and it never touches a row.
///
/// If a real deployment arrives with a DBA behind it, replace this with migrations.
/// Until then it is the safety net that makes the no-migrations choice survivable.
/// </summary>
public static class SchemaGuard
{
    /// <summary>
    /// Adds missing columns. Returns the number added so the caller can log a
    /// meaningful line only when something actually changed.
    /// </summary>
    public static async Task<int> SyncAsync(AppDbContext db, ILogger logger, CancellationToken ct = default)
    {
        var connection = db.Database.GetDbConnection();
        var opened = connection.State != ConnectionState.Open;
        if (opened) await connection.OpenAsync(ct);

        var added = 0;
        try
        {
            foreach (var entity in db.Model.GetEntityTypes())
            {
                var table = entity.GetTableName();
                if (string.IsNullOrEmpty(table)) continue;

                var existing = await ColumnsAsync(connection, table, ct);
                if (existing.Count == 0)
                {
                    // The table does not exist yet — normally a brand-new entity on an
                    // already-seeded file. EnsureCreated can't help here: it only builds
                    // a schema when the whole file is new. Create just this table, empty
                    // and to the model's shape, so a shipped deploy keeps working when a
                    // new table is added.
                    var created = await CreateTableAsync(connection, entity, table, ct);
                    added += created;
                    if (created > 0) logger.LogWarning("Schema drift repaired: created table {Table}.", table);
                    continue;
                }

                foreach (var property in entity.GetProperties())
                {
                    var column = property.GetColumnName();
                    if (string.IsNullOrEmpty(column) || existing.Contains(column)) continue;

                    // A NOT NULL column can only be added with a default, and EF's
                    // model does not always carry one. Adding it as nullable would
                    // leave the schema weaker than the model expects, so refuse and
                    // say so loudly rather than paper over it.
                    if (!property.IsNullable)
                    {
                        logger.LogError(
                            "Schema drift: {Table}.{Column} is required by the model but missing from the database, "
                            + "and it is NOT NULL so it cannot be added automatically. Delete the database in "
                            + "development, or add an EF migration before going live.",
                            table, column);
                        continue;
                    }

                    var sqlType = SqliteTypeFor(property);
                    var statement = $"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" {sqlType}";

                    await using var cmd = connection.CreateCommand();
                    cmd.CommandText = statement;
                    await cmd.ExecuteNonQueryAsync(ct);

                    existing.Add(column);
                    added++;
                    logger.LogWarning("Schema drift repaired: added {Table}.{Column} ({Type}).", table, column, sqlType);
                }
            }
        }
        finally
        {
            if (opened) await connection.CloseAsync();
        }

        return added;
    }

    /// <summary>
    /// Creates a single table with the EF model's columns and primary key. Used when an
    /// entity is added after the database file already exists, where
    /// <c>EnsureCreatedAsync()</c> is a no-op. The new table is empty, so NOT NULL
    /// columns are safe — the first write brings a value for every one of them.
    /// Indexes and foreign keys are deliberately not reproduced: every table created
    /// here is a new, empty leaf (no rows to corrupt), and the current model has none.
    /// </summary>
    private static async Task<int> CreateTableAsync(
        System.Data.Common.DbConnection connection, IEntityType entity, string table, CancellationToken ct)
    {
        var primaryKey = entity.FindPrimaryKey();
        var primaryKeyColumns = primaryKey?.Properties
            .Select(p => p.GetColumnName())
            .Where(n => !string.IsNullOrEmpty(n))
            .ToList() ?? new List<string>();

        // SQLite only accepts AUTOINCREMENT on a single INTEGER primary key, so it is
        // emitted only for exactly that shape. Composite and non-integer keys get a
        // plain PRIMARY KEY clause instead of invalid DDL that would abort startup.
        var inlinePrimaryKey = new Dictionary<string, string>();
        var extraPrimaryKey = "";
        if (primaryKeyColumns.Count == 1)
        {
            var column = primaryKeyColumns[0];
            var property = primaryKey!.Properties.First(p => p.GetColumnName() == column);
            var autoIncrement = SqliteTypeFor(property) == "INTEGER" && property.ValueGenerated == ValueGenerated.OnAdd;
            inlinePrimaryKey[column] = autoIncrement
                ? $" CONSTRAINT \"PK_{table}\" PRIMARY KEY AUTOINCREMENT"
                : $" CONSTRAINT \"PK_{table}\" PRIMARY KEY";
        }
        else if (primaryKeyColumns.Count > 1)
        {
            extraPrimaryKey = $", CONSTRAINT \"PK_{table}\" PRIMARY KEY ({string.Join(", ", primaryKeyColumns.Select(c => $"\"{c}\""))})";
        }

        var columns = new List<string>();
        foreach (var property in entity.GetProperties())
        {
            var column = property.GetColumnName();
            if (string.IsNullOrEmpty(column)) continue;

            var definition = $"\"{column}\" {SqliteTypeFor(property)}";
            if (!property.IsNullable) definition += " NOT NULL";
            if (inlinePrimaryKey.TryGetValue(column, out var clause)) definition += clause;
            columns.Add(definition);
        }

        var statement = $"CREATE TABLE \"{table}\" ({string.Join(", ", columns)}{extraPrimaryKey})";
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = statement;
        await cmd.ExecuteNonQueryAsync(ct);

        return 1;
    }

    private static async Task<HashSet<string>> ColumnsAsync(
        System.Data.Common.DbConnection connection, string table, CancellationToken ct)
    {
        var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"PRAGMA table_info(\"{table}\")";

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            // Column 1 of PRAGMA table_info is the column name.
            if (!await reader.IsDBNullAsync(1, ct)) columns.Add(reader.GetString(1));
        }

        return columns;
    }

    /// <summary>
    /// Maps a CLR property to a SQLite storage class. SQLite only has five, so this
    /// is a short list; anything unexpected falls back to TEXT, which accepts every
    /// value EF would write for the types that reach that branch.
    /// </summary>
    private static string SqliteTypeFor(IProperty property)
    {
        var clr = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;

        if (clr == typeof(bool) || clr == typeof(byte) || clr == typeof(sbyte)
            || clr == typeof(short) || clr == typeof(ushort)
            || clr == typeof(int) || clr == typeof(uint)
            || clr == typeof(long) || clr == typeof(ulong)
            || clr.IsEnum)
            return "INTEGER";

        if (clr == typeof(double) || clr == typeof(float)) return "REAL";
        if (clr == typeof(byte[])) return "BLOB";

        // string, Guid, DateTime, DateTimeOffset, DateOnly, TimeOnly, decimal —
        // EF Core's SQLite provider stores all of these as TEXT.
        return "TEXT";
    }
}
