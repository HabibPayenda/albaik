using Albaik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Services;

/// <summary>
/// The public site's canonical origin, read from the dashboard-editable
/// `site.publicBaseUrl` setting.
///
/// One setting is the source of every absolute public URL — redirect Locations,
/// product QR codes and, in later work, canonicals and the sitemap. It is stored as
/// an absolute `https` address with no trailing slash; the validation happens at the
/// point of use as well as at the point of save, so a legacy database row cannot
/// smuggle an `http` origin into a printed QR code.
///
/// A blank or invalid value deliberately resolves to <c>null</c> instead of a guessed
/// production host: redirects then only normalise the request it was sent to, and
/// callers that need an absolute address fall back to the request host (development)
/// rather than inventing a domain.
/// </summary>
public static class PublicSiteUrl
{
    public const string SettingKey = "site.publicBaseUrl";

    /// <summary>The configured origin as `https://host[:port]`, or null when unset/invalid.</summary>
    public static async Task<string?> ReadAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        var value = await db.SiteSettings.AsNoTracking()
            .Where(s => s.Key == SettingKey)
            .Select(s => s.Value)
            .FirstOrDefaultAsync(cancellationToken);

        return Normalize(value);
    }

    /// <summary>
    /// Validates a stored value as an absolute `https` origin and returns it without a
    /// trailing slash. A path, query, fragment, user info or non-https scheme is
    /// rejected; null means "no usable public origin".
    /// </summary>
    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        if (!Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)) return null;
        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return null;
        if (uri.Host.Length == 0 || uri.UserInfo.Length > 0) return null;
        if (uri.AbsolutePath != "/" || uri.Query.Length > 0 || uri.Fragment.Length > 0) return null;

        return uri.IsDefaultPort ? $"https://{uri.Host}" : $"https://{uri.Host}:{uri.Port}";
    }

    /// <summary>
    /// The value to persist from the Settings screen: empty stays empty (the setting is
    /// optional), a valid https origin is trimmed to its canonical form, and anything
    /// else is refused with a message the operator can act on.
    /// </summary>
    public static (string Value, string? Problem) ForStorage(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return (string.Empty, null);

        var normalised = Normalize(value);
        return normalised is null
            ? (string.Empty,
                "The public site URL must be an absolute https address with no path or query, for example https://albaik-group.af.")
            : (normalised, null);
    }
}
