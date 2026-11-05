using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Albaik.Api.Seo;

/// <summary>
/// Injects a resolved page into the built SPA's index.html.
///
/// The template is left intact apart from the head tags this shell owns and the contents
/// of the React root: asset tags, the manifest and the service-worker registration all
/// survive. The crawlable content goes inside <c>#root</c>, whose contents React replaces
/// on first render, so the shell cannot leave duplicate headings, duplicate ids or stale
/// text behind.
///
/// A missing template is not papered over: the caller falls through to the previous SPA
/// behaviour, so a deployment without a built front end is still visibly broken rather
/// than silently serving a shell with no JavaScript.
/// </summary>
public sealed class SeoShellRenderer
{
    private static readonly Regex TitleTag = new(
        @"<title\b[^>]*>.*?</title>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex MetaTag = new(
        @"<meta\b[^>]*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LinkTag = new(
        @"<link\b[^>]*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex JsonLdScript = new(
        @"<script\b[^>]*\btype\s*=\s*['""]application/ld\+json['""][^>]*>.*?</script>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex EmptyRoot = new(
        @"<div\s+id\s*=\s*['""]root['""][^>]*>\s*</div>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly JsonSerializerOptions JsonLdOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.Default,
    };

    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SeoShellRenderer> _logger;

    public SeoShellRenderer(IWebHostEnvironment environment, ILogger<SeoShellRenderer> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public string? Render(SeoPage page)
    {
        var webRoot = _environment.WebRootPath
            ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var templatePath = Path.Combine(webRoot, "index.html");
        if (!File.Exists(templatePath))
        {
            _logger.LogWarning(
                "SEO shell skipped for {Path}: no SPA template at {TemplatePath}.",
                page.CanonicalPath, templatePath);
            return null;
        }

        var html = File.ReadAllText(templatePath, Encoding.UTF8);
        html = TitleTag.Replace(html, string.Empty);
        html = MetaTag.Replace(html, match =>
            IsManagedMeta(match.Value) ? string.Empty : match.Value);
        html = LinkTag.Replace(html, match =>
            IsCanonicalLink(match.Value) ? string.Empty : match.Value);
        html = JsonLdScript.Replace(html, string.Empty);

        html = InsertBeforeHeadEnd(html, BuildHead(page));
        return EmptyRoot.Replace(html, match =>
            RootOpenTag(match.Value) + page.ContentHtml + "</div>");
    }

    private static string BuildHead(SeoPage page)
    {
        var sb = new StringBuilder();
        sb.Append("<title>").Append(Html(page.Title)).Append("</title>");
        sb.AppendLine();
        AppendMeta(sb, "name", "description", page.Description);
        AppendLink(sb, "canonical", page.CanonicalUrl);
        if (!string.IsNullOrWhiteSpace(page.Robots))
            AppendMeta(sb, "name", "robots", page.Robots);

        AppendMeta(sb, "property", "og:type", page.OpenGraphType);
        AppendMeta(sb, "property", "og:site_name", page.SiteName);
        AppendMeta(sb, "property", "og:title", page.Title);
        AppendMeta(sb, "property", "og:description", page.Description);
        AppendMeta(sb, "property", "og:url", page.CanonicalUrl);
        AppendMeta(sb, "property", "og:image", page.OpenGraphImageUrl);
        AppendMeta(sb, "property", "og:image:width", page.OpenGraphImageWidth.ToString());
        AppendMeta(sb, "property", "og:image:height", page.OpenGraphImageHeight.ToString());
        AppendMeta(sb, "property", "og:image:alt", page.OpenGraphImageAlt);

        AppendMeta(sb, "name", "twitter:card", "summary_large_image");
        AppendMeta(sb, "name", "twitter:title", page.Title);
        AppendMeta(sb, "name", "twitter:description", page.Description);
        AppendMeta(sb, "name", "twitter:image", page.OpenGraphImageUrl);
        AppendMeta(sb, "name", "twitter:image:alt", page.OpenGraphImageAlt);

        sb.Append("<script type=\"application/ld+json\">")
            .Append(JsonSerializer.Serialize(page.StructuredData, JsonLdOptions))
            .Append("</script>");
        sb.AppendLine();
        return sb.ToString();
    }

    private static void AppendMeta(StringBuilder sb, string attribute, string key, string content)
    {
        sb.Append("<meta ").Append(attribute).Append("=\"")
            .Append(Html(key)).Append("\" content=\"")
            .Append(Html(content)).Append("\" />");
        sb.AppendLine();
    }

    private static void AppendLink(StringBuilder sb, string rel, string href)
    {
        sb.Append("<link rel=\"").Append(Html(rel)).Append("\" href=\"")
            .Append(Html(href)).Append("\" />");
        sb.AppendLine();
    }

    private static string InsertBeforeHeadEnd(string html, string head)
    {
        var index = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        if (index < 0) return head + html;
        return string.Concat(html.AsSpan(0, index), head, html.AsSpan(index));
    }

    private static string RootOpenTag(string rootDiv)
    {
        var end = rootDiv.IndexOf('>');
        return rootDiv[..(end + 1)];
    }

    private static bool IsManagedMeta(string tag)
    {
        var name = Attr(tag, "name");
        var property = Attr(tag, "property");
        return string.Equals(name, "description", StringComparison.OrdinalIgnoreCase)
            || string.Equals(name, "robots", StringComparison.OrdinalIgnoreCase)
            || (name?.StartsWith("twitter:", StringComparison.OrdinalIgnoreCase) ?? false)
            || (property?.StartsWith("og:", StringComparison.OrdinalIgnoreCase) ?? false);
    }

    private static bool IsCanonicalLink(string tag) =>
        string.Equals(Attr(tag, "rel"), "canonical", StringComparison.OrdinalIgnoreCase);

    private static string? Attr(string tag, string attribute)
    {
        var match = Regex.Match(
            tag,
            $@"{Regex.Escape(attribute)}\s*=\s*['""](?<value>[^'""]*)['""]",
            RegexOptions.IgnoreCase);
        return match.Success ? match.Groups["value"].Value : null;
    }

    private static string Html(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
}
