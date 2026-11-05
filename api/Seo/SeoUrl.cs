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
}

/// <summary>
/// Copy rules shared by every page shell: collapse editor line breaks and shorten an
/// over-long description at a word boundary so the search snippet stays readable.
/// </summary>
public static class SeoText
{
    public static string ClampDescription(string? value, int maxLength = 160)
    {
        var text = Regex.Replace((value ?? string.Empty).Trim(), @"\s+", " ");
        if (text.Length <= maxLength) return text;

        var cut = text.LastIndexOf(' ', maxLength - 1);
        if (cut < 1) cut = maxLength - 1;
        return text[..cut].TrimEnd() + "…";
    }
}
