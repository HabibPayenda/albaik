using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Shared assertions for the SEO shell tests. They read the response the way a crawler
/// does - status, headers, head tags and JSON-LD - rather than reaching into the shell
/// builders, so a refactor of the resolver does not break them.
/// </summary>
internal static class SeoTestHelpers
{
    public static async Task<string> ReadHtmlAsync(
        HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadAsStringAsync();
    }

    public static IEnumerable<string> LinkTags(string html) =>
        Regex.Matches(html, "<link\\b[^>]*>", RegexOptions.IgnoreCase).Select(m => m.Value);

    public static IEnumerable<string> MetaTags(string html, string attribute, string value) =>
        Regex.Matches(html, "<meta\\b[^>]*>", RegexOptions.IgnoreCase)
            .Select(m => m.Value)
            .Where(tag => Attr(tag, attribute) == value);

    public static string? Canonical(string html)
    {
        var tag = LinkTags(html).SingleOrDefault(tag => Attr(tag, "rel") == "canonical");
        return tag is null ? null : Attr(tag, "href");
    }

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

    public static string JsonLdScript(string html)
    {
        var match = Regex.Match(
            html,
            "<script\\b[^>]*\\btype\\s*=\\s*['\"]application/ld\\+json['\"][^>]*>(?<json>.*?)</script>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        Assert.True(match.Success, "a JSON-LD script must be present");
        return match.Groups["json"].Value;
    }

    public static List<JsonElement> GraphNodes(string html)
    {
        using var document = JsonDocument.Parse(JsonLdScript(html));
        return document.RootElement.GetProperty("@graph").EnumerateArray()
            .Select(node => node.Clone())
            .ToList();
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

    public static string RobotsHeader(HttpResponseMessage response) =>
        string.Join(", ", response.Headers.TryGetValues("X-Robots-Tag", out var values)
            ? values
            : Array.Empty<string>());
}
