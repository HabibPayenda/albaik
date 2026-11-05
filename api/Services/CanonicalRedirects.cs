using Albaik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Services;

/// <summary>
/// Gives every public page one canonical address. The middleware answers before the
/// SPA fallback, so a crawler receives a real permanent redirect rather than the
/// index page:
///
///   * `www` (or the apex, when the configured origin is `www`) -> the configured origin;
///   * `http` -> `https`;
///   * trailing slashes are removed and path case is lower-cased;
///   * `/brands/{slug}` -> `/collections/{collection}/{brand}`, using the first active
///     Brand by catalogue order when the slug spans Collections.
///
/// Path and query are preserved on every redirect. `/api` and `/uploads` keep their
/// own path behaviour — a trailing slash there must not be rewritten into a route
/// that does not exist — but the host and scheme corrections still apply to them.
///
/// Host and scheme redirects need the configured origin: with no `site.publicBaseUrl`
/// the middleware never guesses a production domain. Path-only redirects then stay on
/// the host the request arrived at.
/// </summary>
public static class CanonicalRedirects
{
    public static IApplicationBuilder UseCanonicalRedirects(this IApplicationBuilder app)
        => app.Use(Handle);

    private static async Task Handle(HttpContext context, Func<Task> next)
    {
        // Redirects are for page reads. Replaying a POST body through a 301 would let a
        // client turn the follow-up into a GET, so non-idempotent requests pass through.
        if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
        {
            await next();
            return;
        }

        var path = context.Request.Path.Value ?? "/";
        var isApi = path.StartsWith("/api", StringComparison.OrdinalIgnoreCase);
        var isUploads = path.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase);

        string? origin = null;
        string? brandPath = null;
        try
        {
            var db = context.RequestServices.GetRequiredService<AppDbContext>();
            origin = await PublicSiteUrl.ReadAsync(db, context.RequestAborted);
            if (!isApi && !isUploads) brandPath = await ResolveBrandPathAsync(db, path, context.RequestAborted);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // A redirect decision must not turn a reachable page into a 500. If the
            // settings store is down, continue to the normal pipeline, which reports
            // whatever the endpoint itself reports (the health route answers 503).
        }

        var requestScheme = FirstForwardedValue(context, "X-Forwarded-Proto") ?? context.Request.Scheme;
        var requestHost = FirstForwardedValue(context, "X-Forwarded-Host") ?? context.Request.Host.ToString();
        var hostName = new HostString(requestHost).Host;
        var requestOrigin = $"{requestScheme}://{requestHost}";

        var effectivePath = path;
        var pathChanged = false;

        if (!isApi && !isUploads)
        {
            var normalised = NormalizePath(path);
            if (!string.Equals(normalised, path, StringComparison.Ordinal))
            {
                effectivePath = normalised;
                pathChanged = true;
            }

            if (brandPath is not null)
            {
                effectivePath = brandPath;
                pathChanged = true;
            }
        }

        string? canonicalHost = null;
        string? alternateHost = null;
        if (origin is not null)
        {
            canonicalHost = new Uri(origin).Host;
            alternateHost = ToggleWww(canonicalHost);
        }

        var hostNeedsFix = canonicalHost is not null &&
            string.Equals(hostName, alternateHost, StringComparison.OrdinalIgnoreCase);

        var schemeNeedsFix = canonicalHost is not null &&
            !string.Equals(requestScheme, "https", StringComparison.OrdinalIgnoreCase) &&
            (string.Equals(hostName, canonicalHost, StringComparison.OrdinalIgnoreCase) ||
             string.Equals(hostName, alternateHost, StringComparison.OrdinalIgnoreCase));

        if (!hostNeedsFix && !schemeNeedsFix && !pathChanged)
        {
            await next();
            return;
        }

        var targetOrigin = hostNeedsFix || schemeNeedsFix ? origin! : requestOrigin;
        var location = targetOrigin + effectivePath + context.Request.QueryString.Value;

        context.Response.StatusCode = StatusCodes.Status301MovedPermanently;
        context.Response.Headers.Location = location;
    }

    /// <summary>Remove trailing slashes (except the root) and fold the path to lower case.</summary>
    private static string NormalizePath(string path)
    {
        var trimmed = path.TrimEnd('/');
        if (trimmed.Length == 0) return "/";
        return trimmed.ToLowerInvariant();
    }

    /// <summary>
    /// A `/brands/{slug}` path to its collection-scoped equivalent, or null when the
    /// path is not a brand shortcut or no active Brand carries that slug. The first
    /// active Brand by sort order wins; the Collection's own order and the row id only
    /// break ties, so a slug that spans Collections always lands on the same Brand.
    /// </summary>
    private static async Task<string?> ResolveBrandPathAsync(
        AppDbContext db, string path, CancellationToken cancellationToken)
    {
        var normalised = NormalizePath(path);
        var segments = normalised.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length != 2 || segments[0] != "brands") return null;

        var slug = Uri.UnescapeDataString(segments[1]);
        if (slug.Length == 0) return null;

        var brand = await db.Brands.AsNoTracking()
            .Where(b => b.IsActive && b.Slug == slug && b.Category != null && b.Category.IsActive)
            .OrderBy(b => b.SortOrder)
            .ThenBy(b => b.Category!.SortOrder)
            .ThenBy(b => b.Id)
            .Select(b => new { b.Slug, CollectionSlug = b.Category!.Slug })
            .FirstOrDefaultAsync(cancellationToken);

        return brand is null
            ? null
            : $"/collections/{brand.CollectionSlug.ToLowerInvariant()}/{brand.Slug.ToLowerInvariant()}";
    }

    private static string? FirstForwardedValue(HttpContext context, string header)
    {
        var raw = context.Request.Headers[header].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw)) return null;

        // Proxies append their own hop to the list; the first entry is the original
        // client's scheme/host.
        var first = raw.Split(',')[0].Trim();
        return first.Length == 0 ? null : first;
    }

    /// <summary>`www.example.af` becomes `example.af`; the apex gains a `www.`.</summary>
    private static string ToggleWww(string host)
        => host.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? host[4..] : "www." + host;
}
