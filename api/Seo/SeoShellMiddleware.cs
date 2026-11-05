namespace Albaik.Api.Seo;

/// <summary>
/// Serves the SEO shell for public routes the resolver knows about and hands everything
/// else to the rest of the pipeline. It runs before default files so <c>/</c> is the shell
/// rather than the bare SPA index, while assets, <c>/api</c> and <c>/uploads</c> are
/// untouched.
/// </summary>
public sealed class SeoShellMiddleware
{
    private readonly RequestDelegate _next;

    public SeoShellMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        SeoRouteResolver resolver,
        SeoShellRenderer renderer)
    {
        if (!HttpMethods.IsGet(context.Request.Method) &&
            !HttpMethods.IsHead(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var page = await resolver.ResolveAsync(context.Request, context.RequestAborted);
        if (page is null)
        {
            await _next(context);
            return;
        }

        var html = renderer.Render(page);
        if (html is null)
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = page.StatusCode;
        context.Response.ContentType = "text/html; charset=utf-8";
        if (HttpMethods.IsHead(context.Request.Method)) return;
        await context.Response.WriteAsync(html, context.RequestAborted);
    }
}
