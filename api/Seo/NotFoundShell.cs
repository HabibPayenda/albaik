using System.Text;
using Albaik.Api.Data;

namespace Albaik.Api.Seo;

/// <summary>
/// The real not-found response: HTTP 404, <c>noindex, nofollow</c> and no canonical URL,
/// so an unknown address is never indexed as a soft 404 and never inherits another page's
/// canonical. The content is the same set of doors the React NotFoundPage offers.
/// </summary>
public static class NotFoundShell
{
    private const string PageTitle = "Page not found — Albaik";
    private const string Robots = "noindex, nofollow";
    private const string OpenGraphImagePath = "/pwa-512.png";
    private const int OpenGraphImageSize = 512;

    public static SeoPage Build(SiteSettingsSnapshot site)
    {
        var description = SeoText.ComposeDescription(
            "The page you requested could not be found. Browse the Albaik collections, "
            + "read about the company, or contact the team for product and wholesale enquiries.");

        var structuredData = SeoJsonLd.Graph(SeoJsonLd.SiteNodes(site));

        return new SeoPage(
            SeoPageType.NotFound,
            404,
            string.Empty,
            string.Empty,
            PageTitle,
            description,
            site.Name,
            "website",
            SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath),
            OpenGraphImageSize,
            OpenGraphImageSize,
            site.Name,
            structuredData,
            BuildContentHtml(),
            Robots);
    }

    private static string BuildContentHtml()
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-not-found\">");
        sb.Append("<h1>Page not found</h1>");
        sb.Append("<p>We could not find the page you are looking for. It may have moved, "
            + "or the address may be mistyped.</p>");
        sb.Append("<ul>");
        sb.Append("<li><a href=\"/\">Back to home</a></li>");
        sb.Append("<li><a href=\"/collections\">Browse the collections</a></li>");
        sb.Append("<li><a href=\"/about\">About Albaik</a></li>");
        sb.Append("<li><a href=\"/contact\">Contact the team</a></li>");
        sb.Append("</ul>");
        sb.Append("</div>");
        return sb.ToString();
    }
}
