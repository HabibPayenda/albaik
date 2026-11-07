using System.Text;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// Turns one Collection (<c>/collections/{slug}</c>) into one <see cref="SeoPage"/>.
///
/// The queries mirror the SPA's <c>CategoryPage</c>: <c>GET /api/catalog/categories/{slug}</c>
/// for the collection and its brands, and <c>GET /api/catalog/products?category={slug}&amp;pageSize=48</c>
/// for the products. A slug with no active Collection returns null, so this shell never
/// swallows an unknown address: ticket 08 owns the not-found shell.
/// </summary>
public static class CollectionPageShell
{
    private const int PageSize = 48;
    private const string OpenGraphImagePath = "/pwa-512.png";
    private const int OpenGraphImageSize = 512;

    public static async Task<SeoPage?> BuildAsync(
        AppDbContext db, SiteSettingsSnapshot site, string slug, CancellationToken ct)
    {
        var category = await db.Categories.AsNoTracking()
            .Include(c => c.Brands)
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive, ct);

        // Unknown or withdrawn collections are left to ticket 08's not-found shell.
        if (category is null) return null;

        var brands = category.Brands
            .Where(b => b.IsActive)
            .OrderBy(b => b.SortOrder).ThenBy(b => b.Name)
            .ToList();

        // CategoryPage requests the first 48 active products with the catalogue's own
        // ordering (featured first, then authored order, then name).
        var products = await db.Products.AsNoTracking()
            .Include(p => p.Brand).Include(p => p.Category)
            .Where(p => p.IsActive && p.CategoryId == category.Id)
            .OrderByDescending(p => p.IsFeatured)
            .ThenBy(p => p.SortOrder)
            .ThenBy(p => p.Name)
            .Take(PageSize)
            .ToListAsync(ct);

        var canonicalPath = $"/collections/{category.Slug}";
        var canonicalUrl = SeoUrl.Absolute(site.BaseUrl, canonicalPath);
        var description = SeoText.ComposeDescription(
            string.IsNullOrWhiteSpace(category.Description) ? category.Tagline : category.Description);

        var crumbs = new SeoCrumb[]
        {
            new("Home", SeoUrl.Absolute(site.BaseUrl, "/")),
            new("Collections", SeoUrl.Absolute(site.BaseUrl, "/collections")),
            new(category.Name, canonicalUrl),
        };
        var itemList = products.Select(p =>
            (p.Name, SeoUrl.Absolute(site.BaseUrl, $"/products/{p.Slug}")));
        var structuredData = SeoJsonLd.Graph(
            SeoJsonLd.SiteNodes(site)
                .Concat(new object[]
                {
                    SeoJsonLd.ItemList(canonicalUrl, itemList),
                    SeoBreadcrumb.JsonLd(canonicalUrl, crumbs),
                })
                .ToArray());

        return new SeoPage(
            SeoPageType.Collection,
            200,
            canonicalPath,
            canonicalUrl,
            $"{category.Name} — Albaik",
            description,
            site.Name,
            "website",
            SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath),
            OpenGraphImageSize,
            OpenGraphImageSize,
            category.Name,
            structuredData,
            BuildContentHtml(category, brands, products, crumbs));
    }

    private static string BuildContentHtml(
        Category category,
        List<Brand> brands,
        List<Product> products,
        IReadOnlyList<SeoCrumb> crumbs)
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-collection\">");
        sb.Append(SeoBreadcrumb.Html(crumbs));

        sb.Append("<header>");
        sb.Append("<h1>").Append(SeoHtml.Text(category.Name)).Append("</h1>");
        if (!string.IsNullOrWhiteSpace(category.Tagline))
            sb.Append("<p>").Append(SeoHtml.Text(category.Tagline)).Append("</p>");
        if (!string.IsNullOrWhiteSpace(category.Description))
            sb.Append("<p>").Append(SeoHtml.Text(category.Description)).Append("</p>");
        sb.Append("<p>")
            .Append(SeoHtml.Text(
                $"{SeoHtml.Plural(category.Brands.Count, "brand")} · "
                + $"{SeoHtml.Plural(category.Products.Count, "product")}"))
            .Append("</p>");
        sb.Append("</header>");

        if (brands.Count > 0)
        {
            sb.Append("<section>");
            sb.Append("<h2>").Append(SeoHtml.Text($"Brands in {category.Name}")).Append("</h2>");
            foreach (var brand in brands)
            {
                sb.Append("<article>");
                sb.Append("<h3><a href=\"")
                    .Append(SeoHtml.SafeHref($"/collections/{category.Slug}/{brand.Slug}"))
                    .Append("\">")
                    .Append(SeoHtml.Text(brand.Name))
                    .Append("</a></h3>");

                if (!string.IsNullOrWhiteSpace(brand.Tagline))
                    sb.Append("<p>").Append(SeoHtml.Text(brand.Tagline)).Append("</p>");
                if (!string.IsNullOrWhiteSpace(brand.Description))
                    sb.Append("<p>").Append(SeoHtml.Text(brand.Description)).Append("</p>");

                var brandProducts = products.Count(p => p.BrandId == brand.Id);
                sb.Append("<p>").Append(SeoHtml.Text(SeoHtml.Plural(brandProducts, "product")))
                    .Append("</p>");
                sb.Append("</article>");
            }
            sb.Append("</section>");
        }

        sb.Append("<section>");
        sb.Append("<h2>").Append(SeoHtml.Text($"Products in {category.Name}")).Append("</h2>");
        if (products.Count == 0)
        {
            sb.Append("<p>No products are currently published in this collection.</p>");
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

                var label = product.FormulationLabel ?? product.Brand?.Name;
                if (!string.IsNullOrWhiteSpace(label))
                    sb.Append("<p>").Append(SeoHtml.Text(label)).Append("</p>");
                sb.Append("</article>");
            }
        }
        sb.Append("</section>");

        sb.Append("<p><a href=\"/collections\">Back to all collections</a></p>");
        sb.Append("</div>");
        return sb.ToString();
    }
}
