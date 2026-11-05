using System.Globalization;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Albaik.Importer;

internal sealed record SourceTable(
    IEntityType EntityType,
    string TableName,
    List<object> Rows,
    string Checksum);

/// <summary>
/// Reads the legacy SQLite file. The caller's file is copied first and only the copy is
/// opened, in read-only mode, so the live content is never locked or changed.
/// </summary>
internal static class SqliteSourceReader
{
    private static readonly string[] SidecarSuffixes = { "-wal", "-shm" };

    public static async Task<IReadOnlyList<SourceTable>> ReadAsync(
        IModel model,
        IReadOnlyList<Type> copyOrder,
        string sourcePath,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(sourcePath))
        {
            throw new ImportSourceException($"The SQLite source '{sourcePath}' does not exist.");
        }

        var temporaryDirectory = Path.Combine(
            Path.GetTempPath(),
            "albaik-import-" + Guid.NewGuid().ToString("N"));

        Directory.CreateDirectory(temporaryDirectory);

        try
        {
            var copyPath = Path.Combine(temporaryDirectory, Path.GetFileName(sourcePath));
            File.Copy(sourcePath, copyPath, overwrite: true);

            // A live SQLite file may still have committed pages in its WAL. Copying the
            // sidecar as well gives the read-only copy everything the original would see.
            foreach (var suffix in SidecarSuffixes)
            {
                var sidecar = sourcePath + suffix;
                if (File.Exists(sidecar))
                {
                    File.Copy(sidecar, copyPath + suffix, overwrite: true);
                }
            }

            var connectionString = new SqliteConnectionStringBuilder
            {
                DataSource = copyPath,
                Mode = SqliteOpenMode.ReadOnly,
                Pooling = false,
            }.ToString();

            await using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            var tables = new List<SourceTable>(copyOrder.Count);
            foreach (var type in copyOrder)
            {
                var entityType = model.FindEntityType(type)
                    ?? throw new ImportSourceException($"The shared model has no entity type '{type.Name}'.");

                tables.Add(await ReadTableAsync(connection, entityType, cancellationToken));
            }

            return tables;
        }
        finally
        {
            TryDeleteDirectory(temporaryDirectory);
        }
    }

    private static async Task<SourceTable> ReadTableAsync(
        SqliteConnection connection,
        IEntityType entityType,
        CancellationToken cancellationToken)
    {
        var tableName = entityType.GetTableName()
            ?? throw new ImportSourceException($"Entity type '{entityType.ClrType.Name}' is not mapped to a table.");

        var keyProperties = entityType.FindPrimaryKey()?.Properties.ToArray()
            ?? throw new ImportSourceException($"Table '{tableName}' has no primary key to preserve.");

        var properties = entityType.GetProperties()
            .Where(p => p.PropertyInfo is not null)
            .ToArray();

        var columns = properties
            .Select(p => p.GetColumnName()
                ?? throw new ImportSourceException($"Property '{entityType.ClrType.Name}.{p.Name}' is not mapped to a column."))
            .ToArray();

        var orderBy = string.Join(", ", keyProperties.Select(p => Quote(p.GetColumnName()!)));

        await using var command = connection.CreateCommand();
        command.CommandText =
            $"SELECT {string.Join(", ", columns.Select(Quote))} FROM {Quote(tableName)} ORDER BY {orderBy}";

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var rows = new List<object>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var entity = Activator.CreateInstance(entityType.ClrType)
                ?? throw new ImportSourceException($"Could not create '{entityType.ClrType.Name}'.");

            for (var index = 0; index < properties.Length; index++)
            {
                var property = properties[index];
                var column = columns[index];

                if (reader.IsDBNull(index))
                {
                    if (!property.IsNullable)
                    {
                        throw new ImportSourceException(
                            $"Source table '{tableName}' has NULL in required column '{column}'.");
                    }

                    property.PropertyInfo!.SetValue(entity, null);
                    continue;
                }

                var value = ConvertValue(reader.GetValue(index), property, tableName, column);
                property.PropertyInfo!.SetValue(entity, value);
            }

            rows.Add(entity);
        }

        return new SourceTable(entityType, tableName, rows, ContentChecksum.Compute(entityType, rows));
    }

    private static object ConvertValue(object raw, IProperty property, string tableName, string column)
    {
        var targetType = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;

        try
        {
            if (targetType == typeof(string))
            {
                return raw as string ?? Convert.ToString(raw, CultureInfo.InvariantCulture)!;
            }

            if (targetType == typeof(int))
            {
                return Convert.ToInt32(raw, CultureInfo.InvariantCulture);
            }

            if (targetType == typeof(bool))
            {
                return Convert.ToInt64(raw, CultureInfo.InvariantCulture) != 0;
            }

            if (targetType == typeof(double))
            {
                return Convert.ToDouble(raw, CultureInfo.InvariantCulture);
            }

            if (targetType == typeof(decimal))
            {
                return raw is string text
                    ? decimal.Parse(text, NumberStyles.Number | NumberStyles.AllowExponent, CultureInfo.InvariantCulture)
                    : Convert.ToDecimal(raw, CultureInfo.InvariantCulture);
            }

            if (targetType == typeof(DateTime))
            {
                if (raw is not string text)
                {
                    throw new FormatException("SQLite stores datetimes as text.");
                }

                if (!DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                {
                    throw new FormatException($"'{text}' is not a datetime.");
                }

                // MariaDB's schema is datetime(6). Truncate rather than let the provider
                // round, so the checksum compares a deterministic value on both sides.
                return new DateTime(
                    parsed.Ticks - (parsed.Ticks % TimeSpan.TicksPerMicrosecond),
                    parsed.Kind);
            }

            if (targetType == typeof(List<string>))
            {
                if (raw is not string text)
                {
                    throw new FormatException("A string collection must be stored as JSON text.");
                }

                return JsonSerializer.Deserialize<List<string>>(text)
                    ?? throw new FormatException("A string collection must not be JSON null.");
            }
        }
        catch (Exception error) when (error is FormatException or OverflowException or JsonException)
        {
            throw new ImportSourceException(
                $"Source table '{tableName}' column '{column}' is not a valid {property.ClrType.Name}: {error.Message}",
                error);
        }

        throw new ImportSourceException(
            $"Source table '{tableName}' column '{column}' uses unsupported property type {property.ClrType.Name}.");
    }

    private static string Quote(string identifier) =>
        "\"" + identifier.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";

    private static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch (IOException)
        {
            // A leftover temp copy is harmless and never the operator's file.
        }
        catch (UnauthorizedAccessException)
        {
            // Same: best-effort cleanup after the source has been read.
        }
    }
}
