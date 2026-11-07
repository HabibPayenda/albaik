namespace Albaik.Api.Seo;

/// <summary>
/// Builds the single JSON-LD graph every shell emits: the site-wide Organization and
/// WebSite nodes plus the page-specific node (ItemList, BreadcrumbList or Product).
/// Keeping the site nodes here means every page type describes the same company and
/// site, with the same ids.
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

    public static Dictionary<string, object?> ListItem(int position, string name, string? url)
    {
        var item = new Dictionary<string, object?>
        {
            ["@type"] = "ListItem",
            ["position"] = position,
            ["name"] = name,
        };
        // A breadcrumb level with no route of its own ("Guides") still names its place
        // in the hierarchy; only the link is omitted.
        if (url is not null) item["url"] = url;
        return item;
    }

    /// <summary>
    /// The page's place in the catalogue hierarchy. Used on Brand, Product, content and
    /// not-found pages, and reusable by ticket 13 for visible breadcrumbs. Each level
    /// carries its canonical URL in <c>item</c>, which is the property search engines
    /// read for a BreadcrumbList.
    /// </summary>
    public static Dictionary<string, object?> BreadcrumbList(
        string canonicalUrl, IEnumerable<(string Name, string Url)> items)
    {
        var elements = items
            .Select((item, index) => BreadcrumbItem(index + 1, item.Name, item.Url))
            .ToArray();

        return new Dictionary<string, object?>
        {
            ["@type"] = "BreadcrumbList",
            ["@id"] = canonicalUrl + "#breadcrumb",
            ["itemListElement"] = elements,
        };
    }

    /// <summary>
    /// Overload for a breadcrumb level with no route of its own (for example "Guides"),
    /// which names its place in the hierarchy but omits the link.
    /// </summary>
    public static Dictionary<string, object?> BreadcrumbList(
        string canonicalUrl, params (string Name, string? Url)[] items)
    {
        var elements = items
            .Select((item, index) => BreadcrumbItem(index + 1, item.Name, item.Url))
            .ToArray();

        return new Dictionary<string, object?>
        {
            ["@type"] = "BreadcrumbList",
            ["@id"] = canonicalUrl + "#breadcrumb",
            ["itemListElement"] = elements,
        };
    }

    public static Dictionary<string, object?> BreadcrumbItem(int position, string name, string? url)
    {
        var item = new Dictionary<string, object?>
        {
            ["@type"] = "ListItem",
            ["position"] = position,
            ["name"] = name,
        };
        if (url is not null) item["item"] = url;
        return item;
    }

    /// <summary>
    /// A Product node without offers, availability or reviews: prices are still
    /// "Price on request", so an Offer would be false. <c>gtin13</c> is added only for a
    /// valid EAN-13 IBN, because an invalid identifier is worse than none.
    /// </summary>
    public static Dictionary<string, object?> Product(
        string canonicalUrl,
        string name,
        string imageUrl,
        string description,
        string brandName,
        string categoryName,
        string sku,
        string? ibn)
    {
        var node = new Dictionary<string, object?>
        {
            ["@type"] = "Product",
            ["@id"] = canonicalUrl + "#product",
            ["name"] = name,
            ["image"] = imageUrl,
            ["description"] = description,
            ["brand"] = new Dictionary<string, object?>
            {
                ["@type"] = "Brand",
                ["name"] = brandName,
            },
            ["category"] = categoryName,
            ["sku"] = sku,
            ["url"] = canonicalUrl,
        };

        if (IsValidEan13(ibn)) node["gtin13"] = ibn!.Trim();
        return node;
    }

    /// <summary>The EAN-13 check-digit rule (mod-10, alternating 1/3 weights).</summary>
    public static bool IsValidEan13(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;

        var digits = value.Trim();
        if (digits.Length != 13 || !digits.All(char.IsAsciiDigit)) return false;

        var sum = 0;
        for (var index = 0; index < 12; index++)
        {
            var digit = digits[index] - '0';
            sum += index % 2 == 0 ? digit : digit * 3;
        }

        var check = (10 - sum % 10) % 10;
        return check == digits[12] - '0';
    }
}
