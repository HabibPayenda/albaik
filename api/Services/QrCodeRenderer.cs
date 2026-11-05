using System.Text;
using System.Text.RegularExpressions;
using QRCoder;
using SkiaSharp;

namespace Albaik.Api.Services;

/// <summary>
/// Renders a product's QR code with the brand mark in the middle.
///
/// The mark is not decoration: a bare QR on packaging reads as a generic barcode, and the
/// crown is what tells a customer at arm's length that this is Albaik's own label. It costs
/// error-correction headroom, so the code is generated at ECC level H (about 30% recovery)
/// and the mark covers roughly a fifth of the width — well inside what H tolerates.
///
/// The image is drawn from QRCoder's own output rather than re-implementing module layout,
/// so quiet zones and sizing stay whatever that library decides they should be.
/// </summary>
public static class QrCodeRenderer
{
    /// <summary>Share of the width the white plate behind the mark occupies.</summary>
    private const float PlateShare = 0.22f;
    /// <summary>Share of the plate the mark itself occupies, leaving a white margin.</summary>
    private const float MarkShare = 0.62f;

    private static readonly SKColor Dark = new(0x00, 0x26, 0x72);
    private static readonly Lazy<byte[]?> Crown = new(LoadCrown);

    /// <summary>A PNG with the mark centred. Used for a quick proof and on screen.</summary>
    public static byte[] Png(string url)
    {
        using var data = new QRCodeGenerator().CreateQrCode(url, QRCodeGenerator.ECCLevel.H);
        var png = new PngByteQRCode(data).GetGraphic(20, Rgba(Dark), Rgba(SKColors.White));

        using var bitmap = SKBitmap.Decode(png) ?? throw new InvalidOperationException("QR bitmap could not be decoded.");
        using (var canvas = new SKCanvas(bitmap))
        {
            DrawPlate(canvas, bitmap.Width);
            DrawMark(canvas, bitmap.Width);
        }

        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(SKEncodedImageFormat.Png, 100);
        return encoded.ToArray();
    }

    /// <summary>
    /// An SVG with the mark centred. Vector modules for the printer; the mark itself is a
    /// small raster, because the brand kit ships it as WebP and inlining a bitmap inside an
    /// SVG keeps the file self-contained.
    /// </summary>
    public static string Svg(string url)
    {
        using var data = new QRCodeGenerator().CreateQrCode(url, QRCodeGenerator.ECCLevel.H);
        var svg = new SvgQRCode(data).GetGraphic(1024, "#002672", "#FFFFFF", true);

        // QRCoder emits a viewBox in module units; the overlay has to be placed in the same
        // coordinate space, so the box is read back rather than assumed.
        var box = Regex.Match(svg, @"viewBox=""0 0 ([\d.]+) ([\d.]+)""");
        if (!box.Success) return svg;

        var width = double.Parse(box.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture);
        var height = double.Parse(box.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture);
        var plate = Math.Min(width, height) * PlateShare;
        var plateX = (width - plate) / 2;
        var plateY = (height - plate) / 2;
        var mark = plate * MarkShare;
        var markX = (width - mark) / 2;
        var markY = (height - mark) / 2;

        var crown = Crown.Value;
        var overlay = new StringBuilder();
        overlay.Append($"<rect x=\"{N(plateX)}\" y=\"{N(plateY)}\" width=\"{N(plate)}\" height=\"{N(plate)}\" rx=\"{N(plate * 0.12)}\" fill=\"#FFFFFF\"/>");
        if (crown is not null)
        {
            overlay.Append(
                $"<image x=\"{N(markX)}\" y=\"{N(markY)}\" width=\"{N(mark)}\" height=\"{N(mark)}\" " +
                $"preserveAspectRatio=\"xMidYMid meet\" href=\"data:image/png;base64,{Convert.ToBase64String(crown)}\"/>");
        }

        return svg.Replace("</svg>", overlay + "</svg>");
    }

    // ------------------------------------------------------------------ drawing

    private static void DrawPlate(SKCanvas canvas, int size)
    {
        var plate = size * PlateShare;
        var rect = new SKRect((size - plate) / 2, (size - plate) / 2, (size + plate) / 2, (size + plate) / 2);
        using var paint = new SKPaint { Color = SKColors.White, IsAntialias = true };
        canvas.DrawRoundRect(rect, plate * 0.12f, plate * 0.12f, paint);
    }

    private static void DrawMark(SKCanvas canvas, int size)
    {
        var crown = Crown.Value;
        if (crown is null) return;

        using var bitmap = SKBitmap.Decode(crown);
        if (bitmap is null) return;

        var mark = size * PlateShare * MarkShare;
        var left = (size - mark) / 2f;
        var top = (size - mark) / 2f;
        var destination = new SKRect(left, top, left + mark, top + mark);
        using var paint = new SKPaint { IsAntialias = true };
        canvas.DrawBitmap(bitmap, destination, new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear), paint);
    }

    /// <summary>
    /// The crown as PNG bytes: the brand kit stores it as WebP, which not every SVG
    /// renderer or print tool understands, so it is transcoded once at first use.
    /// </summary>
    private static byte[]? LoadCrown()
    {
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Assets", "crown-navy.webp");
            if (!File.Exists(path)) return null;

            using var bitmap = SKBitmap.Decode(path);
            if (bitmap is null) return null;
            using var image = SKImage.FromBitmap(bitmap);
            using var encoded = image.Encode(SKEncodedImageFormat.Png, 100);
            return encoded.ToArray();
        }
        catch
        {
            // A missing mark must not break printing: the code still renders without it.
            return null;
        }
    }

    private static byte[] Rgba(SKColor color) => new[] { color.Red, color.Green, color.Blue, color.Alpha };
    private static string N(double value) => value.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture);
}
