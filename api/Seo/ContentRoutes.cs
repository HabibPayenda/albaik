using Albaik.Api.Models;

namespace Albaik.Api.Seo;

/// <summary>
/// The one mapping from a CMS page to its preferred public address.
///
/// A named page (<c>about</c>, <c>quality</c>, ...) has a short top-level route; a guide
/// lives under <c>/guides/</c>; every other page lives under <c>/pages/</c>. The sitemap
/// lists exactly this address, and the shell's canonical is the same when the page is
/// reached through it. Keeping the rule in one place stops the sitemap and the canonical
/// builder from drifting apart or listing one page under two aliases.
/// </summary>
public static class ContentRoutes
{
    public const string GuidesPrefix = "/guides/";
    public const string PagesPrefix = "/pages/";

    private static readonly HashSet<string> Named = new(StringComparer.OrdinalIgnoreCase)
    {
        "about", "quality", "safety", "distribution", "privacy", "terms",
    };

    // The seed's two editorial guides. Other CMS pages are generic pages unless staff
    // promote them here; there is no stored "guide" flag on Page to read instead.
    private static readonly HashSet<string> Guides = new(StringComparer.OrdinalIgnoreCase)
    {
        "shampoo-guide", "how-to-use",
    };

    public static bool IsNamed(string slug) => Named.Contains(slug);

    public static bool IsGuide(string slug) => Guides.Contains(slug);

    /// <summary>The canonical, sitemap-listed path for a page slug.</summary>
    public static string PreferredPath(string slug)
    {
        var value = (slug ?? string.Empty).Trim();
        if (Named.Contains(value)) return "/" + value.ToLowerInvariant();
        if (Guides.Contains(value)) return GuidesPrefix + value.ToLowerInvariant();
        return PagesPrefix + value.ToLowerInvariant();
    }
}
