using System.Globalization;
using System.Text;
using System.Xml.Linq;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Albaik.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Albaik.Api.Seo;

/// <summary>
/// A generated crawl file: its body and the content type it must be served with.
/// </summary>
public sealed record SeoFile(string Content, string ContentType);

/// <summary>
/// The configured public origin is missing in Production, so crawl files cannot name
/// absolute URLs. The controller turns this into an explicit 500 rather than serving a
/// sitemap built from whatever host the request happened to use.
/// </summary>
public sealed class SeoConfigurationException : Exception
{
    public SeoConfigurationException(string message) : base(message) { }
}

/// <summary>
/// Generates <c>robots.txt</c> and <c>sitemap.xml</c> from the live database.
///
/// Both files are cached briefly per public origin, so a staff edit is visible without a
/// rebuild (the next cache window) while a crawler flood does not hit the database on
/// every request. The origin comes from <see cref="PublicSiteUrl"/> - the same setting
/// the QR codes and canonicals use - with a request-origin fallback in Development only.
/// </summary>
public sealed class SeoFileGenerator
{
    public const string RobotsContentType = "text/plain; charset=utf-8";
    public const string SitemapContentType = "application/xml; charset=utf-8";

    private static readonly XNamespace SitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";

    // The spec allows robots.txt to be cached for a day; the sitemap is regenerated
    // much sooner because staff add and remove products and pages.
    private static readonly TimeSpan RobotsCacheFor = TimeSpan.FromDays(1);
    private static readonly TimeSpan SitemapCacheFor = TimeSpan.FromMinutes(5);

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SeoFileGenerator> _logger;

    public SeoFileGenerator(
        AppDbContext db,
        IMemoryCache cache,
        IWebHostEnvironment environment,
        ILogger<SeoFileGenerator> logger)
    {
        _db = db;
        _cache = cache;
        _environment = environment;
        _logger = logger;
    }

    public async Task<SeoFile> GetRobotsAsync(HttpRequest request, CancellationToken ct)
    {
        var origin = await ResolveOriginAsync("robots.txt", request, ct);
        var content = await _cache.GetOrCreateAsync($"seo:robots:{origin}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = RobotsCacheFor;
            return BuildRobots(origin);
        });

        return new SeoFile(content!, RobotsContentType);
    }

    public async Task<SeoFile> GetSitemapAsync(HttpRequest request, CancellationToken ct)
    {
        var origin = await ResolveOriginAsync("sitemap.xml", request, ct);
        var content = await _cache.GetOrCreateAsync($"seo:sitemap:{origin}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = SitemapCacheFor;
            return await BuildSitemapAsync(origin, ct);
        });

        return new SeoFile(content!, SitemapContentType);
    }

    /// <summary>
    /// The absolute public origin. A configured https origin wins; a blank/invalid one is
    /// a hard configuration error in Production (a crawl file must not advertise a host
    /// the operator did not confirm) and falls back to the request origin in Development.
    /// </summary>
    private async Task<string> ResolveOriginAsync(
        string fileName, HttpRequest request, CancellationToken ct)
    {
        var configured = await PublicSiteUrl.ReadAsync(_db, ct);
        if (configured is not null) return configured;

        if (_environment.IsProduction())
        {
            var message =
                $"Cannot generate {fileName}: site.publicBaseUrl is empty or invalid. "
                + "Set an absolute https origin (for example https://albaik-group.af) in the dashboard Settings.";
            _logger.LogError("{Message}", message);
            throw new SeoConfigurationException(message);
        }

        var origin = $"{request.Scheme}://{request.Host}".TrimEnd('/');
        _logger.LogWarning(
            "{FileName} is using the request origin {Origin} because site.publicBaseUrl is not configured (Development only).",
            fileName, origin);
        return origin;
    }

    private static string BuildRobots(string origin)
    {
        var sb = new StringBuilder();
        sb.AppendLine("User-agent: *");
        sb.AppendLine("Allow: /");
        sb.AppendLine("Disallow: /admin");
        sb.AppendLine("Disallow: /api/");
        sb.AppendLine();
        sb.AppendLine($"Sitemap: {origin}/sitemap.xml");
        return sb.ToString();
    }

    private async Task<string> BuildSitemapAsync(string origin, CancellationToken ct)
    {
        var categories = await _db.Categories.AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Id)
            .Select(c => new { c.Slug, c.UpdatedAt })
            .ToListAsync(ct);

        var brands = await _db.Brands.AsNoTracking()
            .Where(b => b.IsActive && b.Category != null && b.Category.IsActive)
            .OrderBy(b => b.Category!.SortOrder).ThenBy(b => b.SortOrder).ThenBy(b => b.Id)
            .Select(b => new { b.Slug, CategorySlug = b.Category!.Slug, b.UpdatedAt })
            .ToListAsync(ct);

        // Match the product shell's rule: a product is only public while its brand and
        // collection are public too.
        var products = await _db.Products.AsNoTracking()
            .Where(p => p.IsActive
                && p.Brand != null && p.Brand.IsActive
                && p.Category != null && p.Category.IsActive)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Id)
            .Select(p => new { p.Slug, p.UpdatedAt })
            .ToListAsync(ct);

        var pages = await _db.Pages.AsNoTracking()
            .Where(p => p.IsPublished)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Id)
            .Select(p => new { p.Slug, p.UpdatedAt })
            .ToListAsync(ct);

        var urlset = new XElement(SitemapNamespace + "urlset");

        AppendUrl(urlset, origin, "/");
        AppendUrl(urlset, origin, "/collections");

        foreach (var category in categories)
            AppendUrl(urlset, origin, $"/collections/{category.Slug.ToLowerInvariant()}", category.UpdatedAt);

        foreach (var brand in brands)
            AppendUrl(urlset, origin,
                $"/collections/{brand.CategorySlug.ToLowerInvariant()}/{brand.Slug.ToLowerInvariant()}",
                brand.UpdatedAt);

        foreach (var product in products)
            AppendUrl(urlset, origin, $"/products/{product.Slug.ToLowerInvariant()}", product.UpdatedAt);

        foreach (var page in pages)
            AppendUrl(urlset, origin, ContentRoutes.PreferredPath(page.Slug), page.UpdatedAt);

        AppendUrl(urlset, origin, "/contact");

        var document = new XDocument(new XDeclaration("1.0", "utf-8", null), urlset);
        return document.ToString(SaveOptions.DisableFormatting);
    }

    private static void AppendUrl(XElement urlset, string origin, string path, DateTime? updatedAt = null)
    {
        var url = new XElement(SitemapNamespace + "url",
            new XElement(SitemapNamespace + "loc", SeoUrl.Absolute(origin, path)));

        if (updatedAt is { } value && value != default)
        {
            // MariaDB returns the stored UTC value with an Unspecified kind; forcing UTC
            // keeps the W3C timestamp honest instead of shifting it by the test host's
            // local offset.
            var utc = DateTime.SpecifyKind(value, DateTimeKind.Utc);
            url.Add(new XElement(SitemapNamespace + "lastmod",
                utc.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)));
        }

        urlset.Add(url);
    }
}
