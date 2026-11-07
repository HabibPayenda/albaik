using System.Text;

namespace Albaik.Api.Seo;

/// <summary>
/// The minimal not-found shell used when a public route resolves to a missing or
/// inactive record. Ticket 08 owns the general 404 page and the remaining private
/// surfaces; this file deliberately stays small so the two can grow independently.
///
/// A not-found response is always HTTP 404 and always noindex: a soft 404 (a 200 page
/// saying "missing") is exactly what pollutes a search index.
/// </summary>
public static class NotFoundShell
{
    private const string OpenGraphImagePath = "/social-default.png";
    private const int OpenGraphImageWidth = 1200;
    private const int OpenGraphImageHeight = 630;

    public static SeoPage Build(
        SiteSettingsSnapshot site, string requestedPath, string subject)
    {
        var canonicalPath = string.IsNullOrWhiteSpace(requestedPath) ? "/" : requestedPath;
        var title = "Page not found — Albaik";
        var description = SeoText.ComposeDescription(
            $"{subject} could not be found.",
            "Browse the Albaik collections to find the products and brands you are looking for.");

        return new SeoPage(
            SeoPageType.NotFound,
            404,
            canonicalPath,
            SeoUrl.Absolute(site.BaseUrl, canonicalPath),
            title,
            description,
            site.Name,
            "website",
            SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath),
            OpenGraphImageWidth,
            OpenGraphImageHeight,
            title,
            SeoJsonLd.Graph(SeoJsonLd.SiteNodes(site)),
            BuildContentHtml(),
            "noindex, nofollow");
    }

    private static string BuildContentHtml()
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-not-found\">");
        sb.Append("<h1>Page not found</h1>");
        sb.Append("<p>The page you requested does not exist or is no longer available.</p>");
        sb.Append("<p><a href=\"/\">Go to the home page</a> or ");
        sb.Append("<a href=\"/collections\">browse all collections</a>.</p>");
        sb.Append("</div>");
        return sb.ToString();
    }
}
