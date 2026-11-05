using Albaik.Api.Data;

namespace Albaik.Api.Seo;

/// <summary>
/// Maps a public URL to the page shell that should be served for it.
///
/// Ticket 05 knows only the home page. Tickets 06-08 extend this switch with the
/// Collections index, Collection, Brand, Product, content, Contact, Verification and
/// not-found shells. Unknown public paths deliberately return null so the existing SPA
/// fallback keeps handling them until ticket 08 takes over the 404 shell.
/// </summary>
public sealed class SeoRouteResolver
{
    private readonly AppDbContext _db;

    public SeoRouteResolver(AppDbContext db) => _db = db;

    public async Task<SeoPage?> ResolveAsync(HttpRequest request, CancellationToken ct)
    {
        var path = request.Path.Value ?? "/";

        if (path == "/")
        {
            var site = await SiteSettingsSnapshot.LoadAsync(_db, request, ct);
            return await HomePageShell.BuildAsync(_db, site, ct);
        }

        return null;
    }
}
