using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Shared readers for the SEO shell HTTP tests. They deliberately work on the response
/// text, because that is the only thing a crawler sees: no internal type or private
/// helper is asserted.
/// </summary>
internal static class SeoShellTestHelpers
{
    public static async Task<string> ReadHtmlAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadAsStringAsync();
    }

    public static string Canonical(string html)
    {
        var tag = Assert.Single(
            Regex.Matches(html, "<link\\b[^>]*>", RegexOptions.IgnoreCase).Select(m => m.Value),
            tag => Attr(tag, "rel") == "canonical");
        return Attr(tag, "href")!;
    }

    public static IEnumerable<string> LinkTags(string html) =>
        Regex.Matches(html, "<link\\b[^>]*>", RegexOptions.IgnoreCase).Select(m => m.Value);

    public static IEnumerable<string> MetaTags(string html, string attribute, string value) =>
        Regex.Matches(html, "<meta\\b[^>]*>", RegexOptions.IgnoreCase)
            .Select(m => m.Value)
            .Where(tag => Attr(tag, attribute) == value);

    public static string? MetaContent(string html, string attribute, string value)
    {
        var tag = MetaTags(html, attribute, value).FirstOrDefault();
        return tag is null ? null : WebUtility.HtmlDecode(Attr(tag, "content"));
    }

    public static string? Attr(string tag, string attribute)
    {
        var match = Regex.Match(
            tag,
            $@"{Regex.Escape(attribute)}\s*=\s*['""](?<value>[^'""]*)['""]",
            RegexOptions.IgnoreCase);
        return match.Success ? match.Groups["value"].Value : null;
    }

    public static string? ElementText(string html, string element)
    {
        var match = Regex.Match(
            html,
            $"<{element}\\b[^>]*>(?<text>.*?)</{element}>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? WebUtility.HtmlDecode(match.Groups["text"].Value).Trim() : null;
    }

    public static List<JsonElement> GraphNodes(string html)
    {
        using var document = JsonDocument.Parse(JsonLdScript(html));
        Assert.Equal("https://schema.org", document.RootElement.GetProperty("@context").GetString());
        return document.RootElement.GetProperty("@graph").EnumerateArray()
            .Select(node => node.Clone())
            .ToList();
    }

    public static JsonElement SingleNode(string html, string type)
        => Assert.Single(GraphNodes(html), node => Str(node, "@type") == type);

    public static string JsonLdScript(string html)
    {
        var match = Regex.Match(
            html,
            "<script\\b[^>]*\\btype\\s*=\\s*['\"]application/ld\\+json['\"][^>]*>(?<json>.*?)</script>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        Assert.True(match.Success, "a JSON-LD script must be present");
        return match.Groups["json"].Value;
    }

    public static string? Str(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) ? value.GetString() : null;

    public static bool ContainsHtmlText(string html, string text) =>
        html.Contains(WebUtility.HtmlEncode(text), StringComparison.Ordinal) ||
        html.Contains(text, StringComparison.Ordinal);

    public static void AssertAbsoluteUrl(string? value, string name)
    {
        Assert.False(string.IsNullOrWhiteSpace(value), $"{name} must be present");
        Assert.True(
            Uri.TryCreate(value!, UriKind.Absolute, out _),
            $"{name} must be an absolute URL, was '{value}'");
    }

    public static void AssertSingleH1(string html)
        => Assert.Single(Regex.Matches(html, "<h1\\b", RegexOptions.IgnoreCase).Cast<Match>());

    /// <summary>
    /// The body of the visible landmark with the given <c>aria-label</c> (for example
    /// "Breadcrumb" or "Pagination"). Failing when it is absent keeps the tests tied to
    /// the accessible markup a crawler and a screen reader both receive.
    /// </summary>
    public static string NavBody(string html, string ariaLabel)
    {
        var match = Regex.Match(
            html,
            $"<nav\\b[^>]*aria-label\\s*=\\s*['\"]{Regex.Escape(ariaLabel)}['\"][^>]*>(?<body>.*?)</nav>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        Assert.True(match.Success, $"a nav landmark labelled '{ariaLabel}' must be present");
        return match.Groups["body"].Value;
    }

    /// <summary>The decoded <c>href</c> of every anchor inside a landmark, in order.</summary>
    public static List<string> NavHrefs(string html, string ariaLabel) =>
        Regex.Matches(NavBody(html, ariaLabel), "<a\\b[^>]*>", RegexOptions.IgnoreCase)
            .Select(match => Attr(match.Value, "href"))
            .Where(href => href is not null)
            .Select(href => WebUtility.HtmlDecode(href!))
            .ToList();
}
