using Albaik.Api.Data;
using Albaik.Api.Services;
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
        AppDbContext db, HttpRequest request, bool requireConfiguredOrigin, CancellationToken ct)
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

        // Production must never invent a canonical host from whatever Host header the
        // request arrived with: the spec makes an empty `site.publicBaseUrl` a hard
        // configuration error there. Development still falls back to the request origin
        // so a laptop build is useful without configuration.
        var configuredOrigin = PublicSiteUrl.Normalize(
            settings.GetValueOrDefault(PublicSiteUrl.SettingKey));
        string baseUrl;
        if (configuredOrigin is not null)
        {
            baseUrl = configuredOrigin;
        }
        else if (requireConfiguredOrigin)
        {
            throw new SeoConfigurationException(
                "Cannot render a public page: site.publicBaseUrl is empty or invalid. "
                + "Set an absolute https origin (for example https://albaik-group.af) in the dashboard Settings.");
        }
        else
        {
            baseUrl = $"{request.Scheme}://{request.Host}".TrimEnd('/');
        }

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
