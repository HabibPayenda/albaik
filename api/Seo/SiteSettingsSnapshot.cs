using Albaik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// The site-owned values a page shell needs, read fresh on every request so dashboard
/// edits appear immediately without a rebuild. <see cref="Description"/> is the raw site
/// description; each page decides whether it is the snippet or the fallback body.
/// </summary>
public sealed record SiteSettingsSnapshot(
    string BaseUrl,
    string Name,
    string Tagline,
    string Description,
    string? Phone,
    string? Address,
    string? ContactEmail,
    IReadOnlyList<string> SameAs)
{
    public static async Task<SiteSettingsSnapshot> LoadAsync(
        AppDbContext db, HttpRequest request, CancellationToken ct)
    {
        var settings = await db.SiteSettings.AsNoTracking()
            .Select(s => new { s.Key, s.Value })
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        string Value(string key, string fallback = "")
        {
            var value = settings.TryGetValue(key, out var stored) ? stored : null;
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        var name = Value("site.name", "Albaik Group of Companies");
        var tagline = Value("site.tagline", "The Mark of Pure Perfection");
        var description = Value("site.description", tagline);
        var baseUrl = SeoUrl.BaseUrl(settings.GetValueOrDefault("site.publicBaseUrl"),
            request.Scheme, request.Host.ToString());

        var sameAs = new[] { "social.facebook", "social.instagram", "social.tiktok", "social.linkedin" }
            .Select(key => Value(key))
            .Where(url => url.Length > 0)
            .ToList();

        return new SiteSettingsSnapshot(
            baseUrl, name, tagline, description,
            Blank(Value("contact.phone")),
            Blank(Value("contact.address")),
            Blank(Value("contact.email")),
            sameAs);
    }

    private static string? Blank(string value) => value.Length == 0 ? null : value;
}
