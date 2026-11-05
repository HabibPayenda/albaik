namespace Albaik.Api.Seo;

/// <summary>
/// Builds the single JSON-LD graph every shell emits: the site-wide Organization and
/// WebSite nodes plus the page-specific node (ItemList today; BreadcrumbList and
/// Product in tickets 07/08/13). Keeping the site nodes here means every page type
/// describes the same company and site, with the same ids.
/// </summary>
internal static class SeoJsonLd
{
    public const string Context = "https://schema.org";

    private const string DefaultImagePath = "/pwa-512.png";

    public static Dictionary<string, object?> Graph(params object[] nodes) => new()
    {
        ["@context"] = Context,
        ["@graph"] = nodes,
    };

    /// <summary>The Organization and WebSite nodes shared by every page.</summary>
    public static object[] SiteNodes(SiteSettingsSnapshot site)
    {
        var rootUrl = SeoUrl.Absolute(site.BaseUrl, "/");

        var organization = new Dictionary<string, object?>
        {
            ["@type"] = "Organization",
            ["@id"] = rootUrl + "#organization",
            ["name"] = site.Name,
            ["url"] = rootUrl,
            ["logo"] = SeoUrl.Absolute(site.BaseUrl, DefaultImagePath),
        };

        if (site.Phone is not null || site.ContactEmail is not null)
        {
            var contactPoint = new Dictionary<string, object?>
            {
                ["@type"] = "ContactPoint",
                ["contactType"] = "customer service",
            };
            if (site.Phone is not null) contactPoint["telephone"] = site.Phone;
            if (site.ContactEmail is not null) contactPoint["email"] = site.ContactEmail;
            organization["contactPoint"] = contactPoint;
        }

        if (site.Address is not null) organization["address"] = site.Address;
        if (site.SameAs.Count > 0) organization["sameAs"] = site.SameAs;

        var website = new Dictionary<string, object?>
        {
            ["@type"] = "WebSite",
            ["@id"] = rootUrl + "#website",
            ["name"] = site.Name,
            ["url"] = rootUrl,
        };

        return new object[] { organization, website };
    }

    /// <summary>An ItemList whose entries are the collections, brands or products shown.</summary>
    public static Dictionary<string, object?> ItemList(
        string canonicalUrl, IEnumerable<(string Name, string Url)> items)
    {
        var elements = items
            .Select((item, index) => ListItem(index + 1, item.Name, item.Url))
            .ToArray();

        return new Dictionary<string, object?>
        {
            ["@type"] = "ItemList",
            ["@id"] = canonicalUrl + "#itemlist",
            ["itemListElement"] = elements,
        };
    }

    public static Dictionary<string, object?> ListItem(int position, string name, string url) => new()
    {
        ["@type"] = "ListItem",
        ["position"] = position,
        ["name"] = name,
        ["url"] = url,
    };
}
