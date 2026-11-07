using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 11 - cache and security headers at the HTTP boundary. Static-file tests seed
/// their own throwaway web root, so they do not depend on a built front end. The cache
/// values are asserted literally because they are the contract browsers and the PWA
/// service worker rely on.
/// </summary>
public class CacheAndSecurityHeaderTests : IClassFixture<AlbaikApiFactory>
{
    private const string ImmutableAsset = "public, max-age=31536000, immutable";
    private const string ImageCache = "public, max-age=2592000";
    private const string NoCache = "no-cache";

    private readonly AlbaikApiFactory _factory;

    public CacheAndSecurityHeaderTests(AlbaikApiFactory factory)
    {
        _factory = factory;

        // The shape of a built front end: a hashed bundle under /assets, uploaded and
        // bundled product photography, and the PWA entry points.
        _factory.WriteWebRootFile("assets/app-abc123.js", "console.log('fixture');");
        _factory.WriteWebRootFile("uploads/product-123.webp", "fixture");
        _factory.WriteWebRootFile("products/brand-kit.webp", "fixture");
        _factory.WriteWebRootFile("sw.js", "self.addEventListener('fetch', () => {});");
        _factory.WriteWebRootFile("registerSW.js", "// fixture registration");
        _factory.WriteWebRootFile("manifest.webmanifest", "{\"name\":\"Albaik\"}");
    }

    [Fact]
    public async Task HashedAsset_IsCachedForAYearAsImmutable()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/assets/app-abc123.js");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImmutableAsset, CacheControl(response));
    }

    [Fact]
    public async Task UploadedAndBundledImages_GetALongFiniteCache()
    {
        using var client = _factory.CreateClient();

        foreach (var path in new[] { "/uploads/product-123.webp", "/products/brand-kit.webp" })
        {
            var response = await client.GetAsync(path);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(ImageCache, CacheControl(response));
        }
    }

    [Fact]
    public async Task HtmlShell_IsRevalidatedWithAnETagAndHonours304()
    {
        using var client = _factory.CreateClient();

        var first = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(NoCache, CacheControl(first));
        var etag = first.Headers.ETag;
        Assert.NotNull(etag);

        using var conditional = new HttpRequestMessage(HttpMethod.Get, "/");
        conditional.Headers.TryAddWithoutValidation("If-None-Match", etag!.ToString());
        var second = await client.SendAsync(conditional);

        Assert.Equal(HttpStatusCode.NotModified, second.StatusCode);
        Assert.Equal(NoCache, CacheControl(second));
        Assert.Equal(string.Empty, await second.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task StaticIndexHtml_IsRevalidatedNotCached()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/index.html");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(NoCache, CacheControl(response));
        Assert.NotNull(response.Headers.ETag);
    }

    [Fact]
    public async Task RobotsAndSitemap_HaveTheirOwnCachePolicies()
    {
        using var client = _factory.CreateClient();

        var robots = await client.GetAsync("/robots.txt");
        Assert.Equal(HttpStatusCode.OK, robots.StatusCode);
        Assert.Equal("public, max-age=86400", CacheControl(robots));

        var sitemap = await client.GetAsync("/sitemap.xml");
        Assert.Equal(HttpStatusCode.OK, sitemap.StatusCode);
        Assert.Equal("public, max-age=300", CacheControl(sitemap));
    }

    [Fact]
    public async Task SecurityHeaders_ArePresentOnANormalPage()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("nosniff", Header(response, "X-Content-Type-Options"));
        Assert.Equal("strict-origin-when-cross-origin", Header(response, "Referrer-Policy"));
    }

    [Fact]
    public async Task Hsts_IsSentOverHttpsAndAbsentOverHttp()
    {
        using var http = _factory.CreateClient();
        var plain = await http.GetAsync("/");
        Assert.Null(Header(plain, "Strict-Transport-Security"));

        using var https = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
        });
        var secure = await https.GetAsync("/");

        Assert.Equal(HttpStatusCode.OK, secure.StatusCode);
        Assert.Equal("max-age=3600", Header(secure, "Strict-Transport-Security"));
    }

    [Fact]
    public async Task ServiceWorkerAndManifest_AreRevalidated()
    {
        using var client = _factory.CreateClient();

        foreach (var path in new[] { "/sw.js", "/registerSW.js", "/manifest.webmanifest" })
        {
            var response = await client.GetAsync(path);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(NoCache, CacheControl(response));
            Assert.NotNull(response.Headers.ETag);
        }
    }

    private static string? CacheControl(HttpResponseMessage response)
        => response.Headers.TryGetValues("Cache-Control", out var values)
            ? string.Join(", ", values)
            : null;

    private static string? Header(HttpResponseMessage response, string name)
        => response.Headers.TryGetValues(name, out var values) ? string.Join(", ", values) : null;
}
