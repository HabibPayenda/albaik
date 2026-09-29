using SkiaSharp;

namespace Albaik.Api.Services;

/// <summary>Outcome of running an upload through the pipeline.</summary>
/// <param name="Bytes">Encoded payload to write to disk.</param>
/// <param name="Extension">Extension including the leading dot.</param>
/// <param name="Width">Pixel width, or 0 when the source was not rasterised.</param>
/// <param name="Height">Pixel height, or 0 when the source was not rasterised.</param>
/// <param name="Quality">WebP quality actually used, or 0 when passed through.</param>
/// <param name="Transcoded">False when the original bytes were kept verbatim.</param>
/// <param name="OriginalBytes">Size of the upload as received, for reporting.</param>
public sealed record ImageResult(
    byte[] Bytes,
    string Extension,
    int Width,
    int Height,
    int Quality,
    bool Transcoded,
    long OriginalBytes)
{
    public bool ExceedsCeiling(int maxBytes) => Bytes.LongLength > maxBytes;
}

/// <summary>
/// Transcodes uploaded photography to WebP under a hard byte ceiling.
///
/// Why this lives on the server
/// ---------------------------
/// The brief caps every product image at 300 KB. Doing that only in the browser
/// makes it a suggestion: a direct POST, an older client, or a future uploader
/// all bypass it silently. The guarantee has to sit on the one code path every
/// upload traverses — here.
///
/// The strategy mirrors the offline asset pipeline in
/// `.workbuddy-ai/scripts/optimise-assets.py` so a hand-optimised file and an
/// admin upload land in the same shape:
///
///   1. decode, honouring EXIF orientation;
///   2. downscale so the longest edge is at most <see cref="MaxDimension"/>;
///   3. encode WebP, stepping quality down the ladder until the payload fits;
///   4. if even the lowest quality is too large, halve the dimensions and retry.
///
    /// Step 4 is what makes the ceiling absolute rather than best-effort. A 5472px
    /// phone photo at quality 30 can still clear 300 KB; at half that size it cannot.
    ///
    /// Two sets of ceilings
    /// --------------------
    /// The numbers above are sized for a product card, which is what the 300 KB brief
    /// is about. A hero backdrop is displayed at viewport width, so it needs a larger
    /// dimension ceiling; <see cref="Limits"/> carries both sets. The product ceilings
    /// remain the default so that a caller which does not state its intent gets the
    /// documented product behaviour rather than something looser.
    /// </summary>
public sealed class ImagePipeline
{
    /// <summary>Hard ceiling for a single stored product image: 300 KB.</summary>
    public const int MaxBytes = 300 * 1024;

    /// <summary>Longest edge after downscaling. Comfortably above any retina card.</summary>
    public const int MaxDimension = 1600;

    /// <summary>
    /// Hard ceiling for a single stored hero backdrop. The same figure as a product
    /// image, but a separate constant: a backdrop is a different surface, and the two
    /// are tuned against different briefs. Do not collapse them into one — see
    /// docs/adr/0002-backdrop-upload-route.md.
    /// </summary>
    public const int MaxBackdropBytes = 300 * 1024;

    /// <summary>
    /// Longest edge for a full-bleed hero backdrop. A backdrop is displayed at viewport
    /// width, so it is sized for the display rather than for a card, where 1600px is
    /// already past the point of diminishing returns.
    /// </summary>
    public const int MaxBackdropDimension = 2560;

    /// <summary>The byte ceiling and dimension ceiling applied to one kind of upload.</summary>
    /// <param name="MaxBytes">Hard ceiling for the stored payload.</param>
    /// <param name="MaxDimension">Longest edge after downscaling.</param>
    public readonly record struct Limits(int MaxBytes, int MaxDimension)
    {
        /// <summary>Ceilings for catalogue photography: the 300 KB brief, card-sized.</summary>
        public static readonly Limits Product = new(ImagePipeline.MaxBytes, ImagePipeline.MaxDimension);

        /// <summary>Ceilings for hero backdrops: viewport-sized, same byte budget.</summary>
        public static readonly Limits Backdrop = new(ImagePipeline.MaxBackdropBytes, ImagePipeline.MaxBackdropDimension);
    }

    /// <summary>Quality descent, highest first. Cheapest acceptable result wins.</summary>
    private static readonly int[] QualityLadder = [82, 74, 66, 58, 48, 38, 30];

    /// <summary>How many times dimensions may be halved before giving up.</summary>
    private const int MaxHalvings = 3;

    /// <summary>
    /// Formats Skia can rasterise and re-encode. SVG is deliberately absent — it
    /// is vector art that is already smaller than any raster equivalent, and
    /// rasterising it would be a regression, not an optimisation.
    /// </summary>
    private static readonly HashSet<string> RasterExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp", ".tif", ".tiff" };

    /// <summary>Formats stored untouched. Tiny or animated; transcoding loses more than it saves.</summary>
    private static readonly HashSet<string> PassthroughExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".svg", ".gif" };

    public static bool IsAccepted(string extension) =>
        RasterExtensions.Contains(extension) || PassthroughExtensions.Contains(extension);

    public static string DescribeAccepted() =>
        string.Join(", ", RasterExtensions.Concat(PassthroughExtensions).OrderBy(e => e));

    /// <summary>
    /// Runs an upload through the pipeline under the product ceilings. Never throws on
    /// unreadable image data — a corrupt file comes back untranscoded so the caller can
    /// decide, rather than surfacing a 500 to the admin.
    /// </summary>
    public Task<ImageResult> ProcessAsync(Stream source, string extension, CancellationToken ct = default) =>
        ProcessAsync(source, extension, Limits.Product, ct);

    /// <summary>
    /// Runs an upload through the pipeline under the ceilings for the kind of image
    /// being stored. Never throws on unreadable image data — a corrupt file comes back
    /// untranscoded so the caller can decide, rather than surfacing a 500 to the admin.
    /// </summary>
    public async Task<ImageResult> ProcessAsync(
        Stream source,
        string extension,
        Limits limits,
        CancellationToken ct = default)
    {
        using var buffer = new MemoryStream();
        await source.CopyToAsync(buffer, ct);
        var original = buffer.ToArray();

        if (PassthroughExtensions.Contains(extension))
            return new ImageResult(original, extension.ToLowerInvariant(), 0, 0, 0, false, original.LongLength);

        if (!RasterExtensions.Contains(extension))
            return new ImageResult(original, extension.ToLowerInvariant(), 0, 0, 0, false, original.LongLength);

        var decoded = TryDecode(original);
        if (decoded is null)
        {
            // Unreadable as an image. Hand the bytes back so the caller can reject
            // with a useful message instead of a stack trace.
            return new ImageResult(original, extension.ToLowerInvariant(), 0, 0, 0, false, original.LongLength);
        }

        using (decoded)
        {
            var oriented = ApplyOrientation(decoded.Bitmap, decoded.Origin);
            try
            {
                var scaled = Downscale(oriented, limits.MaxDimension);
                try
                {
                    var result = EncodeUnderCeiling(scaled, limits, original.LongLength);
                    if (result is not null) return result;

                    // Last resort: the ceiling wins over resolution.
                    return new ImageResult(original, extension.ToLowerInvariant(), 0, 0, 0, false, original.LongLength);
                }
                finally
                {
                    if (!ReferenceEquals(scaled, oriented)) scaled.Dispose();
                }
            }
            finally
            {
                if (!ReferenceEquals(oriented, decoded.Bitmap)) oriented.Dispose();
            }
        }
    }

    // ------------------------------------------------------------------ steps

    private sealed record Decoded(SKBitmap Bitmap, SKEncodedOrigin Origin) : IDisposable
    {
        public void Dispose() => Bitmap.Dispose();
    }

    private static Decoded? TryDecode(byte[] data)
    {
        try
        {
            var origin = SKEncodedOrigin.TopLeft;
            using (var probe = new MemoryStream(data, writable: false))
            {
                using var codec = SKCodec.Create(probe);
                if (codec is not null) origin = codec.EncodedOrigin;
            }

            using var stream = new MemoryStream(data, writable: false);
            var bitmap = SKBitmap.Decode(stream);
            return bitmap is null ? null : new Decoded(bitmap, origin);
        }
        catch (Exception)
        {
            // Skia throws on truncated or mislabelled data. A failed decode is a
            // normal outcome here, not an exceptional one.
            return null;
        }
    }

    /// <summary>Bakes EXIF rotation into the pixels so every consumer sees the same image.</summary>
    private static SKBitmap ApplyOrientation(SKBitmap src, SKEncodedOrigin origin)
    {
        if (origin == SKEncodedOrigin.TopLeft) return src;

        var w = (float)src.Width;
        var h = (float)src.Height;
        var swapsAxes = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;

        var dw = swapsAxes ? src.Height : src.Width;
        var dh = swapsAxes ? src.Width : src.Height;

        // Each case is the affine map taking source coordinates to destination
        // coordinates, written straight into Skia's matrix layout:
        //   | ScaleX SkewX TransX |
        //   | SkewY  ScaleY TransY |
        var m = origin switch
        {
            SKEncodedOrigin.TopRight    => new SKMatrix { ScaleX = -1, TransX = w, ScaleY = 1, TransY = 0, Persp2 = 1 },
            SKEncodedOrigin.BottomRight => new SKMatrix { ScaleX = -1, TransX = w, ScaleY = -1, TransY = h, Persp2 = 1 },
            SKEncodedOrigin.BottomLeft  => new SKMatrix { ScaleX = 1, TransX = 0, ScaleY = -1, TransY = h, Persp2 = 1 },
            SKEncodedOrigin.LeftTop     => new SKMatrix { SkewX = 1, SkewY = 1, Persp2 = 1 },
            SKEncodedOrigin.RightTop    => new SKMatrix { SkewX = -1, TransX = h, SkewY = 1, TransY = 0, Persp2 = 1 },
            SKEncodedOrigin.RightBottom => new SKMatrix { SkewX = -1, TransX = h, SkewY = -1, TransY = w, Persp2 = 1 },
            SKEncodedOrigin.LeftBottom  => new SKMatrix { SkewX = 1, TransX = 0, SkewY = -1, TransY = w, Persp2 = 1 },
            _ => SKMatrix.CreateIdentity()
        };

        var dst = new SKBitmap(new SKImageInfo(dw, dh, src.ColorType, src.AlphaType));
        using var canvas = new SKCanvas(dst);
        canvas.Concat(in m);
        // Orientation is a pure axis-aligned flip or quarter turn, so there is no
        // fractional geometry to interpolate — nearest neighbour is exact and free.
        canvas.DrawBitmap(src, SKPoint.Empty, new SKSamplingOptions(SKFilterMode.Nearest, SKMipmapMode.None));
        canvas.Flush();
        return dst;
    }

    /// <summary>Downscales so the longest edge fits <paramref name="max"/>. Never upscales.</summary>
    private static SKBitmap Downscale(SKBitmap src, int max)
    {
        var longest = Math.Max(src.Width, src.Height);
        if (longest <= max) return src;
        return Resize(src, (float)max / longest);
    }

    private static SKBitmap Resize(SKBitmap src, float factor)
    {
        var w = Math.Max(1, (int)MathF.Round(src.Width * factor));
        var h = Math.Max(1, (int)MathF.Round(src.Height * factor));
        var info = new SKImageInfo(w, h, src.ColorType, src.AlphaType);
        // Mitchell is the right resampler for photographic downscales — it keeps
        // detail without the ringing a sharper kernel would introduce.
        return src.Resize(info, new SKSamplingOptions(SKCubicResampler.Mitchell))
               ?? src.Copy();
    }

    /// <summary>
    /// Walks quality down, then dimensions down, until the payload fits the ceiling.
    /// Returns null only if the source could not be encoded at all.
    /// </summary>
    private static ImageResult? EncodeUnderCeiling(SKBitmap source, Limits limits, long originalBytes)
    {
        var current = source;
        var ownsCurrent = false;

        try
        {
            for (var halving = 0; halving <= MaxHalvings; halving++)
            {
                foreach (var quality in QualityLadder)
                {
                    var encoded = Encode(current, quality);
                    if (encoded is null) continue;

                    if (encoded.LongLength <= limits.MaxBytes)
                        return new ImageResult(encoded, ".webp", current.Width, current.Height, quality, true, originalBytes);
                }

                if (halving == MaxHalvings) break;

                var next = Resize(current, 0.5f);
                if (ownsCurrent) current.Dispose();
                current = next;
                ownsCurrent = true;
            }

            return null;
        }
        finally
        {
            if (ownsCurrent) current.Dispose();
        }
    }

    private static byte[]? Encode(SKBitmap bitmap, int quality)
    {
        try
        {
            using var image = SKImage.FromBitmap(bitmap);
            using var data = image.Encode(SKEncodedImageFormat.Webp, quality);
            return data?.ToArray();
        }
        catch (Exception)
        {
            return null;
        }
    }
}
