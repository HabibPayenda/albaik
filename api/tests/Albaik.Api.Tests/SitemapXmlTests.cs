using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Albaik.Api.Dtos;
using Microsoft.AspNetCore.Hosting;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 09 - `sitemap.xml` is the crawlable index of the public site. The expected URL
/// set is derived independently from the public API the SPA consumes (active catalogue,
/// published pages) and from the seed's route vocabulary, so the test cannot agree with
/// the builder by construction. XML is parsed, never matched as a raw string.
/// </summary>
public class SitemapXmlTests : IClassFixture<AlbaikApiFactory>
{
    private static readonly XNamespace Sitemap = "http://www.sitemaps.org/schemas/sitemap/0.9";

    // The seed's named top-level content routes, and its two guide pages. Deliberately
    // repeated here instead of calling the production helper: the spec is the source of
    // truth for which route a page is expected to use.
    private static readonly HashSet<string> NamedRoutes = new(StringComparer.OrdinalIgnoreCase)
    {
        "about", "quality", "safety", "distribution", "privacy", "terms",
    };

    private static readonly HashSet<string> GuideSlugs = new(StringComparer.OrdinalIgnoreCase)
    {
        "shampoo-guide", "how-to-use",
    };

    private readonly AlbaikApiFactory _factory;
    public SitemapXmlTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Sitemap_ListsEveryCanonicalIndexableUrlWithLastModified()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/sitemap.xml");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/xml", response.Content.Headers.ContentType?.MediaType);

        var urls = ParseUrls(await response.Content.ReadAsStringAsync());
        var locs = urls.Select(url => url.Loc).ToList();

        var expected = await ExpectedPathsAsync(client);
        Assert.Equal(expected.Count, locs.Count);
        Assert.Equal(locs.Count, locs.Distinct(StringComparer.Ordinal).Count());
        Assert.All(expected, path => Assert.Contains("http://localhost" + path, locs));

        Assert.All(locs, loc =>
        {
            Assert.True(Uri.TryCreate(loc, UriKind.Absolute, out var uri),
                $"'{loc}' must be an absolute URL");
            Assert.Equal("http://localhost", uri!.GetLeftPart(UriPartial.Authority));
        });

        var byPath = urls.ToDictionary(url => new Uri(url.Loc).AbsolutePath, url => url.LastMod);

        // Synthesised pages have no single record update time.
        foreach (var path in new[] { "/", "/collections", "/contact" })
            Assert.Null(byPath[path]);

        // Record-backed URLs carry the record's UTC update time in W3C form.
        foreach (var path in expected.Except(new[] { "/", "/collections", "/contact" }))
        {
            Assert.NotNull(byPath[path]);
            Assert.Matches(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", byPath[path]!);
        }
    }

    [Fact]
    public async Task Sitemap_OmitsPrivateSearchFilteredAndAliasUrls()
    {
        using var client = _factory.CreateClient();
        var locs = ParseUrls(await (await client.GetAsync("/sitemap.xml")).Content.ReadAsStringAsync())
            .Select(url => url.Loc)
            .ToList();

        foreach (var fragment in new[] { "/admin", "/api", "/uploads", "/verify", "?", "search", "page=", "/pages/" })
            Assert.DoesNotContain(locs, loc => loc.Contains(fragment, StringComparison.OrdinalIgnoreCase));

        // A named page is listed once, on its preferred route, not on its aliases.
        Assert.Contains("http://localhost/about", locs);
        Assert.DoesNotContain("http://localhost/pages/about", locs);
        Assert.DoesNotContain("http://localhost/guides/about", locs);

        // A guide is listed under /guides only.
        Assert.Contains("http://localhost/guides/shampoo-guide", locs);
        Assert.DoesNotContain("http://localhost/pages/shampoo-guide", locs);
    }

    [Fact]
    public async Task Sitemap_GuideEntryMatchesTheShellCanonical()
    {
        using var client = _factory.CreateClient();
        var locs = ParseUrls(await (await client.GetAsync("/sitemap.xml")).Content.ReadAsStringAsync())
            .Select(url => url.Loc)
            .ToList();

        var html = await SeoTestHelpers.ReadHtmlAsync(await client.GetAsync("/guides/shampoo-guide"));
        var canonical = SeoTestHelpers.Canonical(html);

        Assert.NotNull(canonical);
        Assert.Contains(canonical!, locs);
        Assert.DoesNotContain(locs, loc => loc.EndsWith("/pages/shampoo-guide", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Sitemap_UsesTheConfiguredPublicOrigin()
    {
        using var admin = _factory.AdminClient();
        var settings = await admin.GetFromJsonAsync<List<SiteSettingDto>>("/api/admin/settings");
        var original = Assert.Single(settings!, setting => setting.Key == "site.publicBaseUrl");
        const string configured = "https://albaik-group.af";

        try
        {
            var save = await admin.PutAsJsonAsync("/api/admin/settings", new SettingsInput
            {
                Settings = new List<SiteSettingDto>
                {
                    original with { Value = configured },
                },
            });
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);

            using var client = _factory.CreateClient();
            var urls = ParseUrls(await (await client.GetAsync("/sitemap.xml")).Content.ReadAsStringAsync());

            Assert.NotEmpty(urls);
            Assert.All(urls, url => Assert.StartsWith(configured + "/", url.Loc));
        }
        finally
        {
            await admin.PutAsJsonAsync("/api/admin/settings", new SettingsInput
            {
                Settings = new List<SiteSettingDto>
                {
                    original with { Value = original.Value ?? "" },
                },
            });
        }
    }

    [Fact]
    public async Task Sitemap_WithoutConfiguredOrigin_IsAnExplicitConfigurationErrorInProduction()
    {
        using var factory = new ProductionFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/sitemap.xml");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Contains("site.publicBaseUrl", await response.Content.ReadAsStringAsync());
    }

    private static async Task<List<string>> ExpectedPathsAsync(HttpClient client)
    {
        var categories = await client.GetFromJsonAsync<List<CategoryDto>>(
            "/api/catalog/categories?withBrands=true");
        var products = await client.GetFromJsonAsync<ProductPage>(
            "/api/catalog/products?pageSize=100");
        var pages = await client.GetFromJsonAsync<List<PageDto>>("/api/pages");

        var paths = new List<string> { "/", "/collections" };

        foreach (var category in categories!)
        {
            paths.Add($"/collections/{category.Slug}");
            foreach (var brand in category.Brands ?? new List<BrandDto>())
                paths.Add($"/collections/{category.Slug}/{brand.Slug}");
        }

        paths.AddRange(products!.Items.Select(product => $"/products/{product.Slug}"));

        paths.AddRange(pages!.Select(page =>
            NamedRoutes.Contains(page.Slug) ? $"/{page.Slug}"
            : GuideSlugs.Contains(page.Slug) ? $"/guides/{page.Slug}"
            : $"/pages/{page.Slug}"));

        paths.Add("/contact");
        return paths;
    }

    private static List<(string Loc, string? LastMod)> ParseUrls(string xml)
    {
        var document = XDocument.Parse(xml);
        Assert.NotNull(document.Root);
        Assert.Equal(Sitemap + "urlset", document.Root!.Name);

        return document.Root.Elements(Sitemap + "url")
            .Select(url => (
                (string)url.Element(Sitemap + "loc")!,
                (string?)url.Element(Sitemap + "lastmod")))
            .ToList();
    }

    private sealed record ProductPage(List<ProductCardDto> Items, int Total);

    /// <summary>The normal test host, but booted as Production to exercise the config guard.</summary>
    private sealed class ProductionFactory : AlbaikApiFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.UseEnvironment("Production");
        }
    }
}
