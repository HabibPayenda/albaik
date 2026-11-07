using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 12 - every indexable public page has its own title and description, and every
/// description sits in the 120-160 character search-snippet budget. Expected paths are
/// read from the same catalogue and page APIs the SPA consumes, so a newly seeded
/// Collection, Brand, Product or page is covered automatically.
/// </summary>
public class MetadataRulesTests : IClassFixture<AlbaikApiFactory>
{
    private static readonly HashSet<string> NamedContentRoutes = new(StringComparer.OrdinalIgnoreCase)
    {
        "about", "quality", "safety", "distribution", "privacy", "terms",
    };

    private readonly AlbaikApiFactory _factory;
    public MetadataRulesTests(AlbaikApiFactory factory) => _factory = factory;

    private sealed record PageSummary(string Slug, string Title);

    private sealed record ProductList(List<ProductCardDto> Items);

    [Fact]
    public async Task EveryIndexablePublicPage_HasAUniqueTitleAndDescriptionWithinBudget()
    {
        using var client = _factory.CreateClient();

        var paths = await PublicPathsAsync(client);

        var titles = new List<string>();
        var descriptions = new List<string>();

        foreach (var path in paths)
        {
            var html = await SeoShellTestHelpers.ReadHtmlAsync(await client.GetAsync(path));

            var title = SeoShellTestHelpers.ElementText(html, "title");
            Assert.False(string.IsNullOrWhiteSpace(title), $"{path} must have a title");
            titles.Add(title!);

            Assert.Null(SeoShellTestHelpers.MetaContent(html, "name", "robots"));

            var description = SeoShellTestHelpers.MetaContent(html, "name", "description");
            Assert.False(string.IsNullOrWhiteSpace(description),
                $"{path} must have a meta description");
            Assert.InRange(description!.Length, 120, 160);
            descriptions.Add(description);
        }

        AssertUnique(titles, "title");
        AssertUnique(descriptions, "description");
    }

    private static void AssertUnique(List<string> values, string kind)
    {
        var duplicates = values
            .GroupBy(value => value, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => $"'{group.Key}' on {group.Count()} pages")
            .ToList();

        Assert.True(duplicates.Count == 0,
            $"Every public page needs its own {kind}. Duplicates: {string.Join("; ", duplicates)}");
    }

    private static async Task<List<string>> PublicPathsAsync(HttpClient client)
    {
        var paths = new List<string> { "/", "/collections", "/contact" };

        var categories = await client.GetFromJsonAsync<List<CategoryDto>>(
            "/api/catalog/categories?withBrands=true");
        Assert.NotNull(categories);
        foreach (var category in categories!)
        {
            paths.Add($"/collections/{category.Slug}");
            foreach (var brand in category.Brands ?? new List<BrandDto>())
                paths.Add($"/collections/{category.Slug}/{brand.Slug}");
        }

        var products = await client.GetFromJsonAsync<ProductList>(
            "/api/catalog/products?pageSize=100");
        Assert.NotNull(products);
        foreach (var product in products!.Items)
            paths.Add($"/products/{product.Slug}");

        var pages = await client.GetFromJsonAsync<List<PageSummary>>("/api/pages");
        Assert.NotNull(pages);
        foreach (var page in pages!)
        {
            paths.Add(NamedContentRoutes.Contains(page.Slug)
                ? $"/{page.Slug}"
                : $"/guides/{page.Slug}");
        }

        return paths;
    }
}
