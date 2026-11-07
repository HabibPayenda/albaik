using System.Text;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// Turns one collection-scoped Brand (<c>/collections/{collection}/{brand}</c>) into one
/// <see cref="SeoPage"/>.
///
/// A Brand's identity is the pair (Collection, Brand): the same "Albaik" slug exists in
/// four Collections, so the title and canonical both carry the Collection. That is what
/// keeps the four pages from competing with each other in search.
///
/// The queries mirror the SPA's <c>BrandPage</c>: <c>GET /api/catalog/brands/{collection}/{brand}</c>
/// for the Brand and its active Products. An unknown or inactive Collection or Brand
/// returns null, and the resolver answers with the not-found shell.
/// </summary>
public static class BrandPageShell
{
    private const string OpenGraphImagePath = "/social-default.png";
    private const int OpenGraphImageWidth = 1200;
    private const int OpenGraphImageHeight = 630;

    public static async Task<SeoPage?> BuildAsync(
        AppDbContext db,
        SiteSettingsSnapshot site,
        string collectionSlug,
        string brandSlug,
        CancellationToken ct)
    {
        // The Collection has to be active too: an active Brand under a withdrawn
        // Collection is not a reachable public page.
        var brand = await db.Brands.AsNoTracking()
            .Include(b => b.Category)
            .FirstOrDefaultAsync(b =>
                b.Slug == brandSlug &&
                b.IsActive &&
                b.Category != null &&
                b.Category.Slug == collectionSlug &&
                b.Category.IsActive,
                ct);

        if (brand is null || brand.Category is null) return null;

        var category = brand.Category;

        // BrandPage shows the Brand's own Products, ordered by authored order then name.
        var products = await db.Products.AsNoTracking()
            .Include(p => p.Brand).Include(p => p.Category)
            .Where(p => p.BrandId == brand.Id && p.IsActive)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
            .ToListAsync(ct);

        var canonicalPath = $"/collections/{category.Slug}/{brand.Slug}";
        var canonicalUrl = SeoUrl.Absolute(site.BaseUrl, canonicalPath);

        var description = SeoText.ComposeDescription(
            $"{brand.Name} — {category.Name}.",
            brand.Description ?? brand.Tagline,
            $"Explore {brand.Name} products in the {category.Name} collection from Albaik.");

        var imageUrl = SeoUrl.Asset(site.BaseUrl, brand.ImageUrl)
            ?? SeoUrl.Asset(site.BaseUrl, brand.LogoUrl)
            ?? SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath);

        var breadcrumb = SeoJsonLd.BreadcrumbList(canonicalUrl, new (string, string?)[]
        {
            ("Home", SeoUrl.Absolute(site.BaseUrl, "/")),
            ("Collections", SeoUrl.Absolute(site.BaseUrl, "/collections")),
            (category.Name, SeoUrl.Absolute(site.BaseUrl, $"/collections/{category.Slug}")),
            (brand.Name, canonicalUrl),
        });

        var structuredData = SeoJsonLd.Graph(
            SeoJsonLd.SiteNodes(site)
                .Concat(new object[] { breadcrumb })
                .ToArray());

        return new SeoPage(
            SeoPageType.Brand,
            200,
            canonicalPath,
            canonicalUrl,
            $"{brand.Name} {category.Name} — Albaik",
            description,
            site.Name,
            "website",
            imageUrl,
            OpenGraphImageWidth,
            OpenGraphImageHeight,
            brand.Name,
            structuredData,
            BuildContentHtml(site, brand, category, products));
    }

    private static string BuildContentHtml(
        SiteSettingsSnapshot site, Brand brand, Category category, List<Product> products)
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-brand\">");

        sb.Append("<header>");
        sb.Append("<h1>").Append(SeoHtml.Text(brand.Name)).Append("</h1>");
        sb.Append("<p>Part of the <a href=\"")
            .Append(SeoHtml.SafeHref($"/collections/{category.Slug}"))
            .Append("\">")
            .Append(SeoHtml.Text(category.Name))
            .Append("</a> collection.</p>");

        if (!string.IsNullOrWhiteSpace(brand.Tagline))
            sb.Append("<p>").Append(SeoHtml.Text(brand.Tagline)).Append("</p>");
        if (!string.IsNullOrWhiteSpace(brand.Description))
            sb.Append("<p>").Append(SeoHtml.Text(brand.Description)).Append("</p>");
        sb.Append("</header>");

        AppendImage(sb, site, brand.LogoUrl, $"{brand.Name} logo");
        AppendImage(sb, site, brand.ImageUrl, $"{brand.Name} banner");

        sb.Append("<section>");
        sb.Append("<h2>").Append(SeoHtml.Text($"Products from {brand.Name}")).Append("</h2>");
        if (products.Count == 0)
        {
            sb.Append("<p>No products are currently published for this brand.</p>");
        }
        else
        {
            foreach (var product in products)
            {
                sb.Append("<article>");
                sb.Append("<h3><a href=\"")
                    .Append(SeoHtml.SafeHref($"/products/{product.Slug}"))
                    .Append("\">")
                    .Append(SeoHtml.Text(product.Name))
                    .Append("</a></h3>");

                if (!string.IsNullOrWhiteSpace(product.ShortDescription))
                    sb.Append("<p>").Append(SeoHtml.Text(product.ShortDescription)).Append("</p>");
                sb.Append("</article>");
            }
        }
        sb.Append("</section>");

        sb.Append("<p><a href=\"")
            .Append(SeoHtml.SafeHref($"/collections/{category.Slug}"))
            .Append("\">Back to ")
            .Append(SeoHtml.Text(category.Name))
            .Append("</a></p>");
        sb.Append("</div>");
        return sb.ToString();
    }

    private static void AppendImage(
        StringBuilder sb, SiteSettingsSnapshot site, string? url, string alt)
    {
        var absolute = SeoUrl.Asset(site.BaseUrl, url);
        if (absolute is null) return;

        sb.Append("<figure><img src=\"")
            .Append(SeoHtml.SafeHref(absolute))
            .Append("\" alt=\"")
            .Append(SeoHtml.Text(alt))
            .Append("\" /></figure>");
    }
}
