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

        SeoPage? page;
        try
        {
            page = await resolver.ResolveAsync(context.Request, context.RequestAborted);
        }
        catch (SeoConfigurationException exception)
        {
            // A production deployment with no `site.publicBaseUrl` must fail loudly instead
            // of publishing canonicals, Open Graph URLs or JSON-LD built from an arbitrary
            // Host header. Development never throws this.
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "text/plain; charset=utf-8";
            if (!HttpMethods.IsHead(context.Request.Method))
                await context.Response.WriteAsync(exception.Message, context.RequestAborted);
            return;
        }

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

        var etag = HtmlEtag.Compute(html);
        context.Response.Headers.ETag = etag;
        context.Response.ContentType = "text/html; charset=utf-8";
        // The same directive is carried in both places a crawler looks: the robots meta
        // tag in the head and the X-Robots-Tag header. Indexable pages leave both empty.
        if (!string.IsNullOrWhiteSpace(page.Robots))
            context.Response.Headers["X-Robots-Tag"] = page.Robots;

        // The cache policy is no-cache, so a returning browser always revalidates. When
        // it does and the shell is unchanged, answer 304 and send no HTML again.
        if (HtmlEtag.IsNotModified(context.Request, etag))
        {
            context.Response.StatusCode = StatusCodes.Status304NotModified;
            return;
        }

        context.Response.StatusCode = page.StatusCode;
        if (HttpMethods.IsHead(context.Request.Method)) return;
        await context.Response.WriteAsync(html, context.RequestAborted);
    }
}
