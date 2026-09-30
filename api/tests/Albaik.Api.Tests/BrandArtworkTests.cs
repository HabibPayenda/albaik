using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 02 — a brand's banner, logo and accent are chosen in the dashboard, and the
/// brand page paints them from data: the banner becomes the hero's backdrop, the logo sits
/// beside the name, and the accent tints the hero's ambient light. The painting lives in
/// the frontend, which has no test harness, so these tests pin the contract that painting
/// depends on, end to end:
///
///   * artwork saved in the dashboard is what the public brand endpoint serves, with no
///     redeploy;
///   * the banner travels on the brand detail route the page actually fetches, not merely
///     on the collection route beside it.
/// </summary>
public class BrandArtworkTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public BrandArtworkTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task BrandArtwork_SavedInDashboard_IsServedOnTheBrandPageRoute()
    {
        using var admin = _factory.AdminClient();
        var brands = await admin.GetFromJsonAsync<List<BrandDto>>("/api/admin/brands");
        Assert.NotNull(brands);

        // The catalogue carries the same slug in more than one collection, so the pair is
        // the identity — the same way the brand page addresses it.
        var candidates = brands!.Where(b => b.IsActive && !string.IsNullOrEmpty(b.CategorySlug)).ToList();
        Assert.NotEmpty(candidates);
        var target = candidates[0];
        var categorySlug = target.CategorySlug!;
        var brandSlug = target.Slug;

        const string logo = "https://cdn.example.test/albaik/logo.png";
        const string banner = "https://cdn.example.test/albaik/banner.jpg";
        const string accent = "gold";

        var update = await admin.PutAsJsonAsync($"/api/admin/brands/{target.Id}", new
        {
            name = target.Name,
            categoryId = target.CategoryId,
            tagline = target.Tagline,
            description = target.Description,
            logoUrl = logo,
            imageUrl = banner,
            accent,
            sortOrder = target.SortOrder,
            isActive = target.IsActive,
            isFeatured = target.IsFeatured,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        using var publicClient = _factory.CreateClient();
        var served = await publicClient.GetFromJsonAsync<BrandDto>(
            $"/api/catalog/brands/{categorySlug}/{brandSlug}");

        Assert.NotNull(served);
        Assert.Equal(logo, served!.LogoUrl);
        Assert.Equal(banner, served.ImageUrl);
        Assert.Equal(accent, served.Accent);
    }

    /// <summary>
    /// The other half of the fallback: artwork that was never filled in must be served as
    /// nothing, because the brand page decides "no banner" from truthiness. A value of
    /// only spaces is not nothing — it would sail past that guard and ask the browser for
    /// a photograph that can never resolve, a failing request on every visit, where the
    /// hero was built to show the royal gradient instead.
    /// </summary>
    [Fact]
    public async Task BrandArtwork_BlankOrWhitespace_IsServedAsUnset()
    {
        using var admin = _factory.AdminClient();
        var brands = await admin.GetFromJsonAsync<List<BrandDto>>("/api/admin/brands");
        Assert.NotNull(brands);
        var candidates = brands!.Where(b => b.IsActive && !string.IsNullOrEmpty(b.CategorySlug)).ToList();
        Assert.NotEmpty(candidates);
        var target = candidates[0];

        var update = await admin.PutAsJsonAsync($"/api/admin/brands/{target.Id}", new
        {
            name = target.Name,
            categoryId = target.CategoryId,
            tagline = target.Tagline,
            description = target.Description,
            logoUrl = "   ",
            imageUrl = "   ",
            accent = target.Accent,
            sortOrder = target.SortOrder,
            isActive = target.IsActive,
            isFeatured = target.IsFeatured,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        using var publicClient = _factory.CreateClient();
        var served = await publicClient.GetFromJsonAsync<BrandDto>(
            $"/api/catalog/brands/{target.CategorySlug}/{target.Slug}");

        Assert.NotNull(served);
        // Empty, not merely blank: the brand page gates on truthiness, and "   " is truthy.
        Assert.True(string.IsNullOrEmpty(served!.LogoUrl));
        Assert.True(string.IsNullOrEmpty(served.ImageUrl));
    }
}
