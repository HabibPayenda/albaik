namespace Albaik.Api.Seo;

/// <summary>
/// Marks every dashboard response - including the SPA fallback HTML that serves the
/// dashboard's client-side routes - as <c>noindex, nofollow</c> at the HTTP level.
/// The header is set before the rest of the pipeline runs, so it is present on whatever
/// the dashboard returns (HTML, a redirect or an error).
/// </summary>
public sealed class DashboardNoIndexMiddleware
{
    public const string NoIndexHeader = "X-Robots-Tag";
    public const string NoIndexValue = "noindex, nofollow";

    private readonly RequestDelegate _next;

    public DashboardNoIndexMiddleware(RequestDelegate next) => _next = next;

    public Task InvokeAsync(HttpContext context)
    {
        if (IsDashboardPath(context.Request.Path))
            context.Response.Headers[NoIndexHeader] = NoIndexValue;

        return _next(context);
    }

    private static bool IsDashboardPath(PathString path)
    {
        var value = path.Value ?? string.Empty;
        return value.Equals("/admin", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/admin/", StringComparison.OrdinalIgnoreCase);
    }
}
