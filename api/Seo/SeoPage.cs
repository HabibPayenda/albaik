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
}

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
    string ContentHtml);
