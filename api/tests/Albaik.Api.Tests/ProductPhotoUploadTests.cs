using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SkiaSharp;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 03 — a product image must be exactly 1080×1350. A dedicated product-photo
/// upload route enforces it, so every stored product image is the dimensions the Product
/// frame is designed for (docs/adr/0006-product-images-are-framed-4-5.md). The generic
/// catalogue route keeps accepting other sizes, because collection, brand and section
/// artwork still goes through it.
/// </summary>
public class ProductPhotoUploadTests : IClassFixture<AlbaikApiFactory>
{
    private const string ProductRoute = "/api/admin/upload/product";
    private const string GenericRoute = "/api/admin/upload";

    private readonly AlbaikApiFactory _factory;
    public ProductPhotoUploadTests(AlbaikApiFactory factory) => _factory = factory;

    private sealed record UploadResult(string Url, int Width, int Height);

    private static byte[] Png(int width, int height)
    {
        using var bitmap = new SKBitmap(width, height);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.CornflowerBlue);
            canvas.Flush();
        }
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 80);
        return data.ToArray();
    }

    private static MultipartFormDataContent Form(byte[] bytes, string fileName)
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        return new MultipartFormDataContent { { content, "file", fileName } };
    }

    [Fact]
    public async Task ProductPhoto_ExactSize_IsAccepted()
    {
        using var client = _factory.AdminClient();
        var response = await client.PostAsync(ProductRoute, Form(Png(1080, 1350), "photo.png"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var uploaded = await response.Content.ReadFromJsonAsync<UploadResult>();
        Assert.NotNull(uploaded);
        Assert.Equal(1080, uploaded!.Width);
        Assert.Equal(1350, uploaded.Height);
    }

    [Theory]
    [InlineData(1080, 1080)]
    [InlineData(1000, 1250)]
    [InlineData(2160, 2700)] // 4:5, but not the exact size
    public async Task ProductPhoto_OtherSize_IsRejected(int width, int height)
    {
        using var client = _factory.AdminClient();
        var response = await client.PostAsync(ProductRoute, Form(Png(width, height), "wrong.png"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("1080×1350", body);
    }

    [Fact]
    public async Task GenericRoute_StillAcceptsOtherSizes()
    {
        using var client = _factory.AdminClient();
        var response = await client.PostAsync(GenericRoute, Form(Png(800, 600), "artwork.png"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
