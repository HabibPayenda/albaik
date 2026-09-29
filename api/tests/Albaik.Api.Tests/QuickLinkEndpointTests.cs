using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Microsoft.Data.Sqlite;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The header quick-links seam: the mega menu's footer strip is no longer hardcoded in
/// the frontend — it lives in the navigation resource, edited from the Menus & footer
/// screen like any other link. The shared seeded database keeps the scenarios
/// independent, so assertions never depend on rows another test mutated.
/// </summary>
public class QuickLinkEndpointTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public QuickLinkEndpointTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task QuickLinks_AdminCrud_RoundTrips()
    {
        using var client = _factory.AdminClient();

        var create = await client.PostAsJsonAsync("/api/admin/quick-links", new QuickLinkInput
        {
            Label = "Seasonal Offers",
            Path = "/offers",
            SortOrder = 9,
            OpenInNewTab = true,
            IsActive = true,
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<QuickLinkDto>();
        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("Seasonal Offers", created.Label);
        Assert.Equal("/offers", created.Path);
        Assert.Equal(9, created.SortOrder);
        Assert.True(created.OpenInNewTab);

        var list = await client.GetFromJsonAsync<List<QuickLinkDto>>("/api/admin/quick-links");
        Assert.NotNull(list);
        Assert.Contains(list, l => l.Id == created.Id);

        var update = await client.PutAsJsonAsync($"/api/admin/quick-links/{created.Id}", new QuickLinkInput
        {
            Label = "Seasonal Offers — Hidden",
            Path = "/offers-hide",
            SortOrder = 3,
            OpenInNewTab = false,
            IsActive = false,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await update.Content.ReadFromJsonAsync<QuickLinkDto>();
        Assert.NotNull(updated);
        Assert.Equal("Seasonal Offers — Hidden", updated.Label);
        Assert.Equal("/offers-hide", updated.Path);
        Assert.Equal(3, updated.SortOrder);
        Assert.False(updated.IsActive);
        Assert.False(updated.OpenInNewTab);

        var delete = await client.DeleteAsync($"/api/admin/quick-links/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);

        var after = await client.GetFromJsonAsync<List<QuickLinkDto>>("/api/admin/quick-links");
        Assert.DoesNotContain(after!, l => l.Id == created.Id);
    }

    [Fact]
    public async Task QuickLinks_RequireAdminAuth()
    {
        using var client = _factory.CreateClient();

        var list = await client.GetAsync("/api/admin/quick-links");
        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);
        var create = await client.PostAsJsonAsync("/api/admin/quick-links", new QuickLinkInput { Label = "X", Path = "/x" });
        Assert.Equal(HttpStatusCode.Unauthorized, create.StatusCode);
    }

    [Fact]
    public async Task QuickLinks_Reorder_ReflectedOnBootstrapImmediately()
    {
        using var client = _factory.AdminClient();

        var before = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");
        Assert.NotNull(before!.QuickLinks);
        Assert.True(before.QuickLinks.Count >= 4, "bootstrap should carry the seeded quick links");
        var reversed = Enumerable.Reverse(before.QuickLinks.Select(q => q.Id)).ToList();

        var response = await client.PutAsJsonAsync(
            "/api/admin/reorder", new { resource = "quick-links", ids = reversed });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var after = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");
        Assert.Equal(reversed, after!.QuickLinks.Select(q => q.Id).ToList());
    }

    [Fact]
    public async Task Bootstrap_ServesDefaultQuickLinksByDefault()
    {
        using var client = _factory.CreateClient();
        var bootstrap = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        var pairs = bootstrap!.QuickLinks.Select(q => (q.Label, q.Path)).ToHashSet();
        Assert.Equal(new[]
        {
            ("All products", "/collections"),
            ("Shampoo guide", "/guides/shampoo-guide"),
            ("Quality & Verification", "/quality"),
            ("Distribution & Wholesale", "/distribution"),
        }.ToHashSet(), pairs);
        Assert.All(bootstrap.QuickLinks, q => Assert.True(q.IsActive));
        Assert.All(bootstrap.QuickLinks, q => Assert.False(q.OpenInNewTab));
        Assert.True(bootstrap.HasQuickLinks);

        var orders = bootstrap.QuickLinks.Select(q => q.SortOrder).ToList();
        Assert.Equal(orders.OrderBy(x => x), orders);
    }

    [Fact]
    public async Task UpgradedDatabase_GainsQuickLinksTableAndDefaults()
    {
        // Simulate a deployment that predates the feature: boot once to produce a real
        // seeded database, then knock the newly added table out by hand, exactly the state
        // an existing site (SchemaGuard adds the empty table, the category gate skips the
        // bulk seed) would be in on the first boot after upgrade. Reboot must re-create the
        // table and top the defaults up.
        var dbPath = Path.Combine(Path.GetTempPath(), $"albaik-upgrade-{Guid.NewGuid():N}.db");
        using (var first = AlbaikApiFactory.ForUpgradeScenario(dbPath, keepDatabaseForFirstBoot: true))
        using (var client = first.CreateClient())
        {
            var ok = await client.GetAsync("/api/home");
            ok.EnsureSuccessStatusCode();
        }

        await using (var connection = new SqliteConnection($"Data Source={dbPath}"))
        {
            await connection.OpenAsync();
            await using var drop = connection.CreateCommand();
            drop.CommandText = "DROP TABLE \"QuickLinks\"";
            await drop.ExecuteNonQueryAsync();
        }

        using var factory = AlbaikApiFactory.ForUpgradeScenario(dbPath, keepDatabaseForFirstBoot: false);
        using var booted = factory.AdminClient();
        var bootstrap = await booted.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        Assert.NotNull(bootstrap);
        Assert.True(bootstrap!.HasQuickLinks, "upgrade must top the defaults back up");
        var labels = bootstrap.QuickLinks.Select(q => q.Label).ToHashSet();
        Assert.Equal(new[] { "All products", "Shampoo guide", "Quality & Verification", "Distribution & Wholesale" }, labels);
    }
}