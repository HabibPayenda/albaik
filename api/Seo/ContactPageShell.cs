using System.Text;
using System.Text.RegularExpressions;
using Albaik.Api.Data;

namespace Albaik.Api.Seo;

/// <summary>
/// Turns Contact into one <see cref="SeoPage"/>. The enquiry modes
/// (<c>?topic=wholesale</c> and <c>?topic=product&amp;product=...</c>) are the same page
/// with a different form preset, so they all canonicalise to <c>/contact</c>.
/// </summary>
public static class ContactPageShell
{
    private const string CanonicalPath = "/contact";
    private const string PageTitle = "Contact — Albaik";
    private const string OpenGraphImagePath = "/pwa-512.png";
    private const int OpenGraphImageSize = 512;

    public static SeoPage Build(SiteSettingsSnapshot site)
    {
        var canonicalUrl = SeoUrl.Absolute(site.BaseUrl, CanonicalPath);
        var description = SeoText.ComposeDescription(
            "Contact Albaik Group of Companies for product inquiries, wholesale orders, "
            + "distribution opportunities and business cooperation.",
            site.Address);

        var structuredData = SeoJsonLd.Graph(SeoJsonLd.SiteNodes(site));

        return new SeoPage(
            SeoPageType.Contact,
            200,
            CanonicalPath,
            canonicalUrl,
            PageTitle,
            description,
            site.Name,
            "website",
            SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath),
            OpenGraphImageSize,
            OpenGraphImageSize,
            site.Name,
            structuredData,
            BuildContentHtml(site));
    }

    private static string BuildContentHtml(SiteSettingsSnapshot site)
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-contact\">");

        sb.Append("<header>");
        sb.Append("<p class=\"seo-eyebrow\">Get in touch</p>");
        sb.Append("<h1>Contact Albaik</h1>");
        sb.Append("<p>For product inquiries, wholesale orders, distribution opportunities "
            + "and business cooperation, please contact Albaik Group of Companies.</p>");
        sb.Append("</header>");

        sb.Append("<section>");
        sb.Append("<h2>Contact details</h2>");
        if (!string.IsNullOrWhiteSpace(site.Address))
            sb.Append("<p>Head office: ").Append(SeoHtml.Text(site.Address)).Append("</p>");
        if (!string.IsNullOrWhiteSpace(site.Phone))
        {
            sb.Append("<p>Phone: <a href=\"").Append(SeoHtml.SafeHref(TelHref(site.Phone)))
                .Append("\">").Append(SeoHtml.Text(site.Phone)).Append("</a></p>");
        }
        if (!string.IsNullOrWhiteSpace(site.ContactEmail))
        {
            sb.Append("<p>Email: <a href=\"").Append(SeoHtml.SafeHref("mailto:" + site.ContactEmail))
                .Append("\">").Append(SeoHtml.Text(site.ContactEmail)).Append("</a></p>");
        }
        sb.Append("</section>");

        sb.Append("<section>");
        sb.Append("<h2>How we can help</h2><ul>");
        sb.Append("<li><a href=\"/distribution\">Distribution and wholesale enquiries</a></li>");
        sb.Append("<li><a href=\"/quality\">Product quality and verification</a></li>");
        sb.Append("<li><a href=\"/collections\">Browse the product collections</a></li>");
        sb.Append("</ul>");
        sb.Append("</section>");

        sb.Append("</div>");
        return sb.ToString();
    }

    private static string TelHref(string phone)
    {
        var digits = Regex.Replace(phone, @"[^\d+]", string.Empty);
        return digits.Length == 0 ? "tel:" : "tel:" + digits;
    }
}
