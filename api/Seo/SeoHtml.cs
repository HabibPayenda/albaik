using System.Globalization;
using System.Net;

namespace Albaik.Api.Seo;

/// <summary>
/// Small, shared HTML helpers for the shell content. The content is a truthful subset of
/// the hydrated page, so links are limited to the site's own routes and text is always
/// encoded.
/// </summary>
internal static class SeoHtml
{
    public static string Text(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    public static string SafeHref(string? href)
    {
        var value = (href ?? string.Empty).Trim();
        if (value.Length == 0) return "#";
        if (value.StartsWith('/') || value.StartsWith('#')) return value;
        if (Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
            uri.Scheme is "http" or "https" or "mailto" or "tel")
            return value;
        return "#";
    }

    public static string Plural(int count, string singular) =>
        $"{count.ToString(CultureInfo.InvariantCulture)} {singular}{(count == 1 ? string.Empty : "s")}";

    /// <summary>"A", "A and B", "A, B and C" — used in the generated meta descriptions.</summary>
    public static string JoinNaturally(IReadOnlyList<string> values)
    {
        return values.Count switch
        {
            0 => string.Empty,
            1 => values[0],
            2 => $"{values[0]} and {values[1]}",
            _ => string.Join(", ", values.Take(values.Count - 1)) + " and " + values[^1],
        };
    }
}
