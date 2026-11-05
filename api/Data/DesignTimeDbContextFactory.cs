using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Albaik.Api.Data;

/// <summary>
/// Supplies the EF tooling with a context without booting the web host. The
/// startup pipeline applies migrations and seeds content, which is not wanted
/// while scaffolding a migration.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? "Server=127.0.0.1;Port=3306;User=root;Password=;Database=albaik;CharSet=utf8mb4";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(connectionString, new MariaDbServerVersion(new Version(10, 10, 0)))
            .Options;

        return new AppDbContext(options);
    }
}
