using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Albaik.Api.Tests;

/// <summary>
/// Boots the real API with a throwaway SQLite file so every suite sees the exact
/// seeded copy the production app would create on first start. The database is
/// populated by <see cref="Program"/>'s own startup seeding, so tests exercise the
/// same pipeline a fresh deployment does.
/// </summary>
public class AlbaikApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath;
    private readonly string _webRoot;
    private readonly bool _keepDatabase;

    /// <summary>
    /// Builds a factory pointed at an existing SQLite file instead of the throwaway, for
    /// upgrade scenarios that boot the API twice against the same database. xUnit only
    /// tolerates one public constructor (used for class fixtures), so this entry point is
    /// static rather than a second constructor.
    /// </summary>
    public static AlbaikApiFactory ForUpgradeScenario(string dbPath, bool keepDatabaseForFirstBoot)
        => new(dbPath, keepDatabaseForFirstBoot);

    public AlbaikApiFactory() : this(null, false) { }

    private AlbaikApiFactory(string? dbPath, bool keepDatabase)
    {
        _dbPath = dbPath ?? Path.Combine(Path.GetTempPath(), $"albaik-tests-{Guid.NewGuid():N}.db");
        _keepDatabase = keepDatabase;
        // Uploads write under the web root; point it at a throwaway directory so a test
        // never leaves files in the real wwwroot/uploads.
        _webRoot = Path.Combine(Path.GetTempPath(), $"albaik-tests-webroot-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_webRoot);
    }

    private Lazy<string>? _token;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        // Host settings flow into builder.Configuration before Program's top-level
        // statements run, so the JWT key and DB connection the API stabilizes at
        // startup are the test values. A ConfigureAppConfiguration in-memory add
        // would only surface after Build(), leaving Program to read the real key
        // and the developer's albaik.db.
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_dbPath}");
        builder.UseSetting("Jwt:Key", "test-signing-key-at-least-32-bytes-long-0123456789");
        builder.UseWebRoot(_webRoot);
    }

    /// <summary>
    /// Signs in as the seeded administrator and returns a bearer token. The value is
    /// minted once per factory and reused, matching how the SPA keeps its session.
    /// </summary>
    public string AuthToken() => (_token ??= new Lazy<string>(() =>
    {
        using var client = CreateClient();
        var response = client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "Albaik@2026" }).GetAwaiter().GetResult();
        response.EnsureSuccessStatusCode();
        var result = response.Content.ReadFromJsonAsync<LoginResultDto>().GetAwaiter().GetResult();
        return result!.Token;
    })).Value;

    /// <summary>A fresh, authenticated client for one request sequence.</summary>
    public HttpClient AdminClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", AuthToken());
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && !_keepDatabase && File.Exists(_dbPath))
        {
            try { File.Delete(_dbPath); }
            catch (IOException) { }
        }
        if (disposing && Directory.Exists(_webRoot))
        {
            try { Directory.Delete(_webRoot, recursive: true); }
            catch (IOException) { }
        }
    }
}