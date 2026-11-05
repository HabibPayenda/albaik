using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SkiaSharp;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The hero banner is art-directed per breakpoint: four compositions rather than one
/// picture cropped four ways. Each breakpoint uploads to its own path and gets its own
/// dimension ceiling under the same 300 KB byte ceiling, so a phone never downloads a
/// 2560px file and a desktop never gets a soft one
/// (docs/adr/0007-hero-backdrop-per-breakpoint.md).
///
/// The legacy single-backdrop route stays: published rows still point at it.
/// </summary>
public class BackdropVariantUploadTests : IClassFixture<AlbaikApiFactory>
{
    private const string LegacyRoute = "/api/admin/upload/backdrop";

    private readonly AlbaikApiFactory _factory;
    public BackdropVariantUploadTests(AlbaikApiFactory factory) => _factory = factory;

    private sealed record UploadResult(string Url, int Width, int Height, long Size);

    private static byte[] Png(int width, int height, bool noisy = false)
    {
        using var bitmap = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bitmap);
        if (noisy)
        {
            // Blocky noise so the encoder cannot compress the payload to nothing; the
            // byte-ceiling assertion would otherwise be vacuous.
            var random = new Random(1234);
            using var paint = new SKPaint();
            for (var y = 0; y < height; y += 4)
            {
                for (var x = 0; x < width; x += 4)
                {
                    paint.Color = new SKColor((byte)random.Next(256), (byte)random.Next(256), (byte)random.Next(256));
                    canvas.DrawRect(x, y, 4, 4, paint);
                }
            }
        }
        else
        {
            canvas.Clear(SKColors.CornflowerBlue);
        }
        canvas.Flush();

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

    [Theory]
    [InlineData("ultrawide", 2560)]
    [InlineData("desktop", 1920)]
    [InlineData("tablet", 1536)]
    [InlineData("mobile", 1440)]
    public async Task Variant_DownscalesToItsOwnCeiling(string variant, int ceiling)
    {
        using var client = _factory.AdminClient();
        var response = await client.PostAsync($"/api/admin/upload/backdrop/{variant}", Form(Png(3000, 2000), "banner.png"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var uploaded = await response.Content.ReadFromJsonAsync<UploadResult>();
        Assert.NotNull(uploaded);
        Assert.Equal(ceiling, Math.Max(uploaded!.Width, uploaded.Height));
        Assert.True(uploaded.Width <= ceiling && uploaded.Height <= ceiling);
        Assert.StartsWith("/uploads/backdrops/", uploaded.Url);
    }

    [Fact]
    public async Task Variant_StaysUnderTheByteCeiling()
    {
        using var client = _factory.AdminClient();
        var response = await client.PostAsync("/api/admin/upload/backdrop/mobile", Form(Png(900, 700, noisy: true), "noise.png"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var uploaded = await response.Content.ReadFromJsonAsync<UploadResult>();
        Assert.NotNull(uploaded);
        Assert.True(uploaded!.Size <= 300 * 1024, $"stored {uploaded.Size} bytes");
    }

    [Fact]
    public async Task UnknownVariant_IsRejected()
    {
        using var client = _factory.AdminClient();
        var response = await client.PostAsync("/api/admin/upload/backdrop/portrait", Form(Png(800, 600), "banner.png"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ultrawide, desktop, tablet or mobile", body);
    }

    [Fact]
    public async Task LegacyRoute_StillAcceptsASingleBackdrop()
    {
        using var client = _factory.AdminClient();
        var response = await client.PostAsync(LegacyRoute, Form(Png(3000, 2000), "banner.png"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var uploaded = await response.Content.ReadFromJsonAsync<UploadResult>();
        Assert.NotNull(uploaded);
        Assert.Equal(2560, Math.Max(uploaded!.Width, uploaded.Height));
    }
}
