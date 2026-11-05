using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<NavLink> NavLinks => Set<NavLink>();
    public DbSet<FooterLink> FooterLinks => Set<FooterLink>();
    public DbSet<QuickLink> QuickLinks => Set<QuickLink>();
    public DbSet<HomeSection> HomeSections => Set<HomeSection>();
    public DbSet<HeroStat> HeroStats => Set<HeroStat>();
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();
    public DbSet<TrustPillar> TrustPillars => Set<TrustPillar>();
    public DbSet<HairProfile> HairProfiles => Set<HairProfile>();
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<Category>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasMany(x => x.Brands).WithOne(x => x.Category!).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Products).WithOne(x => x.Category!).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Brand>(e =>
        {
            // A brand name can appear under more than one category (Albaik spans four),
            // so slug uniqueness is scoped to its parent category.
            e.HasIndex(x => new { x.CategoryId, x.Slug }).IsUnique();
            e.HasMany(x => x.Products).WithOne(x => x.Brand!).HasForeignKey(x => x.BrandId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Product>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            // Both are catalogue-wide identifiers. SQLite treats NULLs as distinct, so a
            // product without an IBN is fine while the numbers are still being collected.
            e.HasIndex(x => x.Ibn).IsUnique();
            e.HasIndex(x => x.VerificationCode).IsUnique();
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
            e.Property(x => x.CompareAtPrice).HasColumnType("decimal(18,2)");
            e.HasMany(x => x.Images).WithOne(x => x.Product!).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<SiteSetting>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
        });

        b.Entity<Page>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
        });

        b.Entity<HomeSection>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
        });

        b.Entity<AdminUser>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
        });

        b.Entity<ContactMessage>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
        });
    }
}
