using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;
using static Albaik.Api.Tests.SeoTestHelpers;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 08 - content pages, guides and Contact are delivered with the same metadata
/// rules as the rest of the public site. Expected titles come from the public page API,
/// so the shell cannot drift from the CMS page the React app renders.
/// </summary>
public class ContentShellTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public ContentShellTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task About_ReturnsCmsPageMetadataBreadcrumbAndContent()
    {
        using var client = _factory.CreateClient();
        var page = await client.GetFromJsonAsync<PageDto>("/api/pages/about");
        Assert.NotNull(page);

        var html = await ReadHtmlAsync(await client.GetAsync("/about"));

        Assert.Equal($"{page!.Title} — Albaik", ElementText(html, "title"));
        Assert.Null(MetaContent(html, "name", "robots"));

        var description = MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);
        Assert.StartsWith(page.MetaDescription!, description);

        var canonical = Canonical(html);
        Assert.Equal("http://localhost/about", canonical);
        Assert.Equal(canonical, MetaContent(html, "property", "og:url"));
        Assert.Equal($"{page.Title} — Albaik", MetaContent(html, "property", "og:title"));
        Assert.Equal(description, MetaContent(html, "property", "og:description"));
        Assert.Equal("Albaik Group of Companies", MetaContent(html, "property", "og:site_name"));
        Assert.Equal("summary_large_image", MetaContent(html, "name", "twitter:card"));
        AssertAbsoluteUrl(MetaContent(html, "property", "og:image"), "OG image");

        var breadcrumb = Assert.Single(GraphNodes(html), node => Str(node, "@type") == "BreadcrumbList");
        var items = breadcrumb.GetProperty("itemListElement").EnumerateArray().ToList();
        Assert.Equal(new[] { "Home", page.Title }, items.Select(item => Str(item, "name")));
        Assert.Equal("http://localhost/", Str(items[0], "url"));
        Assert.Equal("http://localhost/about", Str(items[1], "url"));

        Assert.Equal(1, System.Text.RegularExpressions.Regex.Matches(
            html, "<h1\\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Count);
        Assert.True(ContainsHtmlText(html, page.Title));
        Assert.True(ContainsHtmlText(html, "Our Product Philosophy"));
    }

    [Fact]
    public async Task Guide_ReturnsGuideMetadataAndThreeLevelBreadcrumb()
    {
        using var client = _factory.CreateClient();
        var page = await client.GetFromJsonAsync<PageDto>("/api/pages/shampoo-guide");
        Assert.NotNull(page);

        var html = await ReadHtmlAsync(await client.GetAsync("/guides/shampoo-guide"));

        Assert.Equal($"{page!.Title} — Albaik", ElementText(html, "title"));
        Assert.Equal("http://localhost/guides/shampoo-guide", Canonical(html));

        var description = MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);

        var breadcrumb = Assert.Single(GraphNodes(html), node => Str(node, "@type") == "BreadcrumbList");
        var items = breadcrumb.GetProperty("itemListElement").EnumerateArray().ToList();
        Assert.Equal(new[] { "Home", "Guides", page.Title }, items.Select(item => Str(item, "name")));
        Assert.Equal("http://localhost/", Str(items[0], "url"));
        Assert.False(items[1].TryGetProperty("url", out _));
        Assert.Equal("http://localhost/guides/shampoo-guide", Str(items[2], "url"));

        Assert.True(ContainsHtmlText(html, "Dandruff"));
    }

    [Fact]
    public async Task GenericPagesRoute_ReturnsTheSamePageWithItsOwnCanonical()
    {
        using var client = _factory.CreateClient();
        var page = await client.GetFromJsonAsync<PageDto>("/api/pages/about");
        Assert.NotNull(page);

        var html = await ReadHtmlAsync(await client.GetAsync("/pages/about"));

        Assert.Equal($"{page!.Title} — Albaik", ElementText(html, "title"));
        Assert.Equal("http://localhost/pages/about", Canonical(html));
        Assert.True(ContainsHtmlText(html, page.Title));
    }

    [Fact]
    public async Task MissingContentPage_Returns404NotTheSpaShell()
    {
        using var client = _factory.CreateClient();

        foreach (var path in new[] { "/guides/not-a-real-page", "/pages/not-a-real-page" })
        {
            var html = await ReadHtmlAsync(
                await client.GetAsync(path), HttpStatusCode.NotFound);
            Assert.Equal("noindex, nofollow", MetaContent(html, "name", "robots"));
        }
    }

    [Fact]
    public async Task UnpublishedContentPage_Returns404()
    {
        using var admin = _factory.AdminClient();
        var pages = await admin.GetFromJsonAsync<List<PageDto>>("/api/admin/pages");
        var page = Assert.Single(pages!, p => p.Slug == "privacy");
        var original = ToInput(page, published: true);

        try
        {
            var hide = await admin.PutAsJsonAsync(
                $"/api/admin/pages/{page.Id}", ToInput(page, published: false));
            Assert.Equal(HttpStatusCode.OK, hide.StatusCode);

            using var client = _factory.CreateClient();
            var html = await ReadHtmlAsync(
                await client.GetAsync("/privacy"), HttpStatusCode.NotFound);
            Assert.Equal("noindex, nofollow", MetaContent(html, "name", "robots"));
        }
        finally
        {
            var restore = await admin.PutAsJsonAsync($"/api/admin/pages/{page.Id}", original);
            Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        }
    }

    [Fact]
    public async Task Contact_ReturnsContactMetadataAndCrawlableChannels()
    {
        using var client = _factory.CreateClient();
        var html = await ReadHtmlAsync(await client.GetAsync("/contact"));

        Assert.Equal("Contact — Albaik", ElementText(html, "title"));
        Assert.Null(MetaContent(html, "name", "robots"));

        var description = MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);
        Assert.Contains("Albaik", description);

        var canonical = Canonical(html);
        Assert.Equal("http://localhost/contact", canonical);
        Assert.Equal(canonical, MetaContent(html, "property", "og:url"));
        Assert.Equal("Contact — Albaik", MetaContent(html, "property", "og:title"));
        Assert.Equal(description, MetaContent(html, "property", "og:description"));
        AssertAbsoluteUrl(MetaContent(html, "property", "og:image"), "OG image");

        Assert.Contains("info@albaik-group.com", html, StringComparison.Ordinal);
        Assert.Contains("mailto:info@albaik-group.com", html, StringComparison.Ordinal);
        Assert.Contains("+93 700 000 000", html, StringComparison.Ordinal);
        Assert.Contains("tel:+93700000000", html, StringComparison.Ordinal);
        Assert.Contains("Head Office, Kabul, Afghanistan", html, StringComparison.Ordinal);
        Assert.Contains("/contact", html, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ContactEnquiryVariants_CanonicaliseToContact()
    {
        using var client = _factory.CreateClient();

        var wholesale = await ReadHtmlAsync(await client.GetAsync("/contact?topic=wholesale"));
        Assert.Equal("http://localhost/contact", Canonical(wholesale));
        Assert.Null(MetaContent(wholesale, "name", "robots"));

        var product = await ReadHtmlAsync(
            await client.GetAsync("/contact?topic=product&product=albaik-anti-dandruff-shampoo"));
        Assert.Equal("http://localhost/contact", Canonical(product));
        Assert.Null(MetaContent(product, "name", "robots"));
    }

    private static PageInput ToInput(PageDto page, bool published) => new()
    {
        Slug = page.Slug,
        Title = page.Title,
        Subtitle = page.Subtitle,
        Eyebrow = page.Eyebrow,
        ContentHtml = page.ContentHtml,
        MetaDescription = page.MetaDescription,
        SortOrder = page.SortOrder,
        IsPublished = published,
    };
}
