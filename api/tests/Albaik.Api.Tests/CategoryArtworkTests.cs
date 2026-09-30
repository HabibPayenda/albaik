using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 03 — a collection's image is chosen in the dashboard and the collection page
/// paints it as the hero's backdrop, falling back to the royal gradient when there is none.
/// The painting lives in the frontend, which has no test harness, so these tests pin the
/// contract that painting depends on, end to end:
///
///   * artwork saved in the dashboard is what the public collection endpoint serves, with
///     no redeploy;
///   * artwork that was never filled in is served as nothing, because the hero decides
///     "no backdrop" from truthiness.
/// </summary>
public class CategoryArtworkTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public CategoryArtworkTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task CollectionArtwork_SavedInDashboard_IsServedOnTheCollectionPageRoute()
    {
        using var admin = _factory.AdminClient();
        var categories = await admin.GetFromJsonAsync<List<CategoryDto>>("/api/admin/categories");
        Assert.NotNull(categories);
        var target = Pick(categories!);

        const string image = "https://cdn.example.test/albaik/collection-hair.jpg";
        await PutArtworkAsync(admin, target, image);

        using var publicClient = _factory.CreateClient();
        // The route the collection page itself fetches.
        var served = await publicClient.GetFromJsonAsync<CategoryDto>(
            $"/api/catalog/categories/{target.Slug}");

        Assert.NotNull(served);
        Assert.Equal(image, served!.ImageUrl);
    }

    /// <summary>
    /// The other half of the fallback: artwork that was never filled in must be served as
    /// nothing, because the collection hero decides "no backdrop" from truthiness. A value
    /// of only spaces is not nothing — it would sail past that guard and ask the browser
    /// for a photograph that can never resolve, a failing request on every visit, where
    /// the hero was built to show the royal gradient instead.
    /// </summary>
    [Fact]
    public async Task CollectionArtwork_BlankOrWhitespace_IsServedAsUnset()
    {
        using var admin = _factory.AdminClient();
        var categories = await admin.GetFromJsonAsync<List<CategoryDto>>("/api/admin/categories");
        Assert.NotNull(categories);
        var target = Pick(categories!);

        await PutArtworkAsync(admin, target, "   ");

        using var publicClient = _factory.CreateClient();
        var served = await publicClient.GetFromJsonAsync<CategoryDto>(
            $"/api/catalog/categories/{target.Slug}");

        Assert.NotNull(served);
        // Empty, not merely blank: the hero gates on truthiness, and "   " is truthy.
        Assert.True(string.IsNullOrEmpty(served!.ImageUrl));
    }

    private static CategoryDto Pick(List<CategoryDto> categories)
    {
        // The public route only serves active collections, so an inactive first row would
        // 404 and throw on the error body instead of failing on an assertion.
        var active = categories.Where(c => c.IsActive).ToList();
        Assert.NotEmpty(active);
        return active[0];
    }

    /// <summary>Re-saves a collection with only its artwork replaced, leaving the rest of
    /// the record as the seeder left it.</summary>
    private static async Task PutArtworkAsync(HttpClient admin, CategoryDto c, string? imageUrl)
    {
        var update = await admin.PutAsJsonAsync($"/api/admin/categories/{c.Id}", new
        {
            name = c.Name,
            nameDari = c.NameDari,
            namePashto = c.NamePashto,
            tagline = c.Tagline,
            description = c.Description,
            imageUrl,
            icon = c.Icon,
            accent = c.Accent,
            sortOrder = c.SortOrder,
            isActive = c.IsActive,
            showInNav = c.ShowInNav,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
    }
}
