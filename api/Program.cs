using System.Text;
using System.Text.Json.Serialization;
using Albaik.Api.Data;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ------------------------------------------------------------------ services

var connectionString = builder.Configuration.GetConnectionString("Default")
                       ?? "Data Source=albaik.db";

// SQLite resolves a relative Data Source against the process' current
// directory, which under IIS is not the app folder. Pin the database file to
// the content root so it is always created and opened next to the app.
if (builder.Configuration["ConnectionStrings:Default"] is { } raw &&
    raw.Contains("Data Source=", StringComparison.OrdinalIgnoreCase))
{
    var csb = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(raw);
    if (!string.IsNullOrWhiteSpace(csb.DataSource) &&
        !Path.IsPathRooted(csb.DataSource) &&
        !csb.DataSource.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
    {
        csb.DataSource = Path.Combine(builder.Environment.ContentRootPath, csb.DataSource);
        connectionString = csb.ConnectionString;
    }
}

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(connectionString));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton<ImagePipeline>();

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

app.UseCors("spa");

// Serve uploaded images (and the built SPA, when present) straight from wwwroot.
Directory.CreateDirectory(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"));
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    service = "Albaik API",
    time = DateTime.UtcNow
}));

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
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(indexPath);
});

// ------------------------------------------------------------------ database + seed

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    logger.LogInformation("Albaik starting: Environment={Environment}, ContentRoot={ContentRoot}",
        app.Environment.EnvironmentName, app.Environment.ContentRootPath);

    await db.Database.EnsureCreatedAsync();
    logger.LogInformation("Database ready: {DataSource}", db.Database.GetConnectionString()?.Replace("Password=", "Password=***", StringComparison.OrdinalIgnoreCase));

    // No migrations in this project, so the file can lag the model. Repair the
    // gap before the seeder or any request touches a missing column.
    await SchemaGuard.SyncAsync(db, logger);

    var adminUser = builder.Configuration["Seed:AdminUsername"] ?? "admin";
    var adminPassword = builder.Configuration["Seed:AdminPassword"] ?? "Albaik@2026";
    await DbSeeder.SeedAsync(db, logger, adminUser, adminPassword);
    logger.LogInformation("Startup complete: admin user '{AdminUser}'", adminUser);
}

app.Run();

// Exposed so WebApplicationFactory (api/tests) can boot the real host for integration
// tests instead of a stand-in. Only the type anchor lives here; there is no second
// Main to keep in step.
public partial class Program { }
