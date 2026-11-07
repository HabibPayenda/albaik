using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 07 - a Product is delivered as real HTML with its name, description, image,
/// Brand, Collection, SKU and the benefits / usage / safety copy the SPA hides behind
/// tabs, plus Product and BreadcrumbList JSON-LD.
///
/// The IBN is only marked up as gtin13 when it is a valid EAN-13. The seeded catalogue
/// has no IBN, and the one stored in the legacy import fails the check digit, so the
/// test explicitly sets a known-bad value and then a known-good one before restoring.
/// </summary>
public class ProductShellTests : IClassFixture<AlbaikApiFactory>
{
    private const string ProductSlug = "albaik-anti-dandruff-shampoo";

    private readonly AlbaikApiFactory _factory;

    public ProductShellTests(AlbaikApiFactory factory) => _factory = factory;

    private sealed record ProductList(List<ProductCardDto> Items, int Total);

    [Fact]
    public async Task Product_ReturnsProductJsonLdAndAllCrawlableCopy()
    {
        using var client = _factory.CreateClient();
        var product = await client.GetFromJsonAsync<ProductDetailDto>(
            $"/api/catalog/products/{ProductSlug}");
        Assert.NotNull(product);

        var html = await SeoShellTestHelpers.ReadHtmlAsync(
            await client.GetAsync($"/products/{ProductSlug}"));

        Assert.Equal($"{product!.Name} — Albaik", SeoShellTestHelpers.ElementText(html, "title"));
        Assert.Null(SeoShellTestHelpers.MetaContent(html, "name", "robots"));

        var description = SeoShellTestHelpers.MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);
        Assert.Contains("dandruff", description, StringComparison.OrdinalIgnoreCase);

        var canonical = SeoShellTestHelpers.Canonical(html);
        Assert.Equal($"http://localhost/products/{ProductSlug}", canonical);
        Assert.Equal(canonical, SeoShellTestHelpers.MetaContent(html, "property", "og:url"));
        Assert.Equal($"{product.Name} — Albaik",
            SeoShellTestHelpers.MetaContent(html, "property", "og:title"));
        Assert.Equal(description,
            SeoShellTestHelpers.MetaContent(html, "property", "og:description"));

        // No photography in the seed, so the dedicated 1200x630 social asset is used.
        Assert.Equal("http://localhost/social-default.png",
            SeoShellTestHelpers.MetaContent(html, "property", "og:image"));
        Assert.Equal("1200", SeoShellTestHelpers.MetaContent(html, "property", "og:image:width"));
        Assert.Equal("630", SeoShellTestHelpers.MetaContent(html, "property", "og:image:height"));
        Assert.Equal("summary_large_image", SeoShellTestHelpers.MetaContent(html, "name", "twitter:card"));

        SeoShellTestHelpers.AssertSingleH1(html);
        Assert.True(SeoShellTestHelpers.ContainsHtmlText(html, product.Name));

        foreach (var benefit in product.Benefits)
            Assert.True(
                SeoShellTestHelpers.ContainsHtmlText(html, benefit),
                $"benefit '{benefit}' must be in the shell");
        Assert.True(SeoShellTestHelpers.ContainsHtmlText(html, product.HowToUse!));
        Assert.True(SeoShellTestHelpers.ContainsHtmlText(html, product.SafetyNote!));

        // Brand and Collection links put the Product back in the hierarchy.
        Assert.Contains($"/collections/{product.CategorySlug}", html, StringComparison.Ordinal);
        Assert.Contains(
            $"/collections/{product.CategorySlug}/{product.BrandSlug}",
            html,
            StringComparison.Ordinal);

        var productNode = SeoShellTestHelpers.SingleNode(html, "Product");
        Assert.Equal(product.Name, SeoShellTestHelpers.Str(productNode, "name"));
        Assert.Equal(ProductSlug, SeoShellTestHelpers.Str(productNode, "sku"));
        Assert.Equal(canonical, SeoShellTestHelpers.Str(productNode, "url"));
        Assert.Equal(product.CategoryName, SeoShellTestHelpers.Str(productNode, "category"));
        Assert.False(string.IsNullOrWhiteSpace(SeoShellTestHelpers.Str(productNode, "description")));

        var image = SeoShellTestHelpers.Str(productNode, "image");
        SeoShellTestHelpers.AssertAbsoluteUrl(image, "Product image");
        Assert.Equal("http://localhost/social-default.png", image);

        var brandNode = productNode.GetProperty("brand");
        Assert.Equal("Brand", SeoShellTestHelpers.Str(brandNode, "@type"));
        Assert.Equal(product.BrandName, SeoShellTestHelpers.Str(brandNode, "name"));

        Assert.False(productNode.TryGetProperty("offers", out _));
        Assert.False(productNode.TryGetProperty("gtin13", out _));
        Assert.False(productNode.TryGetProperty("aggregateRating", out _));
        Assert.False(productNode.TryGetProperty("review", out _));

        var breadcrumb = SeoShellTestHelpers.SingleNode(html, "BreadcrumbList");
        var items = breadcrumb.GetProperty("itemListElement").EnumerateArray().ToList();
        Assert.Equal(
            new[] { "Home", "Collections", product.CategoryName, product.BrandName, product.Name },
            items.Select(i => SeoShellTestHelpers.Str(i, "name")));
        Assert.Equal(
            new[]
            {
                "http://localhost/",
                "http://localhost/collections",
                $"http://localhost/collections/{product.CategorySlug}",
                $"http://localhost/collections/{product.CategorySlug}/{product.BrandSlug}",
                canonical,
            },
            items.Select(i => SeoShellTestHelpers.Str(i, "item")));
    }

    [Fact]
    public async Task Gtin13_IsEmittedOnlyForAValidEan13Ibn()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();

        var product = await ProductAsync(admin);
        var originalIbn = product.Ibn;

        try
        {
            // Digits only and unique, but the check digit is wrong (should be 8, not 6).
            await SetIbnAsync(admin, product, "6291104123456");
            var invalid = await SeoShellTestHelpers.ReadHtmlAsync(
                await site.GetAsync($"/products/{product.Slug}"));
            var invalidProduct = SeoShellTestHelpers.SingleNode(invalid, "Product");
            Assert.False(invalidProduct.TryGetProperty("gtin13", out _));

            // The same twelve digits with the correct EAN-13 check digit.
            await SetIbnAsync(admin, product, "6291104123458");
            var valid = await SeoShellTestHelpers.ReadHtmlAsync(
                await site.GetAsync($"/products/{product.Slug}"));
            var validProduct = SeoShellTestHelpers.SingleNode(valid, "Product");
            Assert.Equal("6291104123458", SeoShellTestHelpers.Str(validProduct, "gtin13"));
        }
        finally
        {
            await SetIbnAsync(admin, product, originalIbn);
        }
    }

    [Fact]
    public async Task MissingProduct_ReturnsNotFoundNoindex()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/products/not-a-real-product");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("noindex", SeoShellTestHelpers.MetaContent(html, "name", "robots") ?? "");
        Assert.Contains("not found", SeoShellTestHelpers.ElementText(html, "title") ?? "",
            StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InactiveProduct_ReturnsNotFoundNoindex()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();

        var product = await ProductAsync(admin);
        try
        {
            await PutAsync(admin, product, product.Ibn, isActive: false);

            var response = await site.GetAsync($"/products/{product.Slug}");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            var html = await response.Content.ReadAsStringAsync();
            Assert.Contains(
                "noindex", SeoShellTestHelpers.MetaContent(html, "name", "robots") ?? "");
        }
        finally
        {
            await PutAsync(admin, product, product.Ibn, isActive: true);
        }
    }

    // ------------------------------------------------------------------ helpers

    private async Task<ProductDetailDto> ProductAsync(HttpClient admin)
    {
        var listing = await admin.GetFromJsonAsync<ProductList>("/api/admin/products");
        Assert.NotNull(listing);
        var card = Assert.Single(listing!.Items, p => p.Slug == ProductSlug);
        var detail = await admin.GetFromJsonAsync<ProductDetailDto>($"/api/admin/products/{card.Id}");
        Assert.NotNull(detail);
        return detail!;
    }

    private static async Task SetIbnAsync(
        HttpClient admin, ProductDetailDto product, string? ibn)
    {
        var response = await PutAsync(admin, product, ibn, product.IsActive);
        response.EnsureSuccessStatusCode();
    }

    private static Task<HttpResponseMessage> PutAsync(
        HttpClient admin, ProductDetailDto product, string? ibn, bool isActive)
        => admin.PutAsJsonAsync($"/api/admin/products/{product.Id}", Input(product, ibn, isActive));

    private static ProductInput Input(ProductDetailDto d, string? ibn, bool isActive) => new()
    {
        Name = d.Name,
        Slug = d.Slug,
        CategoryId = d.CategoryId,
        BrandId = d.BrandId,
        Subtitle = d.Subtitle,
        FormulationLabel = d.FormulationLabel,
        ShortDescription = d.ShortDescription,
        Description = d.Description,
        Size = d.Size,
        Price = d.Price,
        CompareAtPrice = d.CompareAtPrice,
        Currency = d.Currency,
        PriceNote = d.PriceNote,
        Rating = d.Rating,
        ReviewCount = d.ReviewCount,
        Badge = d.Badge,
        BadgeStyle = d.BadgeStyle,
        StockStatus = d.StockStatus,
        ImageUrl = d.ImageUrl,
        AccentFrom = d.AccentFrom,
        AccentTo = d.AccentTo,
        Benefits = d.Benefits,
        Ingredients = d.Ingredients,
        HowToUse = d.HowToUse,
        SafetyNote = d.SafetyNote,
        SuitableFor = d.SuitableFor,
        Ibn = ibn,
        IsFeatured = d.IsFeatured,
        IsActive = isActive,
        SortOrder = d.SortOrder,
        Images = d.Images.Select(i => new ProductImageInput
        {
            Url = i.Url,
            Alt = i.Alt,
            SortOrder = i.SortOrder,
        }).ToList(),
    };
}
