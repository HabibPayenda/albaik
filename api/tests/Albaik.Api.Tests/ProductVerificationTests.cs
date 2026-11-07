using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Data;
using Albaik.Api.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The IBN and the verification QR code.
///
/// The IBN is a plain number printed on the product: digits only, unique, and optional
/// while the numbers are being collected. The QR carries a different thing — an opaque,
/// stored token that resolves to a product and drives the "genuine" page. These tests pin
/// the contract the dashboard and the printed labels depend on:
///
///   * a saved IBN reaches both the admin and the public product routes;
///   * a malformed or duplicate IBN is refused rather than silently stored;
///   * a scanned code resolves only for a product that is still published;
///   * replacing a code requires the admin's password and retires the old code.
///
/// See docs/adr/0008-verification-code-is-stored-not-derived.md.
/// </summary>
public class ProductVerificationTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public ProductVerificationTests(AlbaikApiFactory factory) => _factory = factory;

    private sealed record ProductList(List<ProductCardDto> Items, int Total);
    private sealed record VerificationInfo(string? Ibn, string VerificationCode, string VerificationCodeDisplay, string VerifyUrl);
    private sealed record VerifyResult(string Slug, string Name, string? BrandName, string? Ibn);

    // ---------------------------------------------------------------- IBN

    [Fact]
    public async Task Ibn_IsSavedAndServedOnBothProductRoutes()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();
        var product = await FirstProductAsync(admin);

        var saved = await admin.PutAsJsonAsync($"/api/admin/products/{product.Id}", Payload(product, ibn: "6291104123456"));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        var detail = await site.GetFromJsonAsync<ProductDetailDto>($"/api/catalog/products/{product.Slug}");
        Assert.Equal("6291104123456", detail!.Ibn);

        var list = await admin.GetFromJsonAsync<ProductList>("/api/admin/products");
        var card = Assert.Single(list!.Items, p => p.Id == product.Id);
        Assert.Equal("6291104123456", card.Ibn);
    }

    [Fact]
    public async Task Ibn_RejectsAnythingThatIsNotDigits()
    {
        using var admin = _factory.AdminClient();
        var product = await FirstProductAsync(admin);

        var response = await admin.PutAsJsonAsync($"/api/admin/products/{product.Id}", Payload(product, ibn: "AB-12"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("digits", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Ibn_CannotBeSharedByTwoProducts()
    {
        using var admin = _factory.AdminClient();
        var listing = await admin.GetFromJsonAsync<ProductList>("/api/admin/products");
        Assert.True(listing!.Items.Count >= 2, "the seed must contain at least two products");

        var first = await admin.GetFromJsonAsync<ProductDetailDto>($"/api/admin/products/{listing.Items[0].Id}");
        var second = await admin.GetFromJsonAsync<ProductDetailDto>($"/api/admin/products/{listing.Items[1].Id}");

        var taken = await admin.PutAsJsonAsync($"/api/admin/products/{first!.Id}", Payload(first, ibn: "1234567890123"));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);

        var duplicate = await admin.PutAsJsonAsync($"/api/admin/products/{second!.Id}", Payload(second, ibn: "1234567890123"));
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Contains("already uses", await duplicate.Content.ReadAsStringAsync());
    }

    // ---------------------------------------------------------- verification code

    [Fact]
    public async Task Verification_ExposesAnOpaqueCodeAndAnAbsoluteUrl()
    {
        using var admin = _factory.AdminClient();
        var product = await FirstProductAsync(admin);

        var response = await admin.GetAsync($"/api/admin/products/{product.Id}/verification");
        Assert.True(
            response.IsSuccessStatusCode,
            await response.Content.ReadAsStringAsync());
        var info = await response.Content.ReadFromJsonAsync<VerificationInfo>();

        Assert.NotNull(info);
        Assert.Equal(16, info!.VerificationCode.Length);
        Assert.Matches("^[0-9A-HJKMNP-TV-Z]{16}$", info.VerificationCode);
        Assert.Contains("/verify/", info.VerifyUrl);
        // The token, not the IBN, is what a scan resolves.
        Assert.NotEqual(product.Ibn, info.VerificationCode);
    }

    [Fact]
    public async Task Verification_CodeIsStableAcrossRequests()
    {
        using var admin = _factory.AdminClient();
        var product = await FirstProductAsync(admin);

        var first = await admin.GetFromJsonAsync<VerificationInfo>($"/api/admin/products/{product.Id}/verification");
        var second = await admin.GetFromJsonAsync<VerificationInfo>($"/api/admin/products/{product.Id}/verification");

        Assert.Equal(first!.VerificationCode, second!.VerificationCode);
    }

    [Fact]
    public async Task ConcurrentFirstReads_MintOneCodeInsteadOfRacing()
    {
        using var admin = _factory.AdminClient();
        var product = await FirstProductAsync(admin);

        // Simulate a product that predates verification codes.
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var row = await db.Products.SingleAsync(p => p.Id == product.Id);
            row.VerificationCode = null;
            await db.SaveChangesAsync();
        }

        var requests = Enumerable.Range(0, 8)
            .Select(_ => admin.GetAsync(
                $"/api/admin/products/{product.Id}/verification"))
            .ToArray();

        var responses = await Task.WhenAll(requests);
        var failures = new List<string>();
        foreach (var response in responses.Where(r => !r.IsSuccessStatusCode))
            failures.Add($"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        Assert.True(failures.Count == 0, string.Join("\n---\n", failures));

        var results = await Task.WhenAll(
            responses.Select(r => r.Content.ReadFromJsonAsync<VerificationInfo>()));
        var codes = results.Select(result => result!.VerificationCode).Distinct().ToList();

        // The conditional UPDATE means every concurrent request converges on one token;
        // a read-then-write race would print several different QR codes for one product.
        Assert.Single(codes);
        Assert.Equal(16, codes[0].Length);
    }

    [Fact]
    public async Task Qr_EndpointsServeVectorAndBitmap()
    {
        using var admin = _factory.AdminClient();
        var product = await FirstProductAsync(admin);

        var svg = await admin.GetAsync($"/api/admin/products/{product.Id}/qr.svg");
        Assert.Equal(HttpStatusCode.OK, svg.StatusCode);
        Assert.Equal("image/svg+xml", svg.Content.Headers.ContentType?.MediaType);

        var png = await admin.GetAsync($"/api/admin/products/{product.Id}/qr.png");
        Assert.Equal(HttpStatusCode.OK, png.StatusCode);
        Assert.Equal("image/png", png.Content.Headers.ContentType?.MediaType);
        Assert.NotEmpty(await png.Content.ReadAsByteArrayAsync());
    }

    // ------------------------------------------------------------ public lookup

    [Fact]
    public async Task Scan_ResolvesToTheProduct_WhenItIsPublished()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();
        var product = await FirstProductAsync(admin);
        var info = await admin.GetFromJsonAsync<VerificationInfo>($"/api/admin/products/{product.Id}/verification");

        var verified = await site.GetFromJsonAsync<VerifyResult>($"/api/verify/{info!.VerificationCode}");

        Assert.NotNull(verified);
        Assert.Equal(product.Slug, verified!.Slug);
        Assert.Equal(product.Name, verified.Name);
    }

    [Fact]
    public async Task Scan_IsCaseInsensitiveAndIgnoresSeparators()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();
        var product = await FirstProductAsync(admin);
        var info = await admin.GetFromJsonAsync<VerificationInfo>($"/api/admin/products/{product.Id}/verification");
        var typed = info!.VerificationCodeDisplay.ToLowerInvariant();

        var verified = await site.GetFromJsonAsync<VerifyResult>($"/api/verify/{typed}");

        Assert.Equal(product.Slug, verified!.Slug);
    }

    [Fact]
    public async Task Scan_IsRefusedForAnUnknownCode()
    {
        using var site = _factory.CreateClient();
        var response = await site.GetAsync("/api/verify/ZZZZZZZZZZZZZZZZ");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Scan_IsRefusedOnceTheProductIsUnpublished()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();
        var product = await FirstProductAsync(admin);
        var info = await admin.GetFromJsonAsync<VerificationInfo>($"/api/admin/products/{product.Id}/verification");

        var hidden = await admin.PutAsJsonAsync($"/api/admin/products/{product.Id}", Payload(product, product.Ibn, isActive: false));
        Assert.Equal(HttpStatusCode.OK, hidden.StatusCode);

        var response = await site.GetAsync($"/api/verify/{info!.VerificationCode}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // -------------------------------------------------------------- regenerate

    [Fact]
    public async Task Replace_RequiresTheAdminsPassword()
    {
        using var admin = _factory.AdminClient();
        var product = await FirstProductAsync(admin);

        var response = await admin.PostAsJsonAsync(
            $"/api/admin/products/{product.Id}/verification-code",
            new { password = "not-the-password" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("password", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Replace_RetiresTheOldCodeAndActivatesTheNewOne()
    {
        using var admin = _factory.AdminClient();
        using var site = _factory.CreateClient();
        var product = await FirstProductAsync(admin);
        var before = await admin.GetFromJsonAsync<VerificationInfo>($"/api/admin/products/{product.Id}/verification");

        var replaced = await admin.PostAsJsonAsync(
            $"/api/admin/products/{product.Id}/verification-code",
            new { password = "Albaik@2026" });
        Assert.Equal(HttpStatusCode.OK, replaced.StatusCode);
        var after = await replaced.Content.ReadFromJsonAsync<VerificationInfo>();

        Assert.NotNull(after);
        Assert.NotEqual(before!.VerificationCode, after!.VerificationCode);

        // The whole point of asking for the password: the printed label stops working.
        Assert.Equal(HttpStatusCode.NotFound, (await site.GetAsync($"/api/verify/{before.VerificationCode}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await site.GetAsync($"/api/verify/{after.VerificationCode}")).StatusCode);
    }

    // ------------------------------------------------------------------ helpers

    /// <summary>
    /// A product the public catalogue lists, so the public routes serve it. The admin list
    /// also contains hidden products, and both the detail route and the verification page
    /// refuse those.
    /// </summary>
    private async Task<ProductDetailDto> FirstProductAsync(HttpClient admin)
    {
        using var site = _factory.CreateClient();
        var listing = await site.GetFromJsonAsync<ProductList>("/api/catalog/products?pageSize=100");
        Assert.NotNull(listing);
        Assert.NotEmpty(listing!.Items);
        var detail = await admin.GetFromJsonAsync<ProductDetailDto>($"/api/admin/products/{listing.Items[0].Id}");
        Assert.NotNull(detail);
        return detail!;
    }

    /// <summary>
    /// The full product payload, because the admin PUT replaces the row. `ibn` and
    /// `isActive` are the fields under test; everything else is echoed back unchanged.
    /// </summary>
    private static object Payload(ProductDetailDto d, string? ibn, bool? isActive = null) => new
    {
        name = d.Name,
        slug = d.Slug,
        categoryId = d.CategoryId,
        brandId = d.BrandId,
        subtitle = d.Subtitle,
        formulationLabel = d.FormulationLabel,
        shortDescription = d.ShortDescription,
        description = d.Description,
        size = d.Size,
        price = d.Price,
        compareAtPrice = d.CompareAtPrice,
        currency = d.Currency,
        priceNote = d.PriceNote,
        rating = d.Rating,
        reviewCount = d.ReviewCount,
        badge = d.Badge,
        badgeStyle = d.BadgeStyle,
        stockStatus = d.StockStatus,
        imageUrl = d.ImageUrl,
        accentFrom = d.AccentFrom,
        accentTo = d.AccentTo,
        benefits = d.Benefits,
        ingredients = d.Ingredients,
        howToUse = d.HowToUse,
        safetyNote = d.SafetyNote,
        suitableFor = d.SuitableFor,
        ibn,
        isFeatured = d.IsFeatured,
        isActive = isActive ?? d.IsActive,
        sortOrder = d.SortOrder,
        images = d.Images.Select(i => new { url = i.Url, alt = i.Alt, sortOrder = i.SortOrder }),
    };
}
