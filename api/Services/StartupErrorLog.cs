namespace Albaik.Api.Services;

/// <summary>
/// Writes the startup failure report that shared IIS hosting otherwise swallows as a bare
/// HTTP 500.30. It is best-effort by design: a failure to write the report must never mask
/// the failure it is reporting.
/// </summary>
public static class StartupErrorLog
{
    public const string FileName = "startup-error.log";

    public static async Task WriteAsync(
        string contentRootPath, string environmentName, Exception error)
    {
        try
        {
            var logPath = Path.Combine(contentRootPath, FileName);
            await File.WriteAllTextAsync(
                logPath,
                $"{DateTime.UtcNow:O}{Environment.NewLine}"
                + $"Environment: {environmentName}{Environment.NewLine}"
                + $"ContentRoot: {contentRootPath}{Environment.NewLine}{Environment.NewLine}"
                + error);
        }
        catch
        {
            // Writing the report must never mask the failure it is reporting.
        }
    }
}
