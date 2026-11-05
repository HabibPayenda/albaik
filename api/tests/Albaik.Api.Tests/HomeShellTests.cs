using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 05 - the home page is delivered as real HTML, not just the SPA shell.
///
/// The tests assert what a crawler receives over HTTP: status, title, description,
/// canonical, Open Graph/Twitter tags, Organization/WebSite JSON-LD and the same
/// primary content the React page renders. The content comparison reads the same
/// <c>/api/home</c> payload the SPA consumes, so the shell cannot silently drift
/// from the hydrated page (no cloaking).
/// </summary>
public class HomeShellTests : IClassFixture<AlbaikApiFactory>
{
    private const string HomeTitle = "Albaik Group of Companies — The Mark of Pure Perfection";

    private readonly AlbaikApiFactory _factory;
    public HomeShellTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Home_ReturnsHtmlWithItsOwnTitleAndDescription()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/");
        var html = await ReadHtmlAsync(response);

        Assert.Equal(1, Regex.Matches(html, "<title\\b", RegexOptions.IgnoreCase).Count);
        Assert.Equal(HomeTitle, ElementText(html, "title"));

        Assert.Equal(1, MetaTags(html, "name", "description").Count());
        var description = MetaContent(html, "name", "description");
        Assert.NotNull(description);
        Assert.InRange(description!.Length, 120, 160);
        Assert.StartsWith(
            "Albaik Group of Companies develops personal-care, beauty, hair-care, oral-care and everyday products",
            description);

        // The template's own head copy was replaced, not merely appended to.
        Assert.DoesNotContain("SPA template", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Home_EmitsSelfReferencingCanonicalAndAbsoluteSocialTags()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/");
        var html = await ReadHtmlAsync(response);

        var canonical = Assert.Single(
            LinkTags(html).Where(tag => Attr(tag, "rel") == "canonical"));
        var canonicalUrl = Attr(canonical, "href");
        Assert.NotNull(canonicalUrl);
        Assert.Equal("http://localhost/", canonicalUrl);

        Assert.Equal(HomeTitle, MetaContent(html, "property", "og:title"));
        Assert.Equal("Albaik Group of Companies", MetaContent(html, "property", "og:site_name"));
        Assert.Equal(canonicalUrl, MetaContent(html, "property", "og:url"));

        var description = MetaContent(html, "name", "description");
        Assert.Equal(description, MetaContent(html, "property", "og:description"));

        var image = MetaContent(html, "property", "og:image");
        Assert.NotNull(image);
        AssertAbsoluteUrl(image!, "OG image");
        Assert.Equal("512", MetaContent(html, "property", "og:image:width"));
        Assert.Equal("512", MetaContent(html, "property", "og:image:height"));
        Assert.False(string.IsNullOrWhiteSpace(MetaContent(html, "property", "og:image:alt")));

        Assert.Equal("summary_large_image", MetaContent(html, "name", "twitter:card"));
        var twitterImage = MetaContent(html, "name", "twitter:image");
        Assert.NotNull(twitterImage);
        AssertAbsoluteUrl(twitterImage!, "Twitter image");
        Assert.Equal(image, twitterImage);
    }

    [Fact]
    public async Task Home_EmitsOrganizationAndWebSiteStructuredData()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/");
        var html = await ReadHtmlAsync(response);

        var scripts = Regex.Matches(
            html,
            "<script\\b[^>]*\\btype\\s*=\\s*['\"]application/ld\\+json['\"][^>]*>(?<json>.*?)</script>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        Assert.Equal(1, scripts.Count);

        using var document = JsonDocument.Parse(scripts[0].Groups["json"].Value);
        var root = document.RootElement;
        Assert.Equal("https://schema.org", root.GetProperty("@context").GetString());

        var graph = root.GetProperty("@graph").EnumerateArray().ToList();
        var organization = Assert.Single(graph, node => node.GetProperty("@type").GetString() == "Organization");
        var website = Assert.Single(graph, node => node.GetProperty("@type").GetString() == "WebSite");

        Assert.Equal("Albaik Group of Companies", organization.GetProperty("name").GetString());
        Assert.Equal("http://localhost/", organization.GetProperty("url").GetString());
        AssertAbsoluteUrl(organization.GetProperty("logo").GetString()!, "Organization logo");
        Assert.Equal("Albaik Group of Companies", website.GetProperty("name").GetString());
        Assert.Equal("http://localhost/", website.GetProperty("url").GetString());
    }

    [Fact]
    public async Task Home_ShellContainsTheSamePrimaryContentAsTheSpaPayload()
    {
        using var client = _factory.CreateClient();
        var home = await client.GetFromJsonAsync<HomePayloadDto>("/api/home");
        Assert.NotNull(home);

        var response = await client.GetAsync("/");
        var html = await ReadHtmlAsync(response);

        var hero = Assert.Single(home!.Sections, section => section.SectionType == "hero");
        var heroTitle = hero.Title ?? "";
        var heroAccent = ReadFirstSlideAccent(hero.SlidesJson);
        Assert.True(ContainsHtmlText(html, heroTitle));
        Assert.True(ContainsHtmlText(html, heroAccent));

        Assert.NotEmpty(home.Categories);
        foreach (var category in home.Categories)
        {
            Assert.True(ContainsHtmlText(html, category.Name));
            Assert.Contains($"/collections/{category.Slug}", html, StringComparison.Ordinal);
        }

        Assert.NotEmpty(home.FeaturedProducts);
        foreach (var product in home.FeaturedProducts)
        {
            Assert.True(ContainsHtmlText(html, product.Name));
            Assert.Contains($"/products/{product.Slug}", html, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task Home_KeepsTheSpaAssetsAndPutsCrawlableContentInsideTheReactRoot()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/");
        var html = await ReadHtmlAsync(response);

        Assert.Contains("/assets/app-fixture.js", html, StringComparison.Ordinal);
        Assert.Contains("/assets/app-fixture.css", html, StringComparison.Ordinal);
        Assert.Contains("rel=\"manifest\"", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("/registerSW.js", html, StringComparison.Ordinal);

        var rootTag = Regex.Match(
            html,
            "<div\\b[^>]*\\bid\\s*=\\s*['\"]root['\"][^>]*>",
            RegexOptions.IgnoreCase);
        Assert.True(rootTag.Success, "the SPA root must be present");
        Assert.Equal(
            1,
            Regex.Matches(html, "<div\\b[^>]*\\bid\\s*=\\s*['\"]root['\"]", RegexOptions.IgnoreCase).Count);

        var rootContent = RootContent(html, rootTag.Index + rootTag.Length);

        // One page heading, and the shell introduces no ids of its own inside #root:
        // React clears the shell on first render, so a heading or id the shell added
        // cannot survive and would collide with the hydrated page.
        Assert.Equal(1, Regex.Matches(html, "<h1\\b", RegexOptions.IgnoreCase).Count);
        Assert.True(
            Regex.IsMatch(rootContent, "<h1\\b", RegexOptions.IgnoreCase),
            "the page heading must be inside the React root so createRoot replaces it");
        Assert.False(
            Regex.IsMatch(rootContent, "\\bid\\s*=", RegexOptions.IgnoreCase),
            "shell content must not introduce element ids of its own");
    }

    [Fact]
    public async Task Home_UsesTheConfiguredPublicSiteUrlAndIgnoresATrailingSlash()
    {
        using var admin = _factory.AdminClient();
        var settings = await admin.GetFromJsonAsync<List<SiteSettingDto>>("/api/admin/settings");
        var row = Assert.Single(settings!, setting => setting.Key == "site.publicBaseUrl");
        var original = row;

        try
        {
            var save = await admin.PutAsJsonAsync(
                "/api/admin/settings",
                new SettingsInput { Settings = new() { row with { Value = "https://albaik-group.af/" } } });
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);

            using var site = _factory.CreateClient();
            var html = await ReadHtmlAsync(await site.GetAsync("/"));

            var canonical = Assert.Single(
                LinkTags(html).Where(tag => Attr(tag, "rel") == "canonical"));
            Assert.Equal("https://albaik-group.af/", Attr(canonical, "href"));
            Assert.Equal("https://albaik-group.af/", MetaContent(html, "property", "og:url"));
            Assert.Equal("https://albaik-group.af/pwa-512.png", MetaContent(html, "property", "og:image"));

            using var document = JsonDocument.Parse(JsonLdScript(html));
            var organization = document.RootElement.GetProperty("@graph").EnumerateArray()
                .Single(node => node.GetProperty("@type").GetString() == "Organization");
            Assert.Equal("https://albaik-group.af/", organization.GetProperty("url").GetString());
        }
        finally
        {
            var restore = await admin.PutAsJsonAsync(
                "/api/admin/settings",
                new SettingsInput { Settings = new() { original } });
            Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        }
    }

    [Fact]
    public async Task UnknownApiAndUploadPathsKeepTheir404s()
    {
        using var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/not-a-real-endpoint")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/uploads/not-a-real-image.png")).StatusCode);
    }

    // ------------------------------------------------------------------ helpers

    private static async Task<string> ReadHtmlAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadAsStringAsync();
    }

    private static IEnumerable<string> LinkTags(string html) =>
        Regex.Matches(html, "<link\\b[^>]*>", RegexOptions.IgnoreCase).Select(m => m.Value);

    private static IEnumerable<string> MetaTags(string html, string attribute, string value) =>
        Regex.Matches(html, "<meta\\b[^>]*>", RegexOptions.IgnoreCase)
            .Select(m => m.Value)
            .Where(tag => Attr(tag, attribute) == value);

    private static string? MetaContent(string html, string attribute, string value)
    {
        var tag = MetaTags(html, attribute, value).FirstOrDefault();
        return tag is null ? null : HtmlDecode(Attr(tag, "content"));
    }

    private static string? Attr(string tag, string attribute)
    {
        var match = Regex.Match(
            tag,
            $@"{Regex.Escape(attribute)}\s*=\s*['""](?<value>[^'""]*)['""]",
            RegexOptions.IgnoreCase);
        return match.Success ? match.Groups["value"].Value : null;
    }

    private static string RootContent(string html, int start)
    {
        var depth = 1;
        var index = start;
        while (index < html.Length)
        {
            var open = html.IndexOf("<div", index, StringComparison.OrdinalIgnoreCase);
            var close = html.IndexOf("</div>", index, StringComparison.OrdinalIgnoreCase);
            if (close < 0) return html[start..];
            if (open >= 0 && open < close)
            {
                depth++;
                index = open + 4;
            }
            else
            {
                depth--;
                if (depth == 0) return html[start..close];
                index = close + 6;
            }
        }
        return html[start..];
    }

    private static string? ElementText(string html, string element)
    {
        var match = Regex.Match(
            html,
            $"<{element}\\b[^>]*>(?<text>.*?)</{element}>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? HtmlDecode(match.Groups["text"].Value).Trim() : null;
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

    private static string ReadFirstSlideAccent(string? slidesJson)
    {
        Assert.False(string.IsNullOrWhiteSpace(slidesJson), "the seeded hero must have slides");
        using var document = JsonDocument.Parse(slidesJson!);
        return document.RootElement[0].GetProperty("accentWord").GetString() ?? "";
    }

    private static string HtmlDecode(string value) => WebUtility.HtmlDecode(value);

    private static bool ContainsHtmlText(string html, string text) =>
        html.Contains(WebUtility.HtmlEncode(text), StringComparison.Ordinal) ||
        html.Contains(text, StringComparison.Ordinal);

    private static void AssertAbsoluteUrl(string value, string name)
    {
        Assert.True(Uri.TryCreate(value, UriKind.Absolute, out _), $"{name} must be an absolute URL, was '{value}'");
    }
}
