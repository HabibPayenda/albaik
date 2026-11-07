using Albaik.Api.Services;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Shared IIS hosting reports a startup exception as a bare 500.30. The error file is the
/// only diagnostic the operator can reach, and the missing-connection-string failure uses
/// the same writer before the app is even built.
/// </summary>
public class StartupErrorLogTests
{
    [Fact]
    public async Task WriteAsync_CreatesTheReportInTheContentRoot()
    {
        var directory = Path.Combine(
            Path.GetTempPath(), "albaik-startup-log-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);

        try
        {
            await StartupErrorLog.WriteAsync(
                directory, "Production", new InvalidOperationException("missing setting"));

            var path = Path.Combine(directory, StartupErrorLog.FileName);
            Assert.True(File.Exists(path));

            var text = await File.ReadAllTextAsync(path);
            Assert.Contains("Production", text);
            Assert.Contains(directory, text);
            Assert.Contains("missing setting", text);
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
