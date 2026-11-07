using System.Text;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// Turns one Product (<c>/products/{slug}</c>) into one <see cref="SeoPage"/>.
///
/// The shell is a truthful superset of the hydrated page's primary content: name,
/// description, benefits, how-to-use and safety copy are all present even though the
/// SPA currently mounts only one tab panel at a time. The SPA still replaces this on
/// hydration, so headings and ids cannot collide.
///
/// Product photography is shown whole in the Product frame on the site; the Open Graph
/// image is a separate wide social asset, so the first Product image is used when it
/// exists and the dedicated 1200x630 brand image otherwise — never the app icon.
/// </summary>
public static class ProductPageShell
{
    private const string OpenGraphFallbackPath = "/social-default.png";
    private const int OpenGraphFallbackWidth = 1200;
    private const int OpenGraphFallbackHeight = 630;
    private const int ProductImageWidth = 1080;
    private const int ProductImageHeight = 1350;

    public static async Task<SeoPage?> BuildAsync(
        AppDbContext db, SiteSettingsSnapshot site, string slug, CancellationToken ct)
    {
        // A Product under a withdrawn Brand or Collection is not a reachable public page.
        var product = await db.Products.AsNoTracking()
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p =>
                p.Slug == slug &&
                p.IsActive &&
                p.Brand != null && p.Brand.IsActive &&
                p.Category != null && p.Category.IsActive,
                ct);

        if (product is null || product.Brand is null || product.Category is null) return null;

        var canonicalPath = $"/products/{product.Slug}";
        var canonicalUrl = SeoUrl.Absolute(site.BaseUrl, canonicalPath);

        var description = BuildDescription(product);

        var primaryImageUrl = product.Images
            .Where(i => !string.IsNullOrWhiteSpace(i.Url))
            .OrderBy(i => i.SortOrder)
            .Select(i => i.Url)
            .FirstOrDefault() ?? product.ImageUrl;

        var productImageUrl = SeoUrl.Asset(site.BaseUrl, primaryImageUrl);
        var usingFallback = productImageUrl is null;
        var imageUrl = productImageUrl ?? SeoUrl.Absolute(site.BaseUrl, OpenGraphFallbackPath);
        var imageWidth = usingFallback ? OpenGraphFallbackWidth : ProductImageWidth;
        var imageHeight = usingFallback ? OpenGraphFallbackHeight : ProductImageHeight;

        var breadcrumb = SeoJsonLd.BreadcrumbList(canonicalUrl, new (string, string?)[]
        {
            ("Home", SeoUrl.Absolute(site.BaseUrl, "/")),
            ("Collections", SeoUrl.Absolute(site.BaseUrl, "/collections")),
            (product.Category.Name, SeoUrl.Absolute(site.BaseUrl, $"/collections/{product.Category.Slug}")),
            (product.Brand.Name, SeoUrl.Absolute(
                site.BaseUrl, $"/collections/{product.Category.Slug}/{product.Brand.Slug}")),
            (product.Name, canonicalUrl),
        });

        var productNode = SeoJsonLd.Product(
            canonicalUrl,
            product.Name,
            imageUrl,
            SeoText.ClampDescription(
                product.Description ?? product.ShortDescription ?? product.Name, 1000),
            product.Brand.Name,
            product.Category.Name,
            product.Slug,
            product.Ibn);

        var structuredData = SeoJsonLd.Graph(
            SeoJsonLd.SiteNodes(site)
                .Concat(new object[] { productNode, breadcrumb })
                .ToArray());

        return new SeoPage(
            SeoPageType.Product,
            200,
            canonicalPath,
            canonicalUrl,
            $"{product.Name} — Albaik",
            description,
            site.Name,
            "product",
            imageUrl,
            imageWidth,
            imageHeight,
            product.Name,
            structuredData,
            BuildContentHtml(product, imageUrl));
    }

    /// <summary>
    /// The search snippet: the staff-written meta description when there is one, otherwise
    /// the existing short description. Either way it is composed to 120-160 characters, and
    /// no copy is invented.
    /// </summary>
    private static string BuildDescription(Product product)
        => string.IsNullOrWhiteSpace(product.MetaDescription)
            ? SeoText.ComposeDescription(product.ShortDescription, product.Description)
            : SeoText.ComposeDescription(product.MetaDescription);

    private static string BuildContentHtml(Product product, string imageUrl)
    {
        var brand = product.Brand!;
        var category = product.Category!;

        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-product\">");

        sb.Append("<header>");
        sb.Append("<h1>").Append(SeoHtml.Text(product.Name)).Append("</h1>");
        if (!string.IsNullOrWhiteSpace(product.Subtitle))
            sb.Append("<p>").Append(SeoHtml.Text(product.Subtitle)).Append("</p>");
        if (!string.IsNullOrWhiteSpace(product.FormulationLabel))
            sb.Append("<p>").Append(SeoHtml.Text(product.FormulationLabel)).Append("</p>");
        sb.Append("</header>");

        sb.Append("<figure><img src=\"")
            .Append(SeoHtml.SafeHref(imageUrl))
            .Append("\" alt=\"")
            .Append(SeoHtml.Text(product.Name))
            .Append("\" /></figure>");

        if (!string.IsNullOrWhiteSpace(product.Description))
            sb.Append("<p>").Append(SeoHtml.Text(product.Description)).Append("</p>");

        sb.Append("<p>Brand: <a href=\"")
            .Append(SeoHtml.SafeHref($"/collections/{category.Slug}/{brand.Slug}"))
            .Append("\">")
            .Append(SeoHtml.Text(brand.Name))
            .Append("</a>. Collection: <a href=\"")
            .Append(SeoHtml.SafeHref($"/collections/{category.Slug}"))
            .Append("\">")
            .Append(SeoHtml.Text(category.Name))
            .Append("</a>.</p>");

        if (product.Benefits.Count > 0)
        {
            sb.Append("<section>");
            sb.Append("<h2>Benefits</h2><ul>");
            foreach (var benefit in product.Benefits.Where(b => !string.IsNullOrWhiteSpace(b)))
                sb.Append("<li>").Append(SeoHtml.Text(benefit)).Append("</li>");
            sb.Append("</ul></section>");
        }

        AppendCopy(sb, "How to use", product.HowToUse);
        AppendCopy(sb, "Safety information", product.SafetyNote);
        AppendCopy(sb, "Suitable for", product.SuitableFor);

        if (product.Ingredients.Count > 0)
        {
            sb.Append("<section>");
            sb.Append("<h2>Ingredients</h2><ul>");
            foreach (var ingredient in product.Ingredients.Where(i => !string.IsNullOrWhiteSpace(i)))
                sb.Append("<li>").Append(SeoHtml.Text(ingredient)).Append("</li>");
            sb.Append("</ul></section>");
        }

        sb.Append("<p><a href=\"/collections\">Back to all collections</a></p>");
        sb.Append("</div>");
        return sb.ToString();
    }

    private static void AppendCopy(StringBuilder sb, string heading, string? copy)
    {
        if (string.IsNullOrWhiteSpace(copy)) return;
        sb.Append("<section><h2>").Append(SeoHtml.Text(heading)).Append("</h2><p>")
            .Append(SeoHtml.Text(copy)).Append("</p></section>");
    }
}
