using System.Globalization;
using System.Text;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// Turns the Collections index (<c>/collections</c>) into one <see cref="SeoPage"/>.
///
/// The page is the SPA's catalogue index: collection cards followed by the filtered
/// product grid. The queries mirror <c>GET /api/catalog/categories?withBrands=true</c>
/// and <c>GET /api/catalog/products</c> - the payloads the SPA renders - so the shell's
/// counts, ordering and links are the ones a visitor sees.
///
/// Canonical rules for the index's query parameters:
///   * a Collection selected on its own canonicalises to <c>/collections/{slug}</c>;
///   * search and other filtered views are <c>noindex, follow</c> and self-canonical;
///   * page two and later self-canonicalises with its page parameter.
/// </summary>
public static class CollectionsIndexShell
{
    private const string PageTitle = "Collections — Albaik";
    private const int PageSize = 12;
    private const string OpenGraphImagePath = "/pwa-512.png";
    private const int OpenGraphImageSize = 512;

    public static async Task<SeoPage> BuildAsync(
        AppDbContext db, SiteSettingsSnapshot site, HttpRequest request, CancellationToken ct)
    {
        var categories = await db.Categories.AsNoTracking()
            .Include(c => c.Brands)
            .Include(c => c.Products)
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync(ct);

        var categorySlug = Read(request, "category");
        var brandSlug = Read(request, "brand");
        var search = Read(request, "search");
        var page = ReadPage(request);

        var activeCategory = categorySlug.Length == 0
            ? null
            : categories.FirstOrDefault(c =>
                string.Equals(c.Slug, categorySlug, StringComparison.OrdinalIgnoreCase));

        var products = await QueryProductsAsync(db, categorySlug, brandSlug, search, page, ct);
        var total = await CountProductsAsync(db, categorySlug, brandSlug, search, ct);

        var hasSearch = search.Length > 0;
        var hasBrand = brandSlug.Length > 0;
        var categoryUnknown = categorySlug.Length > 0 && activeCategory is null;
        var pureCategorySelection =
            activeCategory is not null && !hasSearch && !hasBrand && page <= 1;

        var canonicalPath = pureCategorySelection
            ? $"/collections/{activeCategory!.Slug}"
            : SelfPath(categorySlug, brandSlug, search, page);

        var robots = pureCategorySelection || (!hasSearch && !hasBrand && !categoryUnknown)
            ? null
            : "noindex, follow";

        var canonicalUrl = SeoUrl.Absolute(site.BaseUrl, canonicalPath);
        var description = BuildDescription(site, categories);

        var itemList = pureCategorySelection || (hasSearch || hasBrand || categoryUnknown || page > 1)
            ? products.Select(p => (p.Name, SeoUrl.Absolute(site.BaseUrl, $"/products/{p.Slug}")))
            : categories.Select(c => (c.Name, SeoUrl.Absolute(site.BaseUrl, $"/collections/{c.Slug}")));

        var structuredData = SeoJsonLd.Graph(
            SeoJsonLd.SiteNodes(site).Concat(new object[] { SeoJsonLd.ItemList(canonicalUrl, itemList) })
                .ToArray());

        return new SeoPage(
            SeoPageType.CollectionsIndex,
            200,
            canonicalPath,
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
            BuildContentHtml(categories, products, total, activeCategory, search, page),
            robots);
    }

    private static string BuildDescription(SiteSettingsSnapshot site, List<Category> categories)
    {
        if (categories.Count == 0)
            return SeoText.ComposeDescription(site.Description);

        var names = SeoHtml.JoinNaturally(categories.Select(c => c.Name).ToList());
        return SeoText.ComposeDescription(
            $"Explore Albaik's product collections: {names}.",
            "Browse personal-care and everyday products from Albaik.");
    }

    private static async Task<List<Product>> QueryProductsAsync(
        AppDbContext db, string categorySlug, string brandSlug, string search, int page, CancellationToken ct)
    {
        var query = ProductQuery(db, categorySlug, brandSlug, search);
        return await query
            .OrderByDescending(p => p.IsFeatured)
            .ThenBy(p => p.SortOrder)
            .ThenBy(p => p.Name)
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .ToListAsync(ct);
    }

    private static Task<int> CountProductsAsync(
        AppDbContext db, string categorySlug, string brandSlug, string search, CancellationToken ct)
        => ProductQuery(db, categorySlug, brandSlug, search).CountAsync(ct);

    private static IQueryable<Product> ProductQuery(
        AppDbContext db, string categorySlug, string brandSlug, string search)
    {
        var query = db.Products.AsNoTracking()
            .Include(p => p.Brand).Include(p => p.Category)
            .Where(p => p.IsActive);

        if (categorySlug.Length > 0) query = query.Where(p => p.Category!.Slug == categorySlug);
        if (brandSlug.Length > 0) query = query.Where(p => p.Brand!.Slug == brandSlug);
        if (search.Length > 0)
        {
            var term = search;
            query = query.Where(p => EF.Functions.Like(p.Name, $"%{term}%")
                                  || EF.Functions.Like(p.ShortDescription ?? "", $"%{term}%")
                                  || EF.Functions.Like(p.Brand!.Name, $"%{term}%"));
        }

        return query;
    }

    private static string BuildContentHtml(
        List<Category> categories,
        List<Product> products,
        int total,
        Category? activeCategory,
        string search,
        int page)
    {
        var brandSlugs = categories
            .SelectMany(c => c.Brands.Where(b => b.IsActive).Select(b => b.Slug))
            .Distinct()
            .Count();

        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-collections-index\">");

        sb.Append("<header>");
        sb.Append("<h1>Collections</h1>");
        sb.Append("<p>")
            .Append(SeoHtml.Text(
                $"{SeoHtml.Plural(categories.Count, "collection")} · "
                + $"{SeoHtml.Plural(brandSlugs, "brand")} · "
                + $"{SeoHtml.Plural(categories.Sum(c => c.Products.Count), "product")}"))
            .Append("</p>");
        sb.Append("</header>");

        sb.Append("<section>");
        sb.Append("<h2>Shop by collection</h2>");
        foreach (var category in categories)
        {
            sb.Append("<article>");
            sb.Append("<h3><a href=\"")
                .Append(SeoHtml.SafeHref($"/collections/{category.Slug}"))
                .Append("\">")
                .Append(SeoHtml.Text(category.Name))
                .Append("</a></h3>");

            if (!string.IsNullOrWhiteSpace(category.Tagline))
                sb.Append("<p>").Append(SeoHtml.Text(category.Tagline)).Append("</p>");
            if (!string.IsNullOrWhiteSpace(category.Description))
                sb.Append("<p>").Append(SeoHtml.Text(category.Description)).Append("</p>");

            sb.Append("<p>")
                .Append(SeoHtml.Text(
                    $"{SeoHtml.Plural(category.Brands.Count, "brand")} · "
                    + $"{SeoHtml.Plural(category.Products.Count, "product")}"))
                .Append("</p>");

            var brands = category.Brands
                .Where(b => b.IsActive)
                .OrderBy(b => b.SortOrder).ThenBy(b => b.Name)
                .ToList();
            if (brands.Count > 0)
            {
                sb.Append("<ul>");
                foreach (var brand in brands)
                {
                    sb.Append("<li><a href=\"")
                        .Append(SeoHtml.SafeHref($"/collections/{category.Slug}/{brand.Slug}"))
                        .Append("\">")
                        .Append(SeoHtml.Text(brand.Name))
                        .Append("</a></li>");
                }
                sb.Append("</ul>");
            }

            sb.Append("</article>");
        }
        sb.Append("</section>");

        sb.Append("<section>");
        var heading = activeCategory is not null
            ? $"Products in {activeCategory.Name}"
            : search.Length > 0
                ? $"Search results for \"{search}\""
                : "Products";
        sb.Append("<h2>").Append(SeoHtml.Text(heading)).Append("</h2>");
        sb.Append("<p>").Append(SeoHtml.Text(SeoHtml.Plural(total, "product"))).Append("</p>");

        if (products.Count == 0)
        {
            sb.Append("<p>No products match these filters.</p>");
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

        if (page > 1)
            sb.Append("<p>Page ").Append(page.ToString(CultureInfo.InvariantCulture)).Append("</p>");

        sb.Append("</section>");
        sb.Append("</div>");
        return sb.ToString();
    }

    /// <summary>
    /// The canonical path for a filtered view: only the query parameters that change the
    /// content are kept, in a stable order, and tracking parameters are dropped.
    /// </summary>
    private static string SelfPath(string category, string brand, string search, int page)
    {
        var parts = new List<string>();
        Add("category", category);
        Add("brand", brand);
        Add("search", search);
        if (page > 1) Add("page", page.ToString(CultureInfo.InvariantCulture));

        return parts.Count == 0
            ? "/collections"
            : "/collections?" + string.Join("&", parts);

        void Add(string key, string value)
        {
            if (value.Length == 0) return;
            parts.Add(
                Uri.EscapeDataString(key) + "=" + Uri.EscapeDataString(value));
        }
    }

    private static string Read(HttpRequest request, string key)
        => (request.Query[key].ToString() ?? string.Empty).Trim();

    private static int ReadPage(HttpRequest request)
        => int.TryParse(request.Query["page"].ToString(), NumberStyles.Integer,
            CultureInfo.InvariantCulture, out var page) && page > 1
            ? page
            : 1;
}
