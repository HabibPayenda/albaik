using System.Text;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// Turns one published CMS page into one <see cref="SeoPage"/>.
///
/// One shell serves the named routes (<c>/about</c>, <c>/quality</c>, ...), guides
/// (<c>/guides/{slug}</c>) and generic pages (<c>/pages/{slug}</c>). The requested route
/// is the canonical address, so the content a crawler sees is the same page the React
/// <c>ContentPage</c> renders from <c>GET /api/pages/{slug}</c>.
///
/// A missing or unpublished page returns null so the resolver can serve the real 404
/// shell instead of a soft 200 with no content.
/// </summary>
public static class ContentPageShell
{
    private const string OpenGraphImagePath = "/pwa-512.png";
    private const int OpenGraphImageSize = 512;

    public static async Task<SeoPage?> BuildAsync(
        AppDbContext db,
        SiteSettingsSnapshot site,
        string slug,
        string canonicalPath,
        bool isGuide,
        CancellationToken ct)
    {
        var page = await db.Pages.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished, ct);

        if (page is null) return null;

        var canonicalUrl = SeoUrl.Absolute(site.BaseUrl, canonicalPath);
        var description = SeoText.ComposeDescription(
            string.IsNullOrWhiteSpace(page.MetaDescription) ? page.Subtitle : page.MetaDescription);
        var title = $"{page.Title} — Albaik";

        var crumbs = Crumbs(site, canonicalUrl, page, isGuide);
        var structuredData = SeoJsonLd.Graph(
            SeoJsonLd.SiteNodes(site)
                .Concat(new object[] { SeoBreadcrumb.JsonLd(canonicalUrl, crumbs) })
                .ToArray());

        return new SeoPage(
            SeoPageType.ContentPage,
            200,
            canonicalPath,
            canonicalUrl,
            title,
            description,
            site.Name,
            "article",
            SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath),
            OpenGraphImageSize,
            OpenGraphImageSize,
            page.Title,
            structuredData,
            BuildContentHtml(page, crumbs));
    }

    private static SeoCrumb[] Crumbs(
        SiteSettingsSnapshot site, string canonicalUrl, Page page, bool isGuide)
    {
        var home = SeoUrl.Absolute(site.BaseUrl, "/");
        if (isGuide)
        {
            return new SeoCrumb[]
            {
                new("Home", home),
                new("Guides", null),
                new(page.Title, canonicalUrl),
            };
        }

        return new SeoCrumb[]
        {
            new("Home", home),
            new(page.Title, canonicalUrl),
        };
    }

    private static string BuildContentHtml(Page page, IReadOnlyList<SeoCrumb> crumbs)
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-content-page\">");
        sb.Append(SeoBreadcrumb.Html(crumbs));

        sb.Append("<header>");
        if (!string.IsNullOrWhiteSpace(page.Eyebrow))
            sb.Append("<p class=\"seo-eyebrow\">").Append(SeoHtml.Text(page.Eyebrow)).Append("</p>");
        sb.Append("<h1>").Append(SeoHtml.Text(page.Title)).Append("</h1>");
        if (!string.IsNullOrWhiteSpace(page.Subtitle))
            sb.Append("<p>").Append(SeoHtml.Text(page.Subtitle)).Append("</p>");
        sb.Append("</header>");

        if (!string.IsNullOrWhiteSpace(page.ContentHtml))
        {
            sb.Append("<article>");
            sb.Append(page.ContentHtml);
            sb.Append("</article>");
        }

        sb.Append("<p><a href=\"/contact\">Contact Albaik</a></p>");
        sb.Append("</div>");
        return sb.ToString();
    }
}
