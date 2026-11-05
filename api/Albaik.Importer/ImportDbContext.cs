using Albaik.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Albaik.Importer;

/// <summary>
/// The API's model, used to write MariaDB. Every key is marked as never generated so
/// EF includes the preserved SQLite Id in the INSERT instead of treating it as an
/// AUTO_INCREMENT value to omit. This is the one model difference between the running
/// API and the importer; it exists only inside the importer process.
/// </summary>
public sealed class ImportDbContext : AppDbContext
{
    public ImportDbContext(DbContextOptions<ImportDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var key in entityType.GetKeys())
            {
                foreach (var property in key.Properties)
                {
                    property.ValueGenerated = ValueGenerated.Never;
                    property.SetAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.None);
                }
            }
        }
    }
}
