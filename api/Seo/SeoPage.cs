namespace Albaik.Api.Seo;

/// <summary>
/// One public page resolved to everything the SEO shell needs to render it.
///
/// The resolver owns the metadata rules; the renderer only knows how to put this record
/// into the SPA's HTML template. Tickets 06-08 add page types here rather than growing
/// the renderer.
/// </summary>
public enum SeoPageType
{
    Home,
    CollectionsIndex,
    Collection,
    Brand,
    Product,
    ContentPage,
    Contact,
    Verification,
    NotFound,
}

/// <summary>
/// The crawl directive for a page. <see cref="Robots"/> is null for indexable pages, so
/// no robots meta is emitted and the page inherits the site's default. Filtered and
/// search views set <c>noindex, follow</c>; private surfaces (ticket 08) can set
/// <c>noindex, nofollow</c>.
/// </summary>
public sealed record SeoPage(
    SeoPageType Type,
    int StatusCode,
    string CanonicalPath,
    string CanonicalUrl,
    string Title,
    string Description,
    string SiteName,
    string OpenGraphType,
    string OpenGraphImageUrl,
    int OpenGraphImageWidth,
    int OpenGraphImageHeight,
    string OpenGraphImageAlt,
    object StructuredData,
    string ContentHtml,
    string? Robots = null);
