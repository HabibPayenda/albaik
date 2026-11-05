using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Startup now owns the schema through migrations, so the second boot of an existing
/// database must be a no-op: migrations already applied, seeding skipped. Booting the
/// same database twice at the HTTP seam proves both without inspecting EF internals.
/// </summary>
public class StartupMigrationTests
{
    [Fact]
    public async Task SecondStart_DoesNotDuplicateSeededContent()
    {
        var databaseName = $"albaik_restart_{Guid.NewGuid():N}";
        int seededTotal;
        int seededCategories;

        using (var first = AlbaikApiFactory.ForUpgradeScenario(databaseName, keepDatabaseForFirstBoot: true))
        using (var client = first.CreateClient())
        {
            var products = await client.GetFromJsonAsync<ProductPage>("/api/catalog/products?pageSize=100");
            var categories = await client.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories");

            Assert.NotNull(products);
            Assert.NotNull(categories);
            seededTotal = products!.Total;
            seededCategories = categories!.Count;
            Assert.True(seededTotal > 0);
            Assert.Equal(4, seededCategories);
        }

        using var second = AlbaikApiFactory.ForUpgradeScenario(databaseName, keepDatabaseForFirstBoot: false);
        // AdminClient signs in, so a second seed that duplicated the admin username
        // would also fail the unique index before this line could pass.
        using var admin = second.AdminClient();

        var after = await admin.GetFromJsonAsync<ProductPage>("/api/catalog/products?pageSize=100");
        var categoriesAfter = await admin.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories");

        Assert.Equal(seededTotal, after!.Total);
        Assert.Equal(seededCategories, categoriesAfter!.Count);
    }

    private sealed record ProductPage(List<object> Items, int Total, int Page, int PageSize, int TotalPages);
}
