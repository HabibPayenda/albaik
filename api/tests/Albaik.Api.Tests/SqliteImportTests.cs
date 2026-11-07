using System.Globalization;
using System.Security.Cryptography;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Albaik.Importer;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The importer is the only thing allowed to carry live content from the old SQLite
/// file to MariaDB. This test builds a SQLite fixture with the live shape, imports it
/// into a throwaway MariaDB database, and then asserts the things a cutover cannot lose:
/// every table's rows, the explicit primary keys, timestamps, JSON and Dari text, the
/// admin password hash, and the Verification code a printed QR code contains.
///
/// It also proves the retry contract: a second run against a populated target refuses
/// unless forced, and a forced run truncates rather than duplicating. The fixture file's
/// hash is checked after the run, so the source can never have been written.
/// </summary>
public class SqliteImportTests
{
    private const string DefaultServer =
        "Server=127.0.0.1;Port=3306;User=root;Password=;CharSet=utf8mb4";

    [Fact]
    public async Task Import_PreservesContentAndVerificationCodes_AndIsSafeToRetry()
    {
        var databaseName = $"albaik_import_{Guid.NewGuid():N}";
        var targetConnectionString = ConnectionStringFor(databaseName);
        var fixtureDirectory = Path.Combine(
            Path.GetTempPath(),
            "albaik-import-fixture-" + Guid.NewGuid().ToString("N"));

        try
        {
            var fixture = SqliteImportFixtureBuilder.Create(fixtureDirectory);
            var sourceHashBefore = HashOf(await File.ReadAllBytesAsync(fixture.DatabasePath));

            var first = await SqliteToMariaDbImporter.RunAsync(new ImportOptions
            {
                SourcePath = fixture.DatabasePath,
                TargetConnectionString = targetConnectionString,
                ApplyMigrations = true,
            });

            Assert.True(first.Succeeded, Describe(first));
            Assert.Equal(fixture.RowCounts.Count, first.Tables.Count);

            foreach (var expected in fixture.RowCounts)
            {
                var table = Assert.Single(first.Tables, report => report.Table == expected.Key);
                Assert.True(table.Matches, Describe(table));
                Assert.Equal(expected.Value, table.SourceRows);
                Assert.Equal(expected.Value, table.TargetRows);
            }

            // Only the minted code is checked; the unminted row is deliberately skipped.
            Assert.Equal(1, first.VerificationCodesChecked);
            Assert.Equal(sourceHashBefore, HashOf(await File.ReadAllBytesAsync(fixture.DatabasePath)));

            var options = OptionsFor(targetConnectionString);

            await using (var db = new AppDbContext(options))
            {
                var category = await db.Categories.SingleAsync(c => c.Id == 41);
                Assert.Equal("hair-care", category.Slug);
                Assert.Equal("Hair Care", category.Name);
                Assert.Equal("مراقبت از مو", category.NameDari);
                Assert.Equal("د وېښتانو پاملرنه", category.NamePashto);
                Assert.Equal("2026-09-26 06:47:31.413038", Format(category.CreatedAt));
                Assert.Equal("2026-09-26 06:47:31.413039", Format(category.UpdatedAt));

                var product = await db.Products.SingleAsync(p => p.Id == 101);
                Assert.Equal("albaik-anti-dandruff-shampoo", product.Slug);
                Assert.Equal(41, product.CategoryId);
                Assert.Equal(71, product.BrandId);
                Assert.Equal(123.45m, product.Price);
                Assert.Equal(150.00m, product.CompareAtPrice);
                Assert.Equal(4.5, product.Rating);
                Assert.Equal(new[] { "Helps reduce dandruff", "Cleanses the scalp" }, product.Benefits);
                Assert.Equal(new[] { "Anti-Dandruff", "Scalp Care" }, product.Ingredients);
                Assert.Equal("6291104123456", product.Ibn);
                Assert.Equal("Imported search snippet", product.MetaDescription);
                Assert.Equal("GGK69TAE7FPN96ZR", product.VerificationCode);
                Assert.Equal("2026-10-31 13:53:41.161137", Format(product.UpdatedAt));

                // The non-sequential Id is the proof that AUTO_INCREMENT did not renumber it.
                Assert.NotNull(await db.Products.SingleOrDefaultAsync(p => p.Id == 102));

                // The checkbox: a printed code resolves to the same Product on MariaDB.
                var resolved = await db.Products.SingleAsync(
                    p => p.VerificationCode == fixture.VerificationCode);
                Assert.Equal(101, resolved.Id);
                Assert.Equal("albaik-anti-dandruff-shampoo", resolved.Slug);

                var image = await db.ProductImages.SingleAsync(i => i.Id == 201);
                Assert.Equal(101, image.ProductId);
                Assert.Equal("Front", image.Alt);

                var setting = await db.SiteSettings.SingleAsync(s => s.Id == 302);
                Assert.Equal("contact.address", setting.Key);
                Assert.Equal("دفتر مرکزی، کابل", setting.Value);

                var section = await db.HomeSections.SingleAsync(s => s.Id == 701);
                Assert.Equal("""{"accentWord":"Pure Perfection."}""", section.DataJson);
                Assert.Equal(
                    """[{"title":"The Mark of","accentWord":"Pure Perfection."}]""",
                    section.SlidesJson);

                var page = await db.Pages.SingleAsync(p => p.Id == 1201);
                Assert.Equal(
                    "<p>Text with <strong>markup</strong> &amp; entities.</p>",
                    page.ContentHtml);
                Assert.False((await db.Pages.SingleAsync(p => p.Id == 1202)).IsPublished);

                var message = await db.ContactMessages.SingleAsync(m => m.Id == 1301);
                Assert.Equal("product", message.Kind);
                Assert.Equal("albaik-anti-dandruff-shampoo", message.ProductSlug);
                Assert.Equal("Albaik Anti-Dandruff Shampoo", message.ProductName);
                Assert.Null(message.DeliveryError);
                Assert.Equal("2026-09-26 07:55:58.856638", Format(message.CreatedAt));
                Assert.Equal(
                    "",
                    (await db.ContactMessages.SingleAsync(m => m.Id == 1302)).DeliveryError);

                var admin = await db.AdminUsers.SingleAsync(a => a.Id == 1401);
                Assert.Equal("admin", admin.Username);
                Assert.Equal(fixture.AdminPasswordHash, admin.PasswordHash);
                Assert.True(
                    BCrypt.Net.BCrypt.Verify(SqliteImportFixtureBuilder.AdminPassword, admin.PasswordHash),
                    "the imported password hash must still verify the original password");
                Assert.Equal("2026-11-01 05:51:30.073044", Format(admin.LastLoginAt!.Value));

                // A dashboard row created after the import must not collide with a preserved Id.
                var created = new Category
                {
                    Slug = "auto-increment-check",
                    Name = "Auto Increment Check",
                    CreatedAt = new DateTime(2026, 11, 2, 9, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 11, 2, 9, 0, 0, DateTimeKind.Utc),
                };
                db.Categories.Add(created);
                await db.SaveChangesAsync();
                Assert.True(created.Id > 42, $"AUTO_INCREMENT returned the preserved Id {created.Id}.");
            }

            // Retry without force must refuse without changing a single row. Retry with force
            // must truncate and leave exactly the same content, verified by the importer itself.
            var refused = await Assert.ThrowsAsync<ImportRefusedException>(() =>
                SqliteToMariaDbImporter.RunAsync(new ImportOptions
                {
                    SourcePath = fixture.DatabasePath,
                    TargetConnectionString = targetConnectionString,
                }));
            Assert.Contains("--force", refused.Message);

            await using (var db = new AppDbContext(options))
            {
                Assert.Equal(2, await db.Products.CountAsync());
                Assert.Equal(2, await db.Categories.CountAsync(c => c.Id <= 42));
                Assert.NotNull(await db.Products.SingleOrDefaultAsync(p => p.Id == 101));
            }

            var retried = await SqliteToMariaDbImporter.RunAsync(new ImportOptions
            {
                SourcePath = fixture.DatabasePath,
                TargetConnectionString = targetConnectionString,
                Force = true,
            });

            Assert.True(retried.Succeeded, Describe(retried));

            foreach (var expected in fixture.RowCounts)
            {
                var table = Assert.Single(retried.Tables, report => report.Table == expected.Key);
                Assert.True(table.Matches, Describe(table));
                Assert.Equal(expected.Value, table.SourceRows);
                Assert.Equal(expected.Value, table.TargetRows);
            }

            await using (var db = new AppDbContext(options))
            {
                Assert.Equal(2, await db.Categories.CountAsync());
                Assert.Equal(2, await db.Products.CountAsync());
                Assert.Equal(2, await db.ProductImages.CountAsync());
                Assert.Equal(1, await db.AdminUsers.CountAsync());
                Assert.Equal(
                    "GGK69TAE7FPN96ZR",
                    (await db.Products.SingleAsync(p => p.Id == 101)).VerificationCode);
            }
        }
        finally
        {
            await DropDatabaseAsync(databaseName);
            TryDeleteDirectory(fixtureDirectory);
        }
    }

    [Fact]
    public async Task Import_AcceptsAnOldProductSchemaWithoutMetaDescription()
    {
        var databaseName = $"albaik_import_oldschema_{Guid.NewGuid():N}";
        var targetConnectionString = ConnectionStringFor(databaseName);
        var fixtureDirectory = Path.Combine(
            Path.GetTempPath(),
            "albaik-import-oldschema-" + Guid.NewGuid().ToString("N"));

        try
        {
            var fixture = SqliteImportFixtureBuilder.Create(
                fixtureDirectory, omitProductMetaDescription: true);

            var report = await SqliteToMariaDbImporter.RunAsync(new ImportOptions
            {
                SourcePath = fixture.DatabasePath,
                TargetConnectionString = targetConnectionString,
                ApplyMigrations = true,
            });

            Assert.True(report.Succeeded, Describe(report));

            await using var db = new AppDbContext(OptionsFor(targetConnectionString));
            var product = await db.Products.SingleAsync(p => p.Id == 101);

            // The column is absent from the source, so the nullable model property is null
            // rather than the import failing or inventing a snippet.
            Assert.Null(product.MetaDescription);
            Assert.Equal("GGK69TAE7FPN96ZR", product.VerificationCode);
        }
        finally
        {
            await DropDatabaseAsync(databaseName);
            TryDeleteDirectory(fixtureDirectory);
        }
    }

    [Fact]
    public async Task FailedForcedRetry_RollsBackToThePreviousContent()
    {
        var databaseName = $"albaik_import_rollback_{Guid.NewGuid():N}";
        var targetConnectionString = ConnectionStringFor(databaseName);
        var fixtureDirectory = Path.Combine(
            Path.GetTempPath(),
            "albaik-import-rollback-" + Guid.NewGuid().ToString("N"));

        try
        {
            var fixture = SqliteImportFixtureBuilder.Create(fixtureDirectory);

            var first = await SqliteToMariaDbImporter.RunAsync(new ImportOptions
            {
                SourcePath = fixture.DatabasePath,
                TargetConnectionString = targetConnectionString,
                ApplyMigrations = true,
            });
            Assert.True(first.Succeeded, Describe(first));

            // Make the second run fail after the forced clear-out: the source Product now
            // points at a Brand that does not exist in the target.
            using (var source = new SqliteConnection(
                       $"Data Source={fixture.DatabasePath};Pooling=False"))
            {
                source.Open();
                using var command = source.CreateCommand();
                // The fixture declares the real foreign keys; a deliberate dangling
                // reference is the point of this test, so switch them off for the edit.
                command.CommandText =
                    "PRAGMA foreign_keys = OFF; UPDATE Products SET BrandId = 999 WHERE Id = 101;";
                command.ExecuteNonQuery();
            }

            await Assert.ThrowsAnyAsync<Exception>(() =>
                SqliteToMariaDbImporter.RunAsync(new ImportOptions
                {
                    SourcePath = fixture.DatabasePath,
                    TargetConnectionString = targetConnectionString,
                    Force = true,
                }));

            // A TRUNCATE outside the transaction would leave this target empty. The
            // transactional DELETE must have restored the content the first run wrote.
            await using var db = new AppDbContext(OptionsFor(targetConnectionString));
            Assert.Equal(2, await db.Categories.CountAsync());
            Assert.Equal(2, await db.Products.CountAsync());
            Assert.Equal(2, await db.ProductImages.CountAsync());
            Assert.NotNull(await db.Products.SingleOrDefaultAsync(p => p.Id == 101));
        }
        finally
        {
            await DropDatabaseAsync(databaseName);
            TryDeleteDirectory(fixtureDirectory);
        }
    }

    [Fact]
    public async Task Import_RejectsAMissingSourceBeforeTouchingTheTarget()
    {
        var missingSource = Path.Combine(
            Path.GetTempPath(),
            "albaik-missing-" + Guid.NewGuid().ToString("N") + ".db");
        var targetConnectionString = ConnectionStringFor($"albaik_import_missing_{Guid.NewGuid():N}");

        var error = await Assert.ThrowsAsync<ImportSourceException>(() =>
            SqliteToMariaDbImporter.RunAsync(new ImportOptions
            {
                SourcePath = missingSource,
                TargetConnectionString = targetConnectionString,
            }));

        Assert.Contains("does not exist", error.Message);
    }

    private static string ServerConnectionBase =>
        Environment.GetEnvironmentVariable("ALBAIK_TEST_MYSQL") is { Length: > 0 } configured
            ? configured
            : DefaultServer;

    private static string ConnectionStringFor(string databaseName)
    {
        var builder = new MySqlConnectionStringBuilder(ServerConnectionBase)
        {
            Database = databaseName,
            Pooling = false,
        };

        return builder.ConnectionString;
    }

    private static DbContextOptions<AppDbContext> OptionsFor(string connectionString) =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(connectionString, new MariaDbServerVersion(new Version(10, 10, 0)))
            .Options;

    private static async Task DropDatabaseAsync(string databaseName)
    {
        var builder = new MySqlConnectionStringBuilder(ServerConnectionBase)
        {
            Database = "",
            Pooling = false,
        };

        await using var connection = new MySqlConnection(builder.ConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = $"DROP DATABASE IF EXISTS `{databaseName.Replace("`", "``")}`";
        await command.ExecuteNonQueryAsync();
    }

    private static string Format(DateTime value) =>
        value.ToString("yyyy-MM-dd HH:mm:ss.ffffff", CultureInfo.InvariantCulture);

    private static string HashOf(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));

    private static string Describe(ImportReport report) =>
        string.Join(
            "; ",
            report.Tables.Select(table =>
                $"{table.Table} {table.SourceRows}/{table.SourceChecksum} -> "
                + $"{table.TargetRows}/{table.TargetChecksum}"));

    private static string Describe(TableImportReport report) =>
        $"{report.Table} {report.SourceRows}/{report.SourceChecksum} -> "
        + $"{report.TargetRows}/{report.TargetChecksum}";

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
        }
        catch (UnauthorizedAccessException)
        {
        }
    }
}
