using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 06 - the Collections index and each Collection are delivered as real HTML.
///
/// The tests assert what a crawler receives over HTTP: status, title, description,
/// canonical, robots directive, Open Graph/Twitter tags, ItemList JSON-LD and crawlable
/// links. Expected content is read from the same catalogue endpoints the SPA consumes,
/// so the shell cannot drift from the hydrated page (no cloaking) and the ordering and
/// counts are the ones visitors see.
/// </summary>
public class CollectionsShellTests : IClassFixture<AlbaikApiFactory>
{
    private const string CollectionsTitle = "Collections — Albaik";

    private readonly AlbaikApiFactory _factory;
    public CollectionsShellTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task CollectionsIndex_ReturnsHtmlWithItsOwnMetadataAndCollectionItemList()
    {
        using var client = _factory.CreateClient();
        var categories = await client.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories");
        Assert.NotNull(categories);
        Assert.NotEmpty(categories!);

        var response = await client.GetAsync("/collections");
        var html = await ReadHtmlAsync(response);

        Assert.Equal(CollectionsTitle, ElementText(html, "title"));
        Assert.Null(MetaContent(html, "name", "robots"));

        var description = MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);
        Assert.Contains("Hair Care", description);

        var canonical = Canonical(html);
        Assert.Equal("http://localhost/collections", canonical);
        Assert.Equal(canonical, MetaContent(html, "property", "og:url"));
        Assert.Equal(CollectionsTitle, MetaContent(html, "property", "og:title"));
        Assert.Equal(description, MetaContent(html, "property", "og:description"));
        Assert.Equal("Albaik Group of Companies", MetaContent(html, "property", "og:site_name"));
        Assert.Equal("summary_large_image", MetaContent(html, "name", "twitter:card"));
        AssertAbsoluteUrl(MetaContent(html, "property", "og:image"), "OG image");
        Assert.Equal(
            MetaContent(html, "property", "og:image"),
            MetaContent(html, "name", "twitter:image"));

        var itemList = Assert.Single(GraphNodes(html), node => Str(node, "@type") == "ItemList");
        var items = itemList.GetProperty("itemListElement").EnumerateArray().ToList();
        Assert.Equal(categories!.Select(c => c.Name), items.Select(i => Str(i, "name")));
        Assert.Equal(
            categories.Select(c => $"http://localhost/collections/{c.Slug}"),
            items.Select(i => Str(i, "url")));
    }

    [Fact]
    public async Task CollectionsIndex_LinksEveryActiveCollectionAndItsBrands()
    {
        using var client = _factory.CreateClient();
        var categories = await client.GetFromJsonAsync<List<CategoryDto>>(
            "/api/catalog/categories?withBrands=true");
        Assert.NotNull(categories);

        var html = await ReadHtmlAsync(await client.GetAsync("/collections"));
        Assert.Equal(1, Regex.Matches(html, "<h1\\b", RegexOptions.IgnoreCase).Count);

        foreach (var category in categories!)
        {
            Assert.Contains($"/collections/{category.Slug}", html, StringComparison.Ordinal);
            Assert.True(ContainsHtmlText(html, category.Name));

            foreach (var brand in category.Brands ?? new List<BrandDto>())
            {
                Assert.Contains(
                    $"/collections/{category.Slug}/{brand.Slug}",
                    html,
                    StringComparison.Ordinal);
            }
        }
    }

    [Fact]
    public async Task Collection_ReturnsHtmlWithItsOwnMetadataAndProductItemList()
    {
        using var client = _factory.CreateClient();
        var category = await client.GetFromJsonAsync<CategoryDto>("/api/catalog/categories/hair-care");
        var products = await ProductsAsync(client, "category=hair-care&pageSize=48");
        Assert.NotNull(category);
        Assert.NotEmpty(products);

        var html = await ReadHtmlAsync(await client.GetAsync("/collections/hair-care"));

        Assert.Equal($"{category!.Name} — Albaik", ElementText(html, "title"));
        Assert.Null(MetaContent(html, "name", "robots"));

        var description = MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);
        Assert.Equal(category.Description, description);

        var canonical = Canonical(html);
        Assert.Equal("http://localhost/collections/hair-care", canonical);
        Assert.Equal(canonical, MetaContent(html, "property", "og:url"));
        Assert.Equal($"{category.Name} — Albaik", MetaContent(html, "property", "og:title"));
        Assert.Equal(description, MetaContent(html, "property", "og:description"));
        AssertAbsoluteUrl(MetaContent(html, "property", "og:image"), "OG image");
        Assert.Equal("summary_large_image", MetaContent(html, "name", "twitter:card"));

        var itemList = Assert.Single(GraphNodes(html), node => Str(node, "@type") == "ItemList");
        var items = itemList.GetProperty("itemListElement").EnumerateArray().ToList();
        Assert.Equal(products.Select(p => p.Name), items.Select(i => Str(i, "name")));
        Assert.Equal(
            products.Select(p => $"http://localhost/products/{p.Slug}"),
            items.Select(i => Str(i, "url")));

        // A Collection carries Home > Collections > Collection, visible and in JSON-LD.
        var breadcrumb = Assert.Single(
            SeoShellTestHelpers.GraphNodes(html), node => Str(node, "@type") == "BreadcrumbList");
        var crumbs = breadcrumb.GetProperty("itemListElement").EnumerateArray().ToList();
        Assert.Equal(
            new[] { "Home", "Collections", category.Name },
            crumbs.Select(i => Str(i, "name")));
        Assert.Equal(
            new[]
            {
                "http://localhost/",
                "http://localhost/collections",
                $"http://localhost/collections/{category.Slug}",
            },
            crumbs.Select(i => Str(i, "item")));
        Assert.Equal(
            crumbs.Select(i => Str(i, "item")),
            SeoShellTestHelpers.NavHrefs(html, "Breadcrumb"));
    }

    [Fact]
    public async Task CollectionsIndex_RendersCrawlablePaginationLinks()
    {
        using var client = _factory.CreateClient();

        var first = await ReadHtmlAsync(await client.GetAsync("/collections"));
        var firstPages = SeoShellTestHelpers.NavHrefs(first, "Pagination");
        Assert.Contains("/collections?page=2", firstPages);
        Assert.Contains("/collections", firstPages);
        Assert.Contains(
            "aria-current=\"page\"", SeoShellTestHelpers.NavBody(first, "Pagination"),
            StringComparison.OrdinalIgnoreCase);

        // Page two keeps the same query contract and links back to page one.
        var second = await ReadHtmlAsync(await client.GetAsync("/collections?page=2"));
        var secondPages = SeoShellTestHelpers.NavHrefs(second, "Pagination");
        Assert.Contains("/collections", secondPages);
        Assert.Contains("/collections?page=2", secondPages);
    }

    [Fact]
    public async Task Collection_LinksItsBrandsAndProducts()
    {
        using var client = _factory.CreateClient();
        var category = await client.GetFromJsonAsync<CategoryDto>("/api/catalog/categories/hair-care");
        var products = await ProductsAsync(client, "category=hair-care&pageSize=48");
        Assert.NotNull(category);

        var html = await ReadHtmlAsync(await client.GetAsync("/collections/hair-care"));
        Assert.Equal(1, Regex.Matches(html, "<h1\\b", RegexOptions.IgnoreCase).Count);

        foreach (var brand in category!.Brands ?? new List<BrandDto>())
        {
            Assert.Contains(
                $"/collections/{category.Slug}/{brand.Slug}",
                html,
                StringComparison.Ordinal);
        }

        foreach (var product in products)
        {
            Assert.Contains($"/products/{product.Slug}", html, StringComparison.Ordinal);
            Assert.True(ContainsHtmlText(html, product.Name));
        }
    }

    [Fact]
    public async Task FilteredCollectionView_CanonicalisesToTheCollectionUrl()
    {
        using var client = _factory.CreateClient();
        var products = await ProductsAsync(client, "category=hair-care&pageSize=12");

        var html = await ReadHtmlAsync(await client.GetAsync("/collections?category=hair-care"));

        Assert.Equal(CollectionsTitle, ElementText(html, "title"));
        Assert.Equal("http://localhost/collections/hair-care", Canonical(html));
        Assert.Null(MetaContent(html, "name", "robots"));

        // The filtered view shows the same products as the catalogue API for that filter.
        foreach (var product in products)
            Assert.Contains($"/products/{product.Slug}", html, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SearchView_IsNoindexFollowAndSelfCanonical()
    {
        using var client = _factory.CreateClient();
        var products = await ProductsAsync(client, "search=shampoo&pageSize=12");

        var html = await ReadHtmlAsync(await client.GetAsync("/collections?search=shampoo"));

        Assert.Equal("http://localhost/collections?search=shampoo", Canonical(html));
        Assert.Equal("noindex, follow", MetaContent(html, "name", "robots"));

        foreach (var product in products)
            Assert.Contains($"/products/{product.Slug}", html, StringComparison.Ordinal);
    }

    [Fact]
    public async Task PaginatedIndex_SelfCanonicalisesWithThePageParameter()
    {
        using var client = _factory.CreateClient();
        var products = await ProductsAsync(client, "page=2&pageSize=12");
        Assert.NotEmpty(products);

        var html = await ReadHtmlAsync(await client.GetAsync("/collections?page=2"));

        Assert.Equal("http://localhost/collections?page=2", Canonical(html));
        Assert.Null(MetaContent(html, "name", "robots"));

        foreach (var product in products)
            Assert.Contains($"/products/{product.Slug}", html, StringComparison.Ordinal);
    }

    // ------------------------------------------------------------------ helpers

    private static async Task<List<ProductCardDto>> ProductsAsync(HttpClient client, string query)
    {
        var page = await client.GetFromJsonAsync<ProductList>("/api/catalog/products?" + query);
        Assert.NotNull(page);
        return page!.Items;
    }

    private static async Task<string> ReadHtmlAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadAsStringAsync();
    }

    private static string Canonical(string html)
    {
        var tag = Assert.Single(
            Regex.Matches(html, "<link\\b[^>]*>", RegexOptions.IgnoreCase)
                .Select(m => m.Value)
                .Where(tag => Attr(tag, "rel") == "canonical"));
        return Attr(tag, "href")!;
    }

    private static List<JsonElement> GraphNodes(string html)
    {
        using var document = JsonDocument.Parse(JsonLdScript(html));
        return document.RootElement.GetProperty("@graph").EnumerateArray()
            .Select(node => node.Clone())
            .ToList();
    }

    private static string? Str(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) ? value.GetString() : null;

    private static string? MetaContent(string html, string attribute, string value)
    {
        var tag = Regex.Matches(html, "<meta\\b[^>]*>", RegexOptions.IgnoreCase)
            .Select(m => m.Value)
            .FirstOrDefault(t => Attr(t, attribute) == value);
        return tag is null ? null : WebUtility.HtmlDecode(Attr(tag, "content"));
    }

    private static string? Attr(string tag, string attribute)
    {
        var match = Regex.Match(
            tag,
            $@"{Regex.Escape(attribute)}\s*=\s*['""](?<value>[^'""]*)['""]",
            RegexOptions.IgnoreCase);
        return match.Success ? match.Groups["value"].Value : null;
    }

    private static string? ElementText(string html, string element)
    {
        var match = Regex.Match(
            html,
            $"<{element}\\b[^>]*>(?<text>.*?)</{element}>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? WebUtility.HtmlDecode(match.Groups["text"].Value).Trim() : null;
    }

    private static string JsonLdScript(string html)
    {
        var match = Regex.Match(
            html,
            "<script\\b[^>]*\\btype\\s*=\\s*['\"]application/ld\\+json['\"][^>]*>(?<json>.*?)</script>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        Assert.True(match.Success, "a JSON-LD script must be present");
        return match.Groups["json"].Value;
    }

    private static bool ContainsHtmlText(string html, string text) =>
        html.Contains(WebUtility.HtmlEncode(text), StringComparison.Ordinal) ||
        html.Contains(text, StringComparison.Ordinal);

    private static void AssertAbsoluteUrl(string? value, string name)
    {
        Assert.False(string.IsNullOrWhiteSpace(value), $"{name} must be present");
        Assert.True(
            Uri.TryCreate(value!, UriKind.Absolute, out _),
            $"{name} must be an absolute URL, was '{value}'");
    }

    private sealed record ProductList(
        List<ProductCardDto> Items, int Total, int Page, int PageSize, int TotalPages);
}
