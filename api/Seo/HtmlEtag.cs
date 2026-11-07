using System.Security.Cryptography;
using System.Text;

namespace Albaik.Api.Seo;

/// <summary>
/// Revalidation for the HTML the API renders itself (the SEO shell and the SPA fallback).
/// A strong ETag derived from the response body lets a browser ask "has this changed?"
/// instead of downloading a fresh shell on every visit, while <c>Cache-Control: no-cache</c>
/// still forces that question every time so a content edit is picked up immediately.
/// </summary>
public static class HtmlEtag
{
    public static string Compute(string html)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(html));
        return "\"" + Convert.ToBase64String(hash) + "\"";
    }

    /// <summary>
    /// Whether the request's <c>If-None-Match</c> already names this ETag. Handles the
    /// wildcard, a comma-separated list and the weak <c>W/</c> form browsers may send.
    /// </summary>
    public static bool IsNotModified(HttpRequest request, string etag)
    {
        foreach (var header in request.Headers.IfNoneMatch)
        {
            if (string.IsNullOrWhiteSpace(header)) continue;

            foreach (var candidate in header.Split(','))
            {
                var value = candidate.Trim();
                if (value.Length == 0) continue;

                if (value == "*" || value == etag) return true;
                if (value.StartsWith("W/", StringComparison.OrdinalIgnoreCase) &&
                    value[2..] == etag)
                    return true;
            }
        }

        return false;
    }
}
