using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Albaik.Importer;

/// <summary>
/// A deterministic digest of every mapped column in a table's rows. The same routine
/// runs over the parsed SQLite rows and the rows read back from MariaDB, so a row that
/// changed in transit (a lost string, a re-scaled decimal, a shortened timestamp) makes
/// the two digests disagree and the import fail instead of being reported as a success.
/// </summary>
internal static class ContentChecksum
{
    public static string Compute(IEntityType entityType, IEnumerable<object> rows)
    {
        var properties = entityType.GetProperties()
            .Where(p => p.PropertyInfo is not null)
            .OrderBy(p => p.GetColumnName(), StringComparer.Ordinal)
            .ToArray();

        var keyProperties = entityType.FindPrimaryKey()?.Properties.ToArray() ?? Array.Empty<IProperty>();

        var ordered = rows
            .OrderBy(row => KeyOf(keyProperties, row), StringComparer.Ordinal)
            .ToList();

        var canonical = new StringBuilder();
        foreach (var row in ordered)
        {
            foreach (var property in properties)
            {
                AppendValue(canonical, property.PropertyInfo!.GetValue(row));
            }

            canonical.Append('\u001e');
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(canonical.ToString()));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string KeyOf(IReadOnlyList<IProperty> keyProperties, object row)
    {
        var key = new StringBuilder();
        foreach (var property in keyProperties)
        {
            AppendValue(key, property.PropertyInfo!.GetValue(row));
        }

        return key.ToString();
    }

    private static void AppendValue(StringBuilder target, object? value)
    {
        switch (value)
        {
            case null:
                target.Append("N;");
                return;
            case string text:
                AppendTagged(target, 'S', text);
                return;
            case bool boolean:
                target.Append(boolean ? "B1;" : "B0;");
                return;
            case int number:
                target.Append('I').Append(number.ToString(CultureInfo.InvariantCulture)).Append(';');
                return;
            case long number:
                target.Append('L').Append(number.ToString(CultureInfo.InvariantCulture)).Append(';');
                return;
            case double number:
                // "R" is round-trippable, so equal bit patterns produce equal text.
                target.Append('D').Append(number.ToString("R", CultureInfo.InvariantCulture)).Append(';');
                return;
            case decimal number:
                target.Append('M').Append(number.ToString("G29", CultureInfo.InvariantCulture)).Append(';');
                return;
            case DateTime timestamp:
                target.Append('T')
                    .Append(timestamp.ToString("yyyy-MM-dd HH:mm:ss.ffffff", CultureInfo.InvariantCulture))
                    .Append(';');
                return;
            case IEnumerable<string> collection:
                AppendTagged(target, 'J', JsonSerializer.Serialize(collection.ToArray()));
                return;
            default:
                throw new InvalidOperationException(
                    $"The content checksum does not know how to canonicalise {value.GetType().Name}.");
        }
    }

    private static void AppendTagged(StringBuilder target, char tag, string text)
    {
        target.Append(tag)
            .Append(text.Length.ToString(CultureInfo.InvariantCulture))
            .Append(':')
            .Append(text)
            .Append(';');
    }
}
