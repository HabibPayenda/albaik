using System.Data.Common;
using System.Globalization;
using System.Reflection;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage;

namespace Albaik.Importer;

/// <summary>
/// Copies every live SQLite table into MariaDB, preserving primary keys, timestamps,
/// password hashes and Verification codes, then proves the copy with row counts and a
/// content checksum per table. It is deliberately not part of the API's startup.
/// </summary>
public static class SqliteToMariaDbImporter
{
    /// <summary>
    /// The copy order is the dependency order: a Collection before its Brands, a Brand
    /// before its Products, a Product before its Images. The list is explicit so a new
    /// table added to the model makes the importer refuse rather than silently skip it.
    /// </summary>
    private static readonly Type[] CopyOrder =
    {
        typeof(Category),
        typeof(Brand),
        typeof(Product),
        typeof(ProductImage),
        typeof(SiteSetting),
        typeof(NavLink),
        typeof(FooterLink),
        typeof(QuickLink),
        typeof(HomeSection),
        typeof(HeroStat),
        typeof(Testimonial),
        typeof(TrustPillar),
        typeof(HairProfile),
        typeof(Page),
        typeof(ContactMessage),
        typeof(AdminUser),
    };

    private static readonly MariaDbServerVersion ServerVersion = new(new Version(10, 10, 0));

    public static async Task<ImportReport> RunAsync(
        ImportOptions options,
        Action<string>? log = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(options);

        if (string.IsNullOrWhiteSpace(options.SourcePath))
        {
            throw new ArgumentException("A SQLite source path is required.", nameof(options));
        }

        if (string.IsNullOrWhiteSpace(options.TargetConnectionString))
        {
            throw new ArgumentException("A MariaDB connection string is required.", nameof(options));
        }

        var contextOptions = new DbContextOptionsBuilder<ImportDbContext>()
            .UseMySql(options.TargetConnectionString, ServerVersion)
            .Options;

        await using var db = new ImportDbContext(contextOptions);

        ValidateModelCoverage(db.Model);

        var target = db.Database.GetDbConnection();
        log?.Invoke($"Target: database '{target.Database}' on '{target.DataSource}' (password never logged).");

        if (options.ApplyMigrations)
        {
            log?.Invoke("Applying the API's EF migrations to the target...");
            await ApplyMigrationsAsync(options.TargetConnectionString, cancellationToken);
        }

        log?.Invoke($"Reading a private, read-only copy of '{options.SourcePath}'...");
        var source = await SqliteSourceReader.ReadAsync(db.Model, CopyOrder, options.SourcePath, cancellationToken);

        var totalRows = source.Sum(table => table.Rows.Count);
        log?.Invoke($"Source read: {totalRows} rows across {source.Count} tables.");

        await EnsureTargetIsReadyAsync(db, source, options.Force, log, cancellationToken);
        await InsertAsync(db, source, options.Force, log, cancellationToken);
        var tableReports = await VerifyTablesAsync(db, source, log, cancellationToken);
        var verificationCodesChecked = await VerifyVerificationCodesAsync(db, source, cancellationToken);

        var report = new ImportReport(tableReports, verificationCodesChecked);

        if (!report.Succeeded)
        {
            var mismatches = report.Tables
                .Where(table => !table.Matches)
                .Select(table =>
                    $"{table.Table}: source {table.SourceRows}/{table.SourceChecksum}, "
                    + $"target {table.TargetRows}/{table.TargetChecksum}")
                .ToArray();

            throw new ImportVerificationException(
                "The target was written but does not match the source; no success is reported. "
                + string.Join(" | ", mismatches));
        }

        log?.Invoke(
            $"Verified {report.Tables.Count} tables, {totalRows} rows and "
            + $"{verificationCodesChecked} Verification codes.");

        return report;
    }

    private static void ValidateModelCoverage(IModel model)
    {
        var covered = CopyOrder.ToHashSet();

        var missing = model.GetEntityTypes()
            .Select(entityType => entityType.ClrType)
            .Where(type => !covered.Contains(type))
            .ToArray();

        if (missing.Length > 0)
        {
            throw new InvalidOperationException(
                "The importer does not know these model tables and will not silently skip them: "
                + string.Join(", ", missing.Select(type => type.Name)) + ". Add them to CopyOrder.");
        }

        var unknown = CopyOrder
            .Where(type => model.FindEntityType(type) is null)
            .ToArray();

        if (unknown.Length > 0)
        {
            throw new InvalidOperationException(
                "The copy order names types the model no longer contains: "
                + string.Join(", ", unknown.Select(type => type.Name)) + ".");
        }
    }

    private static async Task ApplyMigrationsAsync(string connectionString, CancellationToken cancellationToken)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(connectionString, ServerVersion)
            .Options;

        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync(cancellationToken);
    }

    private static async Task EnsureTargetIsReadyAsync(
        ImportDbContext db,
        IReadOnlyList<SourceTable> source,
        bool force,
        Action<string>? log,
        CancellationToken cancellationToken)
    {
        if (!await db.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException("The target MariaDB database cannot be reached.");
        }

        var nonEmpty = new List<(string Table, long Count)>();
        foreach (var table in source)
        {
            long count;
            try
            {
                count = await CountAsync(db, table.TableName, cancellationToken);
            }
            catch (DbException error)
            {
                throw new InvalidOperationException(
                    $"The target table '{table.TableName}' is missing or unreadable. Apply the API's "
                    + "migrations first, or pass --migrate, and try again.",
                    error);
            }

            if (count > 0)
            {
                nonEmpty.Add((table.TableName, count));
            }
        }

        if (nonEmpty.Count == 0)
        {
            return;
        }

        if (!force)
        {
            var database = db.Database.GetDbConnection().Database;
            var summary = string.Join(", ", nonEmpty.Select(entry => $"{entry.Table}={entry.Count}"));
            throw new ImportRefusedException(
                $"The target database '{database}' is not empty ({summary}). "
                + "Re-run with --force to replace the imported tables' content.");
        }

        log?.Invoke(
            "The target is not empty; its imported tables will be replaced inside the insert "
            + "transaction because --force was supplied: "
            + string.Join(", ", nonEmpty.Select(entry => entry.Table)) + ".");
    }

    private static async Task InsertAsync(
        ImportDbContext db,
        IReadOnlyList<SourceTable> source,
        bool replaceExisting,
        Action<string>? log,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // DELETE is transactional where TRUNCATE is not (MariaDB implicitly commits it).
        // Running the clear-out inside this transaction is what lets a failed forced retry
        // roll back to the previous content instead of leaving the target empty.
        if (replaceExisting)
        {
            await DeleteAllAsync(db, source, cancellationToken);
        }

        foreach (var table in source)
        {
            log?.Invoke($"Inserting {table.Rows.Count} rows into {table.TableName}...");

            // Explicit Ids are part of the values because every key is ValueGenerated.Never
            // in ImportDbContext. AUTO_INCREMENT still moves past the largest imported Id.
            db.AddRange((IEnumerable<object>)table.Rows);
            await db.SaveChangesAsync(cancellationToken);
            db.ChangeTracker.Clear();
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<TableImportReport>> VerifyTablesAsync(
        ImportDbContext db,
        IReadOnlyList<SourceTable> source,
        Action<string>? log,
        CancellationToken cancellationToken)
    {
        var reports = new List<TableImportReport>(source.Count);

        foreach (var table in source)
        {
            var targetRows = await LoadRowsAsync(db, table.EntityType, cancellationToken);
            var targetChecksum = ContentChecksum.Compute(table.EntityType, targetRows);
            var targetCount = checked((int)await CountAsync(db, table.TableName, cancellationToken));

            var report = new TableImportReport(
                table.TableName,
                table.Rows.Count,
                targetCount,
                table.Checksum,
                targetChecksum);

            reports.Add(report);

            log?.Invoke(
                $"{table.TableName}: {report.SourceRows} -> {report.TargetRows} rows, "
                + $"source sha256 {Short(report.SourceChecksum)}, "
                + $"target sha256 {Short(report.TargetChecksum)} {(report.Matches ? "OK" : "MISMATCH")}");
        }

        return reports;
    }

    private static async Task<int> VerifyVerificationCodesAsync(
        ImportDbContext db,
        IReadOnlyList<SourceTable> source,
        CancellationToken cancellationToken)
    {
        var products = source
            .Single(table => table.EntityType.ClrType == typeof(Product))
            .Rows
            .Cast<Product>()
            .Where(product => !string.IsNullOrWhiteSpace(product.VerificationCode))
            .ToArray();

        foreach (var product in products)
        {
            var resolved = await db.Products
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    candidate => candidate.VerificationCode == product.VerificationCode,
                    cancellationToken);

            if (resolved is null || resolved.Id != product.Id || resolved.Slug != product.Slug)
            {
                throw new ImportVerificationException(
                    $"Verification code '{product.VerificationCode}' does not resolve to the same "
                    + $"Product after import (expected Id {product.Id}, slug '{product.Slug}').");
            }
        }

        return products.Length;
    }

    private static async Task<long> CountAsync(
        ImportDbContext db,
        string tableName,
        CancellationToken cancellationToken)
    {
        await db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            await using var command = db.Database.GetDbConnection().CreateCommand();
            command.CommandText = $"SELECT COUNT(*) FROM {Quote(tableName)}";
            var value = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt64(value, CultureInfo.InvariantCulture);
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    private static async Task DeleteAllAsync(
        ImportDbContext db,
        IReadOnlyList<SourceTable> source,
        CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var transaction = db.Database.CurrentTransaction?.GetDbTransaction();

        // Parent rows cannot be deleted while a child still references them. The switch
        // is session-scoped and always restored before any INSERT runs.
        await ExecuteAsync(connection, transaction, "SET FOREIGN_KEY_CHECKS=0", cancellationToken);
        try
        {
            for (var index = source.Count - 1; index >= 0; index--)
            {
                await ExecuteAsync(
                    connection,
                    transaction,
                    $"DELETE FROM {Quote(source[index].TableName)}",
                    cancellationToken);
            }
        }
        finally
        {
            await ExecuteAsync(connection, transaction, "SET FOREIGN_KEY_CHECKS=1", cancellationToken);
        }
    }

    private static async Task ExecuteAsync(
        DbConnection connection,
        DbTransaction? transaction,
        string sql,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<List<object>> LoadRowsAsync(
        ImportDbContext db,
        IEntityType entityType,
        CancellationToken cancellationToken)
    {
        var method = typeof(SqliteToMariaDbImporter)
            .GetMethod(nameof(LoadRowsTypedAsync), BindingFlags.NonPublic | BindingFlags.Static)!
            .MakeGenericMethod(entityType.ClrType);

        var task = (Task<List<object>>)method.Invoke(null, new object[] { db, cancellationToken })!;
        return await task;
    }

    private static async Task<List<object>> LoadRowsTypedAsync<TEntity>(
        ImportDbContext db,
        CancellationToken cancellationToken)
        where TEntity : class
    {
        var rows = await db.Set<TEntity>()
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return rows.Cast<object>().ToList();
    }

    private static string Short(string checksum) =>
        checksum.Length <= 12 ? checksum : checksum[..12];

    private static string Quote(string identifier) =>
        "`" + identifier.Replace("`", "``", StringComparison.Ordinal) + "`";
}
