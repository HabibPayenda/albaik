using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 07 - a Brand is delivered as real HTML scoped to its Collection.
///
/// The page's title includes the Collection (the same "Albaik" brand exists in four
/// Collections), its canonical is self-referencing and collection-scoped, and the shell
/// links the Brand's Products. The four seeded Albaik Brand pages must be tellable apart
/// by title and canonical alone.
/// </summary>
public class BrandShellTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;

    public BrandShellTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Brand_ReturnsCollectionScopedTitleCanonicalAndCopy()
    {
        using var client = _factory.CreateClient();
        var brand = await client.GetFromJsonAsync<BrandDto>("/api/catalog/brands/hair-care/albaik");
        Assert.NotNull(brand);

        var html = await SeoShellTestHelpers.ReadHtmlAsync(
            await client.GetAsync("/collections/hair-care/albaik"));

        var expectedTitle = $"{brand!.Name} {brand.CategoryName} — Albaik";
        Assert.Equal(expectedTitle, SeoShellTestHelpers.ElementText(html, "title"));
        Assert.Null(SeoShellTestHelpers.MetaContent(html, "name", "robots"));

        var description = SeoShellTestHelpers.MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);
        Assert.Contains(brand.CategoryName!, description);

        var canonical = SeoShellTestHelpers.Canonical(html);
        Assert.Equal("http://localhost/collections/hair-care/albaik", canonical);
        Assert.Equal(canonical, SeoShellTestHelpers.MetaContent(html, "property", "og:url"));
        Assert.Equal(expectedTitle, SeoShellTestHelpers.MetaContent(html, "property", "og:title"));
        Assert.Equal(description, SeoShellTestHelpers.MetaContent(html, "property", "og:description"));
        Assert.Equal("summary_large_image", SeoShellTestHelpers.MetaContent(html, "name", "twitter:card"));
        SeoShellTestHelpers.AssertAbsoluteUrl(
            SeoShellTestHelpers.MetaContent(html, "property", "og:image"), "OG image");
        Assert.Equal(
            SeoShellTestHelpers.MetaContent(html, "property", "og:image"),
            SeoShellTestHelpers.MetaContent(html, "name", "twitter:image"));

        SeoShellTestHelpers.AssertSingleH1(html);
        Assert.True(SeoShellTestHelpers.ContainsHtmlText(html, brand.Name));
        Assert.True(SeoShellTestHelpers.ContainsHtmlText(html, brand.CategoryName!));
        Assert.Contains($"/collections/{brand.CategorySlug}", html, StringComparison.Ordinal);

        foreach (var product in brand.Products ?? new List<ProductCardDto>())
        {
            Assert.Contains($"/products/{product.Slug}", html, StringComparison.Ordinal);
            Assert.True(SeoShellTestHelpers.ContainsHtmlText(html, product.Name));
        }

        var breadcrumb = SeoShellTestHelpers.SingleNode(html, "BreadcrumbList");
        var items = breadcrumb.GetProperty("itemListElement").EnumerateArray().ToList();
        Assert.Equal(
            new[] { "Home", "Collections", brand.CategoryName, brand.Name },
            items.Select(i => SeoShellTestHelpers.Str(i, "name")));
        Assert.Equal(
            new[]
            {
                "http://localhost/",
                "http://localhost/collections",
                $"http://localhost/collections/{brand.CategorySlug}",
                "http://localhost/collections/hair-care/albaik",
            },
            items.Select(i => SeoShellTestHelpers.Str(i, "item")));

        Assert.Equal(
            items.Select(i => SeoShellTestHelpers.Str(i, "item")),
            SeoShellTestHelpers.NavHrefs(html, "Breadcrumb"));
    }

    [Fact]
    public async Task TheFourAlbaikBrandPages_HaveDistinctTitlesAndCanonicals()
    {
        using var client = _factory.CreateClient();
        var categories = await client.GetFromJsonAsync<List<CategoryDto>>(
            "/api/catalog/categories?withBrands=true");
        Assert.NotNull(categories);

        var albaikBrands = categories!
            .SelectMany(c => (c.Brands ?? new List<BrandDto>())
                .Where(b => b.Name == "Albaik")
                .Select(b => (Collection: c, Brand: b)))
            .ToList();
        Assert.Equal(4, albaikBrands.Count);

        var titles = new List<string>();
        var canonicals = new List<string>();

        foreach (var (collection, brand) in albaikBrands)
        {
            var path = $"/collections/{collection.Slug}/{brand.Slug}";
            var html = await SeoShellTestHelpers.ReadHtmlAsync(await client.GetAsync(path));

            var title = SeoShellTestHelpers.ElementText(html, "title");
            Assert.NotNull(title);
            Assert.Contains(collection.Name, title!);
            titles.Add(title);

            var canonical = SeoShellTestHelpers.Canonical(html);
            Assert.Equal($"http://localhost{path}", canonical);
            canonicals.Add(canonical);
        }

        Assert.Equal(4, titles.Distinct(StringComparer.Ordinal).Count());
        Assert.Equal(4, canonicals.Distinct(StringComparer.Ordinal).Count());
    }

    [Fact]
    public async Task MissingBrand_ReturnsNotFoundNoindex()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/collections/hair-care/not-a-real-brand");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("noindex", SeoShellTestHelpers.MetaContent(html, "name", "robots") ?? "");
    }

    [Fact]
    public async Task MissingCollection_ReturnsNotFoundNoindex()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/collections/not-a-real-collection");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("noindex", SeoShellTestHelpers.MetaContent(html, "name", "robots") ?? "");
    }
}
