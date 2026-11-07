using Albaik.Api.Data;

namespace Albaik.Api.Seo;

/// <summary>
/// Maps a public URL to the page shell that should be served for it.
///
/// Ticket 05 added the home page; ticket 06 the Collections index and one Collection;
/// ticket 07 the collection-scoped Brand and the Product; ticket 08 the CMS content
/// pages, guides, Contact, Verification and the real 404.
///
/// A missing or inactive record resolves to <see cref="NotFoundShell"/> with a real 404
/// rather than null, so it can never fall through to the SPA's 200 response. API,
/// uploads, the dashboard and static files are bypassed, so the shell never swallows a
/// route another middleware owns.
/// </summary>
public sealed class SeoRouteResolver
{
    private const string CollectionsPath = "/collections";
    private const string ProductsPath = "/products";
    private const string GuidesPath = "/guides/";
    private const string PagesPath = "/pages/";
    private const string VerifyPath = "/verify/";
    private const string ContactPath = "/contact";

    private static readonly HashSet<string> NamedContentRoutes = new(StringComparer.OrdinalIgnoreCase)
    {
        "about", "quality", "safety", "distribution", "privacy", "terms",
    };

    private readonly AppDbContext _db;

    public SeoRouteResolver(AppDbContext db) => _db = db;

    public async Task<SeoPage?> ResolveAsync(HttpRequest request, CancellationToken ct)
    {
        var path = NormalizePath(request.Path.Value);

        // Non-public surfaces keep their existing behaviour: unknown /api and /uploads
        // stay honest 404s, the dashboard middleware owns /admin, and static files with
        // an extension fall through to UseStaticFiles.
        if (ShouldBypass(path)) return null;

        if (path == "/")
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            return await HomePageShell.BuildAsync(_db, site, ct);
        }

        if (string.Equals(path, CollectionsPath, StringComparison.OrdinalIgnoreCase))
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            return await CollectionsIndexShell.BuildAsync(_db, site, request, ct);
        }

        if (string.Equals(path, ContactPath, StringComparison.OrdinalIgnoreCase))
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            return ContactPageShell.Build(site);
        }

        if (path.StartsWith(VerifyPath, StringComparison.OrdinalIgnoreCase))
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            var code = Uri.UnescapeDataString(path[VerifyPath.Length..]);
            return await VerifyPageShell.BuildAsync(_db, site, code, ct);
        }

        if (TryContentRoute(path, out var contentSlug, out var isGuide))
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            var page = await ContentPageShell.BuildAsync(_db, site, contentSlug, path, isGuide, ct);
            return page ?? NotFoundShell.Build(site);
        }

        if (path.StartsWith(CollectionsPath + "/", StringComparison.OrdinalIgnoreCase))
        {
            var remainder = path[(CollectionsPath.Length + 1)..];
            var segments = remainder.Split('/', StringSplitOptions.RemoveEmptyEntries);

            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            if (segments.Length == 1)
            {
                var collection = await CollectionPageShell.BuildAsync(
                    _db, site, Uri.UnescapeDataString(segments[0]), ct);
                return collection ?? NotFoundShell.Build(site);
            }

            if (segments.Length == 2)
            {
                var brand = await BrandPageShell.BuildAsync(
                    _db,
                    site,
                    Uri.UnescapeDataString(segments[0]),
                    Uri.UnescapeDataString(segments[1]),
                    ct);
                return brand ?? NotFoundShell.Build(site);
            }

            return NotFoundShell.Build(site);
        }

        if (path.StartsWith(ProductsPath + "/", StringComparison.OrdinalIgnoreCase))
        {
            var slug = path[(ProductsPath.Length + 1)..];
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            if (slug.Length == 0 || slug.Contains('/')) return NotFoundShell.Build(site);

            var product = await ProductPageShell.BuildAsync(
                _db, site, Uri.UnescapeDataString(slug), ct);
            return product ?? NotFoundShell.Build(site);
        }

        // A `/brands/{slug}` shortcut is answered by the canonical-redirect middleware
        // when the slug is real; an unknown one is a genuine 404, not the SPA's 200.
        var notFoundSite = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
        return NotFoundShell.Build(notFoundSite);
    }

    private static bool ShouldBypass(string path)
    {
        if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/admin", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Static assets, manifests, robots.txt and sitemap.xml all have an extension.
        return Path.HasExtension(path);
    }

    private static bool TryContentRoute(string path, out string slug, out bool isGuide)
    {
        slug = string.Empty;
        isGuide = false;

        if (path.Length > 1)
        {
            var candidate = path[1..];
            if (!candidate.Contains('/') && NamedContentRoutes.Contains(candidate))
            {
                slug = candidate.ToLowerInvariant();
                return true;
            }
        }

        foreach (var (prefix, guide) in new[] { (GuidesPath, true), (PagesPath, false) })
        {
            if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;

            var remainder = path[prefix.Length..];
            if (remainder.Length == 0 || remainder.Contains('/')) return false;

            slug = Uri.UnescapeDataString(remainder);
            isGuide = guide;
            return true;
        }

        return false;
    }

    private static string NormalizePath(string? path)
    {
        var value = string.IsNullOrWhiteSpace(path) ? "/" : path;
        var trimmed = value.TrimEnd('/');
        return trimmed.Length == 0 ? "/" : trimmed;
    }
}
