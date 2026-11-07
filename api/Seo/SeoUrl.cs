using System.Text.RegularExpressions;

namespace Albaik.Api.Seo;

/// <summary>
/// Builds the one absolute origin every canonical, social tag and JSON-LD URL uses.
///
/// The dashboard's <c>site.publicBaseUrl</c> setting wins when it is set. Otherwise the
/// request's own scheme and host are used, which is correct for a single-host deployment
/// and keeps local development useful without configuration. The value is stored with a
/// trailing slash by habit, so it is normalised here rather than at every call site.
/// </summary>
public static class SeoUrl
{
    public static string BaseUrl(string? configured, string scheme, string host)
    {
        var value = (configured ?? string.Empty).Trim();
        if (value.Length == 0) value = $"{scheme}://{host}";
        return value.TrimEnd('/');
    }

    public static string Absolute(string baseUrl, string path)
    {
        if (!path.StartsWith('/')) path = "/" + path;
        return baseUrl + path;
    }

    /// <summary>
    /// An uploaded or bundled image URL as an absolute address. The catalogue stores
    /// images as relative <c>/uploads/...</c> or <c>/products/...</c> paths, so the shell
    /// converts them once here instead of at every tag, avoiding a mix of relative and
    /// absolute social/JSON-LD images.
    /// </summary>
    public static string? Asset(string baseUrl, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var path = value.Trim();
        if (Uri.TryCreate(path, UriKind.Absolute, out var uri))
            return uri.Scheme is "http" or "https" ? path : null;

        return Absolute(baseUrl, path);
    }
}

/// <summary>
/// Copy rules shared by every page shell: collapse editor line breaks and shorten an
/// over-long description at a word boundary so the search snippet stays readable.
/// </summary>
public static class SeoText
{
    public const int DescriptionMinLength = 120;
    public const int DescriptionMaxLength = 160;

    /// <summary>
    /// The truthful padding sentence used when a page's own copy is shorter than the
    /// 120-character minimum. It names only what the catalogue actually contains.
    /// </summary>
    private const string DescriptionTail =
        "Explore the full Albaik catalogue for personal-care, hair-care, skin-care and oral-care products. "
        + "Browse by collection to find products for your everyday needs.";

    /// <summary>
    /// Joins the page's own copy fragments into one snippet. Short copy is padded with
    /// <see cref="DescriptionTail"/> so every description lands inside 120-160
    /// characters, and over-long copy is clamped at a word boundary.
    /// </summary>
    public static string ComposeDescription(params string?[] parts)
    {
        var text = string.Join(" ",
            parts.Where(part => !string.IsNullOrWhiteSpace(part)).Select(part => part!.Trim()));
        text = Regex.Replace(text, @"\s+", " ").Trim();

        if (text.Length == 0) text = DescriptionTail;
        else if (text.Length < DescriptionMinLength) text = text + " " + DescriptionTail;

        return ClampDescription(text, DescriptionMaxLength);
    }

    public static string ClampDescription(string? value, int maxLength = 160)
    {
        var text = Regex.Replace((value ?? string.Empty).Trim(), @"\s+", " ");
        if (text.Length <= maxLength) return text;

        var cut = text.LastIndexOf(' ', maxLength - 1);
        if (cut < 1) cut = maxLength - 1;
        return text[..cut].TrimEnd() + "…";
    }
}
