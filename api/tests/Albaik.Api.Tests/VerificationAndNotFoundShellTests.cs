using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;
using static Albaik.Api.Tests.SeoTestHelpers;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 08 - private surfaces stay out of the index and unknown addresses are honest
/// 404s. The tests assert the response a crawler actually receives: status, robots meta
/// and header, canonical and JSON-LD.
/// </summary>
public class VerificationAndNotFoundShellTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public VerificationAndNotFoundShellTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Verify_KnownCode_NamesTheProductAndLeaksNoCodeIntoMetadata()
    {
        var product = await FirstAdminProductAsync();
        var info = await _factory.AdminClient()
            .GetFromJsonAsync<VerificationInfo>($"/api/admin/products/{product.Id}/verification");
        Assert.NotNull(info);
        Assert.False(string.IsNullOrWhiteSpace(info!.VerificationCode));

        using var client = _factory.CreateClient();
        var response = await client.GetAsync($"/verify/{info.VerificationCode}");
        var html = await ReadHtmlAsync(response);

        Assert.Equal("noindex, nofollow", MetaContent(html, "name", "robots"));
        Assert.Equal("noindex, nofollow", RobotsHeader(response));
        Assert.Null(Canonical(html));
        Assert.DoesNotContain(info.VerificationCode, html, StringComparison.Ordinal);
        Assert.DoesNotContain(info.VerificationCode, JsonLdScript(html), StringComparison.Ordinal);

        Assert.DoesNotContain(
            GraphNodes(html), node => Str(node, "@type") == "Product");
        Assert.True(ContainsHtmlText(html, product.Name));
        Assert.Contains($"/products/{product.Slug}", html, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Verify_UnknownCode_ReturnsTheNoindexShellWithoutNamingAProduct()
    {
        const string unknown = "ZZZZZZZZZZZZZZZZ";

        using var client = _factory.CreateClient();
        var response = await client.GetAsync($"/verify/{unknown}");
        var html = await ReadHtmlAsync(response);

        Assert.Equal("noindex, nofollow", MetaContent(html, "name", "robots"));
        Assert.Equal("noindex, nofollow", RobotsHeader(response));
        Assert.Null(Canonical(html));
        Assert.DoesNotContain(unknown, html, StringComparison.Ordinal);
        Assert.DoesNotContain(GraphNodes(html), node => Str(node, "@type") == "Product");
        Assert.True(ContainsHtmlText(html, "could not verify"));
    }

    [Fact]
    public async Task UnknownPublicPath_Returns404NoindexShellWithoutCanonical()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/not-a-real-page");
        var html = await ReadHtmlAsync(response, HttpStatusCode.NotFound);

        Assert.Equal("Page not found — Albaik", ElementText(html, "title"));
        Assert.Equal("noindex, nofollow", MetaContent(html, "name", "robots"));
        Assert.Equal("noindex, nofollow", RobotsHeader(response));
        Assert.Null(Canonical(html));
        Assert.Equal(1, System.Text.RegularExpressions.Regex.Matches(
            html, "<h1\\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Count);
    }

    [Fact]
    public async Task DashboardRoutes_CarryNoindexHeaderOnEveryResponse()
    {
        using var client = _factory.CreateClient();

        foreach (var path in new[] { "/admin", "/admin/login", "/admin/settings", "/admin/products/1" })
        {
            var response = await client.GetAsync(path);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("noindex, nofollow", RobotsHeader(response));
        }
    }

    [Fact]
    public async Task IndexablePages_DoNotLinkToTheVerificationPage()
    {
        using var client = _factory.CreateClient();

        foreach (var path in new[]
                 {
                     "/", "/collections", "/collections/hair-care", "/about", "/guides/shampoo-guide",
                     "/contact",
                 })
        {
            var html = await ReadHtmlAsync(await client.GetAsync(path));
            Assert.DoesNotContain("/verify/", html, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task UnknownApiAndUploadPaths_KeepTheir404s()
    {
        using var client = _factory.CreateClient();

        Assert.Equal(
            HttpStatusCode.NotFound, (await client.GetAsync("/api/not-a-real-endpoint")).StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound, (await client.GetAsync("/uploads/not-a-real-image.png")).StatusCode);
    }

    private async Task<ProductCardDto> FirstAdminProductAsync()
    {
        using var admin = _factory.AdminClient();
        var list = await admin.GetFromJsonAsync<AdminProductList>("/api/admin/products");
        Assert.NotNull(list);
        Assert.NotEmpty(list!.Items);
        return list.Items[0];
    }

    private sealed record AdminProductList(List<ProductCardDto> Items, int Total);

    private sealed record VerificationInfo(
        string? Ibn, string VerificationCode, string VerificationCodeDisplay, string VerifyUrl);
}
