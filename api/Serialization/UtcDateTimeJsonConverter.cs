using System.Text.Json;
using System.Text.Json.Serialization;

namespace Albaik.Api.Serialization;

/// <summary>
/// MariaDB's <c>datetime(6)</c> has no timezone, so EF reads it with
/// <see cref="DateTimeKind.Unspecified"/>. The application stores UTC. Without this
/// converter the JSON contains a bare local-looking timestamp, and the browser treats
/// it as the viewer's local time - shifting every message by the timezone offset.
/// Writing it as UTC with a trailing Z lets the client render the correct local time.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(
        ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    public override void Write(
        Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

        writer.WriteStringValue(utc);
    }
}
