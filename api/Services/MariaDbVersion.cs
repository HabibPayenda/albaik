using System.Text.RegularExpressions;

namespace Albaik.Api.Services;

/// <summary>
/// Reads the MariaDB server version and states whether Albaik supports it.
///
/// The connector may report a legacy compatibility prefix (`5.5.5-10.10.7-MariaDB`) or a
/// distribution suffix (`10.11.6-MariaDB-1:10.11.6+maria~ubu2204`), so a naive first
/// version match can read the wrong number. The token immediately before `-MariaDB` wins;
/// a bare version string is still accepted for other MySQL-compatible servers.
/// </summary>
public static class MariaDbVersion
{
    /// <summary>The oldest MariaDB release the API's SQL and migrations support.</summary>
    public static readonly Version MinimumSupported = new(10, 5, 0);

    private static readonly Regex MariaDbVersionPattern = new(
        @"(\d+)\.(\d+)(?:\.(\d+))?-MariaDB",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex AnyVersionPattern = new(
        @"(\d+)\.(\d+)(?:\.(\d+))?",
        RegexOptions.Compiled);

    public static Version Parse(string? serverVersion)
    {
        if (string.IsNullOrWhiteSpace(serverVersion))
            throw new InvalidOperationException("The database server did not report a version.");

        var match = MariaDbVersionPattern.Match(serverVersion);
        if (!match.Success) match = AnyVersionPattern.Match(serverVersion);
        if (!match.Success)
        {
            throw new InvalidOperationException(
                $"Could not read a version number from the database server string '{serverVersion}'.");
        }

        return new Version(
            int.Parse(match.Groups[1].Value),
            int.Parse(match.Groups[2].Value),
            match.Groups[3].Success ? int.Parse(match.Groups[3].Value) : 0);
    }

    public static bool IsSupported(Version version) => version >= MinimumSupported;

    public static void EnsureSupported(string? serverVersion)
    {
        var version = Parse(serverVersion);

        // The README documents MySQL 8.0 as an alternative host, and its version line
        // does not contain "MariaDB". Use that product's own floor rather than rejecting
        // a supported server because 8.0 < 10.5.
        var isMariaDb = serverVersion?.Contains(
            "MariaDB", StringComparison.OrdinalIgnoreCase) ?? false;
        var minimum = isMariaDb ? MinimumSupported : new Version(8, 0, 0);

        if (version >= minimum) return;

        throw new InvalidOperationException(
            $"{version} is not supported: Albaik requires MariaDB "
            + $"{MinimumSupported.Major}.{MinimumSupported.Minor} or newer"
            + (isMariaDb ? "." : ", or MySQL 8.0 or newer."));
    }
}
