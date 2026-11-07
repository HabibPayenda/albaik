namespace Albaik.Api.Services;

/// <summary>
/// Applies the site's security and cache headers to every response.
///
/// The security headers are set through <c>OnStarting</c> so they survive whatever the
/// rest of the pipeline does with the response, including redirects, 404s, static files
/// and the SEO shells. The cache policy is chosen from the request path, so hashed
/// build assets can be immutable while HTML and the PWA entry points stay revalidated.
///
/// HSTS is only sent when the request itself is HTTPS (directly or through a proxy's
/// <c>X-Forwarded-Proto</c>), because a browser ignores it on a plain HTTP response.
/// A content security policy is deliberately out of scope.
/// </summary>
public sealed class ResponseHeadersMiddleware
{
    public const string HtmlCachePolicy = "no-cache";
    public const string HashedAssetCachePolicy = "public, max-age=31536000, immutable";
    public const string ImageCachePolicy = "public, max-age=2592000";
    public const string RobotsCachePolicy = "public, max-age=86400";
    public const string SitemapCachePolicy = "public, max-age=300";
    public const string ReferrerPolicy = "strict-origin-when-cross-origin";
    public const string HstsPolicy = "max-age=3600";

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico",
    };

    private readonly RequestDelegate _next;

    public ResponseHeadersMiddleware(RequestDelegate next) => _next = next;

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            ApplySecurityHeaders(context);
            ApplyCachePolicy(context);
            return Task.CompletedTask;
        });

        return _next(context);
    }

    private static void ApplySecurityHeaders(HttpContext context)
    {
        var response = context.Response;
        response.Headers["X-Content-Type-Options"] = "nosniff";
        response.Headers["Referrer-Policy"] = ReferrerPolicy;

        if (IsHttps(context.Request))
            response.Headers["Strict-Transport-Security"] = HstsPolicy;
    }

    private static void ApplyCachePolicy(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "/";

        // The API owns its own caching; security headers still apply above.
        if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase)) return;

        if (path.Equals("/robots.txt", StringComparison.OrdinalIgnoreCase))
        {
            SetCache(context.Response, RobotsCachePolicy);
            return;
        }

        if (path.Equals("/sitemap.xml", StringComparison.OrdinalIgnoreCase))
        {
            SetCache(context.Response, SitemapCachePolicy);
            return;
        }

        // Vite fingerprints everything under /assets, so a year plus immutable is safe.
        if (path.StartsWith("/assets/", StringComparison.OrdinalIgnoreCase))
        {
            SetCache(context.Response, HashedAssetCachePolicy);
            return;
        }

        // Uploaded photography and the brand-kit images bundled into the build change
        // only on a deploy or a staff upload, so a long but finite policy is enough.
        // The `/products/` and `/brand/` rules are for image files only: those prefixes
        // also carry HTML pages (`/products/{slug}`), which must not be cached for a
        // month. `/uploads/` is always an asset folder.
        var hasExtension = Path.HasExtension(path);
        if (path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)
            || (hasExtension && path.StartsWith("/products/", StringComparison.OrdinalIgnoreCase))
            || (hasExtension && path.StartsWith("/brand/", StringComparison.OrdinalIgnoreCase))
            || ImageExtensions.Contains(Path.GetExtension(path)))
        {
            SetCache(context.Response, ImageCachePolicy);
            return;
        }

        // The service worker, its registration shim and the manifest must revalidate so
        // a new build is picked up; caching them long would strand installed PWAs on an
        // old precache. Offline navigation still works because Workbox serves the
        // cached app shell itself.
        if (path.Equals("/sw.js", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/service-worker.js", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/registerSW.js", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/manifest.webmanifest", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/manifest.json", StringComparison.OrdinalIgnoreCase))
        {
            SetCache(context.Response, HtmlCachePolicy);
            return;
        }

        // HTML shells and the SPA fallback are generated or read per request, then
        // revalidated with the ETag the shell or static middleware attaches.
        var contentType = context.Response.ContentType;
        if (contentType is not null &&
            contentType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase))
        {
            SetCache(context.Response, HtmlCachePolicy);
        }
    }

    private static void SetCache(HttpResponse response, string policy)
    {
        // A redirect or error must not inherit a cacheable policy meant for a 200.
        if (response.StatusCode is not (StatusCodes.Status200OK or StatusCodes.Status304NotModified))
            return;

        response.Headers.CacheControl = policy;
    }

    private static bool IsHttps(HttpRequest request)
    {
        if (request.IsHttps) return true;

        var forwarded = request.Headers["X-Forwarded-Proto"].FirstOrDefault();
        return string.Equals(
            forwarded?.Split(',')[0].Trim(), "https", StringComparison.OrdinalIgnoreCase);
    }
}
