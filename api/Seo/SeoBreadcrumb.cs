using System.Text;

namespace Albaik.Api.Seo;

/// <summary>
/// One level of a page's breadcrumb trail. <c>Url</c> is the level's canonical absolute
/// URL, or null for a level with no route of its own ("Guides").
/// </summary>
public sealed record SeoCrumb(string Name, string? Url);

/// <summary>
/// The one source for a page's breadcrumbs: the visible trail and the BreadcrumbList
/// JSON-LD are both rendered from the same crumb list, so the links a visitor follows
/// and the URLs a crawler reads cannot disagree.
/// </summary>
internal static class SeoBreadcrumb
{
    public static Dictionary<string, object?> JsonLd(
        string canonicalUrl, IReadOnlyList<SeoCrumb> crumbs)
        => SeoJsonLd.BreadcrumbList(
            canonicalUrl, crumbs.Select(crumb => (crumb.Name, crumb.Url)).ToArray());

    /// <summary>
    /// The visible trail: a labelled <c>nav</c> landmark with a real <c>href</c> for
    /// every level that has a route. The last level is marked <c>aria-current="page"</c>.
    /// </summary>
    public static string Html(IReadOnlyList<SeoCrumb> crumbs)
    {
        var sb = new StringBuilder();
        sb.Append("<nav class=\"seo-breadcrumbs\" aria-label=\"Breadcrumb\"><ol>");

        for (var index = 0; index < crumbs.Count; index++)
        {
            var crumb = crumbs[index];
            var isLast = index == crumbs.Count - 1;

            sb.Append("<li>");
            if (crumb.Url is null)
            {
                sb.Append("<span");
                if (isLast) sb.Append(" aria-current=\"page\"");
                sb.Append('>').Append(SeoHtml.Text(crumb.Name)).Append("</span>");
            }
            else
            {
                sb.Append("<a href=\"").Append(SeoHtml.SafeHref(crumb.Url)).Append('"');
                if (isLast) sb.Append(" aria-current=\"page\"");
                sb.Append('>').Append(SeoHtml.Text(crumb.Name)).Append("</a>");
            }
            sb.Append("</li>");
        }

        sb.Append("</ol></nav>");
        return sb.ToString();
    }
}
