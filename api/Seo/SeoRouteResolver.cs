using Albaik.Api.Data;

namespace Albaik.Api.Seo;

/// <summary>
/// Maps a public URL to the page shell that should be served for it.
///
/// Ticket 05 added the home page; ticket 06 the Collections index and one Collection;
/// ticket 07 the collection-scoped Brand and the Product. Ticket 08 extends this with
/// content, Contact, Verification and the general not-found shell.
///
/// A missing or inactive Collection, Brand or Product resolves to
/// <see cref="NotFoundShell"/> with a real 404 rather than null, so it can never fall
/// through to the SPA's 200 response. Paths outside these page types still return null
/// until ticket 08 owns them.
/// </summary>
public sealed class SeoRouteResolver
{
    private const string CollectionsPath = "/collections";
    private const string ProductsPath = "/products";

    private readonly AppDbContext _db;

    public SeoRouteResolver(AppDbContext db) => _db = db;

    public async Task<SeoPage?> ResolveAsync(HttpRequest request, CancellationToken ct)
    {
        var path = NormalizePath(request.Path.Value);

        if (path == "/")
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            return await HomePageShell.BuildAsync(_db, site, ct);
        }

        if (path == CollectionsPath)
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            return await CollectionsIndexShell.BuildAsync(_db, site, request, ct);
        }

        if (path.StartsWith(CollectionsPath + "/", StringComparison.OrdinalIgnoreCase))
        {
            var remainder = path[(CollectionsPath.Length + 1)..];
            var segments = remainder.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0 || segments.Length > 2) return null;

            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            if (segments.Length == 2)
            {
                var brand = await BrandPageShell.BuildAsync(
                    _db,
                    site,
                    Uri.UnescapeDataString(segments[0]),
                    Uri.UnescapeDataString(segments[1]),
                    ct);
                return brand ?? NotFoundShell.Build(site, path, "The brand you requested");
            }

            var collection = await CollectionPageShell.BuildAsync(
                _db, site, Uri.UnescapeDataString(segments[0]), ct);
            return collection ?? NotFoundShell.Build(site, path, "The collection you requested");
        }

        if (path.StartsWith(ProductsPath + "/", StringComparison.OrdinalIgnoreCase))
        {
            var slug = path[(ProductsPath.Length + 1)..];
            if (slug.Length == 0 || slug.Contains('/')) return null;

            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            var product = await ProductPageShell.BuildAsync(
                _db, site, Uri.UnescapeDataString(slug), ct);
            return product ?? NotFoundShell.Build(site, path, "The product you requested");
        }

        return null;
    }

    private static string NormalizePath(string? path)
    {
        var value = string.IsNullOrWhiteSpace(path) ? "/" : path;
        var trimmed = value.TrimEnd('/');
        return trimmed.Length == 0 ? "/" : trimmed;
    }
}
