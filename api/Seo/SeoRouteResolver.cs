using Albaik.Api.Data;

namespace Albaik.Api.Seo;

/// <summary>
/// Maps a public URL to the page shell that should be served for it.
///
/// Ticket 05 added the home page; ticket 06 adds the Collections index and one Collection.
/// Tickets 07/08 extend this with Brand, Product, content, Contact, Verification and
/// not-found shells. Unknown public paths deliberately return null so the existing SPA
/// fallback keeps handling them until ticket 08 takes over the 404 shell.
/// </summary>
public sealed class SeoRouteResolver
{
    private const string CollectionsPath = "/collections";

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

            // `/collections/{collection}/{brand}` is the Brand page (ticket 07/08), not a
            // Collection; leave it to those tickets rather than rendering the collection.
            if (remainder.Length == 0 || remainder.Contains('/')) return null;

            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            return await CollectionPageShell.BuildAsync(
                _db, site, Uri.UnescapeDataString(remainder), ct);
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
