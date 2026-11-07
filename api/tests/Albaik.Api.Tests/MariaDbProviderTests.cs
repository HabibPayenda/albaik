using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The MariaDB-specific half of the schema contract: no pending model changes, the unique
/// indexes the catalogue relies on, nullable unique identifiers, the delete behaviour of
/// the hierarchy, utf8mb4 text and the decimal/datetime(6) column types. Each test owns a
/// freshly migrated, uniquely named database and drops it afterwards.
/// </summary>
public class MariaDbProviderTests : IAsyncLifetime
{
    private const string DefaultServer =
        "Server=127.0.0.1;Port=3306;User=root;Password=;CharSet=utf8mb4";

    private readonly string _databaseName = $"albaik_provider_{Guid.NewGuid():N}";
    private DbContextOptions<AppDbContext> _options = null!;

    public async Task InitializeAsync()
    {
        _options = OptionsFor(ConnectionStringFor(_databaseName));
        await using var db = new AppDbContext(_options);
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        MySqlConnection.ClearAllPools();
        await DropDatabaseAsync(_databaseName);
    }

    [Fact]
    public async Task Model_MatchesTheCheckedInMigrations()
    {
        await using var db = new AppDbContext(_options);
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task UniqueStringIndexes_ExistInTheMigratedSchema()
    {
        var actual = await UniqueIndexesAsync();

        string[] expected =
        {
            "AdminUsers:Username",
            "Brands:CategoryId,Slug",
            "Categories:Slug",
            "HomeSections:Key",
            "Pages:Slug",
            "Products:Ibn",
            "Products:Slug",
            "Products:VerificationCode",
            "SiteSettings:Key",
        };

        Assert.All(expected, index => Assert.Contains(index, actual));
    }

    [Fact]
    public async Task MultipleNullIbnAndVerificationCodeRows_AreAllowed()
    {
        await using var db = new AppDbContext(_options);
        var category = new Category { Slug = Unique("cat"), Name = "Null Identifiers" };
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        var brand = new Brand { Slug = Unique("brand"), Name = "Null Identifiers", CategoryId = category.Id };
        db.Brands.Add(brand);
        await db.SaveChangesAsync();

        db.Products.AddRange(
            new Product
            {
                Slug = Unique("product-a"),
                Name = "Product A",
                CategoryId = category.Id,
                BrandId = brand.Id,
                Ibn = null,
                VerificationCode = null,
            },
            new Product
            {
                Slug = Unique("product-b"),
                Name = "Product B",
                CategoryId = category.Id,
                BrandId = brand.Id,
                Ibn = null,
                VerificationCode = null,
            });

        await db.SaveChangesAsync();
        Assert.Equal(2, await db.Products.CountAsync());
    }

    [Fact]
    public async Task CategoryToBrandAndProductToImages_Cascade_WhileProductsRestrict()
    {
        var (categoryId, brandId, productId, imageId) = await CreateCatalogAsync();

        await using (var db = new AppDbContext(_options))
        {
            db.Categories.Remove((await db.Categories.FindAsync(categoryId))!);
            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        }

        await using (var db = new AppDbContext(_options))
        {
            db.Brands.Remove((await db.Brands.FindAsync(brandId))!);
            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        }

        await using (var db = new AppDbContext(_options))
        {
            db.Products.Remove((await db.Products.FindAsync(productId))!);
            await db.SaveChangesAsync();
        }

        await using (var db = new AppDbContext(_options))
        {
            Assert.Null(await db.ProductImages.FindAsync(imageId));

            db.Categories.Remove((await db.Categories.FindAsync(categoryId))!);
            await db.SaveChangesAsync();

            Assert.Null(await db.Brands.FindAsync(brandId));
        }
    }

    [Fact]
    public async Task DariAndEmoji_RoundTripThroughUtf8mb4()
    {
        await using var db = new AppDbContext(_options);
        var category = new Category
        {
            Slug = Unique("dari"),
            Name = "Hair Care",
            NameDari = "مراقبت از مو 🧴",
            NamePashto = "د وېښتانو پاملرنه",
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var reloaded = await db.Categories.AsNoTracking().SingleAsync(c => c.Id == category.Id);
        Assert.Equal("مراقبت از مو 🧴", reloaded.NameDari);
        Assert.Equal("د وېښتانو پاملرنه", reloaded.NamePashto);
    }

    [Fact]
    public async Task DecimalAndDatetime6_RoundTripExactly()
    {
        var timestamp = new DateTime(2026, 9, 26, 6, 47, 31, DateTimeKind.Utc)
            .AddTicks(4_130_380); // 06:47:31.413038

        await using var db = new AppDbContext(_options);
        var category = new Category { Slug = Unique("decimal-cat"), Name = "Decimal" };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        var brand = new Brand { Slug = Unique("decimal-brand"), Name = "Decimal", CategoryId = category.Id };
        db.Brands.Add(brand);
        await db.SaveChangesAsync();

        var product = new Product
        {
            Slug = Unique("decimal-product"),
            Name = "Decimal Product",
            CategoryId = category.Id,
            BrandId = brand.Id,
            Price = 123.45m,
            CompareAtPrice = 150.00m,
            CreatedAt = timestamp,
            UpdatedAt = timestamp,
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var reloaded = await db.Products.AsNoTracking().SingleAsync(p => p.Id == product.Id);
        Assert.Equal(123.45m, reloaded.Price);
        Assert.Equal(150.00m, reloaded.CompareAtPrice);
        Assert.Equal(timestamp.Ticks, reloaded.CreatedAt.Ticks);
    }

    // ------------------------------------------------------------------ helpers

    private async Task<(int CategoryId, int BrandId, int ProductId, int ImageId)> CreateCatalogAsync()
    {
        await using var db = new AppDbContext(_options);
        var category = new Category { Slug = Unique("cascade-cat"), Name = "Cascade" };
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        var brand = new Brand { Slug = Unique("cascade-brand"), Name = "Cascade", CategoryId = category.Id };
        db.Brands.Add(brand);
        await db.SaveChangesAsync();

        var product = new Product
        {
            Slug = Unique("cascade-product"),
            Name = "Cascade Product",
            CategoryId = category.Id,
            BrandId = brand.Id,
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var image = new ProductImage { ProductId = product.Id, Url = "/uploads/cascade.webp" };
        db.ProductImages.Add(image);
        await db.SaveChangesAsync();

        return (category.Id, brand.Id, product.Id, image.Id);
    }

    private async Task<HashSet<string>> UniqueIndexesAsync()
    {
        await using var connection = new MySqlConnection(ConnectionStringFor(_databaseName));
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT TABLE_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'
            GROUP BY TABLE_NAME, INDEX_NAME
            """;
        command.Parameters.AddWithValue("@schema", _databaseName);

        // MariaDB reports table names in the server's own casing (lower case on this
        // Windows install), so compare the identifiers case-insensitively.
        var indexes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            indexes.Add($"{reader.GetString(0)}:{reader.GetString(1)}");
        }

        return indexes;
    }

    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

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
}
