using Albaik.Api.Seo;
using Microsoft.AspNetCore.Mvc;

namespace Albaik.Api.Controllers;

/// <summary>
/// The crawl files at the site root. They are ordinary endpoints so the SPA fallback can
/// never answer them, and they read the same configured public origin as every canonical
/// and QR code.
/// </summary>
[ApiController]
public sealed class SeoFilesController : ControllerBase
{
    private readonly SeoFileGenerator _generator;
    public SeoFilesController(SeoFileGenerator generator) => _generator = generator;

    [HttpGet("/robots.txt")]
    public Task<IActionResult> Robots(CancellationToken ct)
        => GenerateAsync(() => _generator.GetRobotsAsync(Request, ct));

    [HttpGet("/sitemap.xml")]
    public Task<IActionResult> Sitemap(CancellationToken ct)
        => GenerateAsync(() => _generator.GetSitemapAsync(Request, ct));

    private static async Task<IActionResult> GenerateAsync(Func<Task<SeoFile>> generate)
    {
        try
        {
            var file = await generate();
            return new ContentResult
            {
                Content = file.Content,
                ContentType = file.ContentType,
                StatusCode = StatusCodes.Status200OK,
            };
        }
        catch (SeoConfigurationException exception)
        {
            // An explicit failure the operator can see in the response and the log,
            // rather than a sitemap silently built from an unintended host.
            return new ContentResult
            {
                Content = exception.Message,
                ContentType = SeoFileGenerator.RobotsContentType,
                StatusCode = StatusCodes.Status500InternalServerError,
            };
        }
    }
}
