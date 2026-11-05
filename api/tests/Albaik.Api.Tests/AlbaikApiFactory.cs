using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using MySqlConnector;

namespace Albaik.Api.Tests;

/// <summary>
/// Boots the real API against a uniquely named MariaDB database so every suite sees
/// the exact migrated and seeded copy the production app would create. The database is
/// created by the API's own startup migrations, so tests exercise the same pipeline a
/// fresh deployment does. The database is dropped when the factory is disposed.
///
/// The server connection can be overridden with the ALBAIK_TEST_MYSQL environment
/// variable, e.g. "Server=db;Port=3306;User=test;Password=test". The database name is
/// always replaced with the factory's unique one.
/// </summary>
public class AlbaikApiFactory : WebApplicationFactory<Program>
{
    private const string DefaultConnectionBase =
        "Server=127.0.0.1;Port=3306;User=root;Password=;CharSet=utf8mb4";

    private readonly string _databaseName;
    private readonly string _connectionString;
    private readonly string _webRoot;
    private readonly bool _keepDatabase;

    /// <summary>
    /// Builds a factory pointed at an existing MariaDB test database instead of a
    /// throwaway one, for upgrade scenarios that boot the API twice against the same
    /// database. xUnit only tolerates one public constructor (used for class fixtures),
    /// so this entry point is static rather than a second constructor.
    /// </summary>
    public static AlbaikApiFactory ForUpgradeScenario(string databaseName, bool keepDatabaseForFirstBoot)
        => new(databaseName, keepDatabaseForFirstBoot);

    public AlbaikApiFactory() : this(null, false) { }

    private AlbaikApiFactory(string? databaseName, bool keepDatabase)
    {
        _databaseName = databaseName ?? $"albaik_tests_{Guid.NewGuid():N}";
        _keepDatabase = keepDatabase;
        _connectionString = ConnectionStringFor(_databaseName);
        // Uploads write under the web root; point it at a throwaway directory so a test
        // never leaves files in the real wwwroot/uploads.
        _webRoot = Path.Combine(Path.GetTempPath(), $"albaik-tests-webroot-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_webRoot);

        // The SEO shell uses the built SPA index.html as its template. Production builds
        // copy web/dist into wwwroot; the throwaway web root gets a fixture with the same
        // shape (asset tags, manifest, service-worker registration and an empty React root).
        var template = Path.Combine(AppContext.BaseDirectory, "fixtures", "spa-index.html");
        if (File.Exists(template))
            File.Copy(template, Path.Combine(_webRoot, "index.html"));
    }

    /// <summary>The unique MariaDB database this factory owns.</summary>
    public string DatabaseName => _databaseName;

    /// <summary>The connection string for <see cref="DatabaseName"/>.</summary>
    public string ConnectionString => _connectionString;

    private static string ConnectionBase =>
        Environment.GetEnvironmentVariable("ALBAIK_TEST_MYSQL") is { Length: > 0 } configured
            ? configured
            : DefaultConnectionBase;

    private static string ConnectionStringFor(string databaseName)
    {
        var builder = new MySqlConnectionStringBuilder(ConnectionBase) { Database = databaseName };
        return builder.ConnectionString;
    }

    private Lazy<string>? _token;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        // Host settings flow into builder.Configuration before Program's top-level
        // statements run, so the JWT key and DB connection the API stabilizes at
        // startup are the test values.
        builder.UseSetting("ConnectionStrings:Default", _connectionString);
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

    /// <summary>Drops the test database, e.g. to simulate the database going away.</summary>
    public void DropDatabase()
    {
        MySqlConnection.ClearAllPools();
        var builder = new MySqlConnectionStringBuilder(ConnectionBase) { Database = "" };
        using var connection = new MySqlConnection(builder.ConnectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"DROP DATABASE IF EXISTS `{_databaseName.Replace("`", "``")}`";
        command.ExecuteNonQuery();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;

        if (!_keepDatabase)
        {
            try { DropDatabase(); }
            catch (MySqlException) { }
        }

        if (Directory.Exists(_webRoot))
        {
            try { Directory.Delete(_webRoot, recursive: true); }
            catch (IOException) { }
        }
    }
}
