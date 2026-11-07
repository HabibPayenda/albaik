using Albaik.Api.Services;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The connector's version string is not a plain number: MariaDB reports a legacy
/// compatibility prefix or a distribution suffix depending on the build. Reading the wrong
/// token would either reject a supported server or accept an unsupported one.
/// </summary>
public class MariaDbVersionTests
{
    [Theory]
    [InlineData("10.10.2-MariaDB", 10, 10, 2)]
    [InlineData("10.11.6-MariaDB-1:10.11.6+maria~ubu2204", 10, 11, 6)]
    [InlineData("5.5.5-10.10.7-MariaDB", 10, 10, 7)]
    [InlineData("10.5.0-MariaDB", 10, 5, 0)]
    [InlineData("8.0.34", 8, 0, 34)]
    public void Parse_ReadsTheServerVersion(string value, int major, int minor, int patch)
    {
        Assert.Equal(new Version(major, minor, patch), MariaDbVersion.Parse(value));
    }

    [Theory]
    [InlineData("10.4.30-MariaDB")]
    [InlineData("5.5.5-10.3.39-MariaDB")]
    public void UnsupportedVersion_IsRejected(string value)
    {
        Assert.False(MariaDbVersion.IsSupported(MariaDbVersion.Parse(value)));
        var error = Assert.Throws<InvalidOperationException>(
            () => MariaDbVersion.EnsureSupported(value));
        Assert.Contains("10.5", error.Message);
    }

    [Fact]
    public void SupportedVersion_IsAccepted()
    {
        MariaDbVersion.EnsureSupported("13.0.2-MariaDB");
    }

    [Fact]
    public void UnreadableVersion_ThrowsAClearError()
    {
        Assert.Throws<InvalidOperationException>(() => MariaDbVersion.Parse("not a version"));
    }
}
