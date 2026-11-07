using System.Text;
using System.Text.Json.Serialization;
using Albaik.Api.Data;
using Albaik.Api.Seo;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ------------------------------------------------------------------ services

var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
{
    var configurationError = new InvalidOperationException(
        "ConnectionStrings:Default is not configured. Set the ConnectionStrings__Default "
        + "environment variable (or the host's connection string) before starting the application.");

    // The main startup catch block is below the app build. Without this report the most
    // common deployment mistake — a missing connection string — would be the one failure
    // that leaves no file behind on shared hosting.
    await StartupErrorLog.WriteAsync(
        builder.Environment.ContentRootPath,
        builder.Environment.EnvironmentName,
        configurationError);

    throw configurationError;
}

// The production host is MariaDB 10.10. Pin the version so providers do not
// auto-detect the (possibly newer) local server and emit SQL for the wrong target.
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseMySql(connectionString, new MariaDbServerVersion(new Version(10, 10, 0))));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<SeoRouteResolver>();
// Crawl files are generated from the database and cached briefly per public origin.
builder.Services.AddMemoryCache();
builder.Services.AddScoped<SeoFileGenerator>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton<ImagePipeline>();
builder.Services.AddSingleton<SeoShellRenderer>();

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

builder.Services.AddOpenApi();

builder.Services.AddCors(o => o.AddPolicy("spa", p => p
    .WithOrigins(
        builder.Configuration["Cors:Origins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries)
        ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173" })
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var jwtKey = builder.Configuration["Jwt:Key"] ?? "albaik-development-signing-key-change-me-in-production-32chars";
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes long.");
if (jwtKey == "albaik-development-signing-key-change-me-in-production-32chars" &&
    builder.Environment.IsProduction())
    throw new InvalidOperationException(
        "Refusing to run in Production with the default development Jwt:Key. Set the Jwt__Key "
        + "environment variable on the host before starting the application.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "albaik",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "albaik-admin",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)) { KeyId = "albaik-signing-key-v1" },
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// ------------------------------------------------------------------ pipeline

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Security headers on every response, and a path-aware cache policy for assets, HTML
// and the crawl files (ticket 11). Registered early: OnStarting callbacks survive any
// response the rest of the pipeline produces.
app.UseMiddleware<ResponseHeadersMiddleware>();

app.UseCors("spa");

// The dashboard must never enter the index, including the SPA fallback HTML that serves
// its client-side routes (ticket 08).
app.UseMiddleware<DashboardNoIndexMiddleware>();

// One canonical address per page, answered before the SPA fallback (ticket 10).
// This must run before the SEO shell so canonical-host/path redirects happen
// before any shell rendering.
app.UseCanonicalRedirects();

// Public page shells are generated per request from the database (ticket 05: home only).
// Running before default files is what turns `/` into the shell instead of the bare
// SPA index; anything the resolver does not handle continues to the static-file pipeline.
app.UseMiddleware<SeoShellMiddleware>();

// Serve uploaded images (and the built SPA, when present) straight from wwwroot.
Directory.CreateDirectory(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"));
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/api/health", async (AppDbContext db, CancellationToken ct) =>
{
    var connectable = await db.Database.CanConnectAsync(ct);
    var payload = new
    {
        status = connectable ? "ok" : "unavailable",
        service = "Albaik API",
        database = connectable ? "connected" : "unreachable",
        time = DateTime.UtcNow
    };

    return connectable
        ? Results.Ok(payload)
        : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
});

// The SPA's own client-side routing handles every non-api, non-upload path once
// index.html is loaded; make sure IIS/Kestrel hands deep links (/collections/hair-care)
// to that index.html instead of 404ing, while /api and /uploads keep honest 404s.
app.MapFallback(async context =>
{
    var path = context.Request.Path.Value ?? string.Empty;
    if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    var indexPath = Path.Combine(app.Environment.WebRootPath ?? app.Environment.ContentRootPath, "index.html");
    if (!File.Exists(indexPath))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    // The fallback HTML is read per request so its ETag reflects the current build.
    // `no-cache` (set by the header middleware) means a browser always revalidates,
    // and an unchanged file is answered with 304 instead of a second copy.
    var html = await File.ReadAllTextAsync(indexPath, context.RequestAborted);
    var etag = HtmlEtag.Compute(html);
    context.Response.ContentType = "text/html";
    context.Response.Headers.ETag = etag;
    if (HtmlEtag.IsNotModified(context.Request, etag))
    {
        context.Response.StatusCode = StatusCodes.Status304NotModified;
        return;
    }

    await context.Response.WriteAsync(html, context.RequestAborted);
});

// ------------------------------------------------------------------ database + seed

/*
 * Shared IIS hosting reports a startup exception as a bare HTTP 500.30 and nothing
 * else: stdout logging is off by default and the event log is not reachable from the
 * panel. So the failure is also written next to the app, where the file manager can
 * fetch it. The exception is rethrown afterwards, so the host's own reporting is
 * unchanged.
 */
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    logger.LogInformation("Albaik starting: Environment={Environment}, ContentRoot={ContentRoot}",
        app.Environment.EnvironmentName, app.Environment.ContentRootPath);

    await db.Database.MigrateAsync();

    var dbConnection = db.Database.GetDbConnection();
    await db.Database.OpenConnectionAsync();
    try
    {
        // Log the version without any connection detail. Then fail fast on an unsupported
        // server: Pomelo is pinned to 10.10, and older MariaDB releases have neither the
        // JSON handling nor the datetime(6) behaviour the importer depends on.
        logger.LogInformation("Database ready: {Database} on MariaDB {ServerVersion}",
            dbConnection.Database, dbConnection.ServerVersion);
        MariaDbVersion.EnsureSupported(dbConnection.ServerVersion);
    }
    finally
    {
        await db.Database.CloseConnectionAsync();
    }

    var adminUser = builder.Configuration["Seed:AdminUsername"] ?? "admin";
    var adminPassword = builder.Configuration["Seed:AdminPassword"] ?? "Albaik@2026";
    await DbSeeder.SeedAsync(db, logger, adminUser, adminPassword);
    logger.LogInformation("Startup complete: admin user '{AdminUser}'", adminUser);
}
catch (Exception startupError)
{
    await StartupErrorLog.WriteAsync(
        app.Environment.ContentRootPath,
        app.Environment.EnvironmentName,
        startupError);

    throw;
}

app.Run();

// Exposed so WebApplicationFactory (api/tests) can boot the real host for integration
// tests instead of a stand-in. Only the type anchor lives here; there is no second
// Main to keep in step.
public partial class Program { }
