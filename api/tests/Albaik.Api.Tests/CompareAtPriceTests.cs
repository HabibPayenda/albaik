using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 04 — a compare-at price is a figure staff fill in on the product editor, and
/// the catalogue never showed it. The card and the detail page now strike it through
/// beside the current price when (and only when) it was the higher one, which means the
/// pair of numbers has to survive the trip from the dashboard to both public routes the
/// pages read. The painting lives in the frontend, which has no test harness, so these
/// tests pin that contract.
/// </summary>
public class CompareAtPriceTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public CompareAtPriceTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task CompareAtPrice_SavedInDashboard_IsServedOnTheDetailPageRoute()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();
        var target = await SaveAsync(admin, site, price: 120m, compareAt: 150m);

        var served = await site.GetFromJsonAsync<ProductDetailDto>(
            $"/api/catalog/products/{target.Slug}");

        Assert.NotNull(served);
        Assert.Equal(120m, served!.Price);
        Assert.Equal(150m, served.CompareAtPrice);
    }

    [Fact]
    public async Task CompareAtPrice_SavedInDashboard_IsServedOnTheCardRoute()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();
        var target = await SaveAsync(admin, site, price: 120m, compareAt: 150m);

        var listing = await site.GetFromJsonAsync<ProductList>(
            $"/api/catalog/products?category={target.CategorySlug}&brand={target.BrandSlug}&pageSize=100");

        Assert.NotNull(listing);
        var card = Assert.Single(listing!.Items, p => p.Slug == target.Slug);
        Assert.Equal(120m, card.Price);
        Assert.Equal(150m, card.CompareAtPrice);
    }

    /// <summary>
    /// Picks a product the public catalogue actually lists — so the card route will serve
    /// it — reads it whole through the admin API, and re-saves it with the price pair
    /// under test. The slug is deliberately not posted: leaving it out keeps the address
    /// the assertions use.
    /// </summary>
    private static async Task<ProductDetailDto> SaveAsync(
        HttpClient admin, HttpClient site, decimal price, decimal compareAt)
    {
        var listing = await site.GetFromJsonAsync<ProductList>("/api/catalog/products?pageSize=100");
        Assert.NotNull(listing);
        Assert.NotEmpty(listing!.Items);

        var detail = await admin.GetFromJsonAsync<ProductDetailDto>(
            $"/api/admin/products/{listing.Items[0].Id}");
        Assert.NotNull(detail);

        var update = await admin.PutAsJsonAsync($"/api/admin/products/{detail!.Id}", new
        {
            name = detail.Name,
            categoryId = detail.CategoryId,
            brandId = detail.BrandId,
            subtitle = detail.Subtitle,
            formulationLabel = detail.FormulationLabel,
            shortDescription = detail.ShortDescription,
            description = detail.Description,
            size = detail.Size,
            price,
            compareAtPrice = compareAt,
            currency = detail.Currency,
            priceNote = detail.PriceNote,
            rating = detail.Rating,
            reviewCount = detail.ReviewCount,
            badge = detail.Badge,
            badgeStyle = detail.BadgeStyle,
            stockStatus = detail.StockStatus,
            imageUrl = detail.ImageUrl,
            accentFrom = detail.AccentFrom,
            accentTo = detail.AccentTo,
            benefits = detail.Benefits,
            ingredients = detail.Ingredients,
            howToUse = detail.HowToUse,
            safetyNote = detail.SafetyNote,
            suitableFor = detail.SuitableFor,
            isFeatured = detail.IsFeatured,
            isActive = detail.IsActive,
            sortOrder = detail.SortOrder,
            images = detail.Images.Select(i => new { url = i.Url, alt = i.Alt, sortOrder = i.SortOrder }),
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        return detail with { Price = price, CompareAtPrice = compareAt };
    }

    /// <summary>The paginated shape both the admin and the public product list return.</summary>
    private record ProductList(List<ProductCardDto> Items, int Total);
}
