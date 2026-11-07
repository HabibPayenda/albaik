using System.Net;
using System.Text.RegularExpressions;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 09 - `robots.txt` is a real crawl file, not the SPA. The assertions read the
/// response the way a crawler does and keep the rules deliberately small: public pages
/// allowed, dashboard and API disallowed, and the sitemap named by absolute URL.
/// </summary>
public class RobotsTxtTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public RobotsTxtTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Robots_ReturnsPlainTextRulesAndAbsoluteSitemap()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/robots.txt");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);

        var text = await response.Content.ReadAsStringAsync();
        Assert.Matches(@"(?im)^User-agent:\s*\*\s*$", text);
        Assert.Matches(@"(?im)^Allow:\s*/\s*$", text);
        Assert.Matches(@"(?im)^Disallow:\s*/admin\s*$", text);
        Assert.Matches(@"(?im)^Disallow:\s*/api/\s*$", text);
        Assert.Matches(@"(?im)^Sitemap:\s*http://localhost/sitemap\.xml\s*$", text);

        // The Google verification file and static assets remain crawlable: no rule may
        // disallow them, and the whole site cannot be blocked.
        var disallowed = Regex.Matches(text, @"(?im)^Disallow:\s*(?<path>\S+)\s*$")
            .Select(match => match.Groups["path"].Value)
            .ToList();
        Assert.DoesNotContain(disallowed, rule => rule.StartsWith("/google", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain("/", disallowed);
    }
}
