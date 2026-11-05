using System.Text;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Albaik.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// The page a printed QR code opens. It is always <c>noindex, nofollow</c> and carries
/// no canonical URL, because the Verification code must never be published or indexed.
///
/// The shell names the product when the code resolves, to match what the React
/// <c>VerifyPage</c> shows after its lookup; the code itself is never written into the
/// title, description, URLs or JSON-LD. An unknown code gets the honest "could not
/// verify" copy, not a fake success.
/// </summary>
public static class VerifyPageShell
{
    private const string PageTitle = "Product verification — Albaik";
    private const string Robots = "noindex, nofollow";
    private const string OpenGraphImagePath = "/pwa-512.png";
    private const int OpenGraphImageSize = 512;

    public static async Task<SeoPage> BuildAsync(
        AppDbContext db, SiteSettingsSnapshot site, string code, CancellationToken ct)
    {
        var key = VerificationCodes.Normalize(code);

        // Only a published product verifies. The lookup mirrors GET /api/verify/{code}.
        Product? product = null;
        if (VerificationCodes.IsWellFormed(code))
        {
            product = await db.Products.AsNoTracking()
                .Include(p => p.Brand)
                .FirstOrDefaultAsync(p => p.VerificationCode == key && p.IsActive, ct);
        }

        var description = SeoText.ComposeDescription(
            "Scan the QR code printed on Albaik packaging to confirm that a product is "
            + "part of the published Albaik catalogue.");

        var structuredData = SeoJsonLd.Graph(SeoJsonLd.SiteNodes(site));

        return new SeoPage(
            SeoPageType.Verification,
            200,
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
            BuildContentHtml(product),
            Robots);
    }

    private static string BuildContentHtml(Product? product)
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-verify\">");

        if (product is null)
        {
            sb.Append("<h1>We could not verify this code</h1>");
            sb.Append("<p>The code may be mistyped, or it may belong to a product we no "
                + "longer publish.</p>");
            sb.Append("<p><a href=\"/collections\">Browse the Albaik collections</a></p>");
        }
        else
        {
            sb.Append("<h1>This is a genuine Albaik product</h1>");
            sb.Append("<p>This code matches ").Append(SeoHtml.Text(product.Name));
            if (!string.IsNullOrWhiteSpace(product.Brand?.Name))
                sb.Append(" by ").Append(SeoHtml.Text(product.Brand!.Name));
            sb.Append(" in the published Albaik catalogue.</p>");
            sb.Append("<p><a href=\"/products/").Append(SeoHtml.Text(product.Slug))
                .Append("\">View ").Append(SeoHtml.Text(product.Name)).Append("</a></p>");
        }

        sb.Append("</div>");
        return sb.ToString();
    }
}
