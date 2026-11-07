using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    /// <summary>
    /// Lets a derived context (the one-off importer) reuse this exact model while
    /// supplying options for its own context type.
    /// </summary>
    protected AppDbContext(DbContextOptions options) : base(options) { }

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
    public DbSet<ContactMessageReply> ContactMessageReplies => Set<ContactMessageReply>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    private const int SlugMaxLength = 200;
    private const int KeyMaxLength = 100;
    private const int UsernameMaxLength = 64;
    private const int IbnMaxLength = 32;
    private const int VerificationCodeMaxLength = 32;

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.HasAnnotation("MySql:CharSet", "utf8mb4");
        b.UseCollation("utf8mb4_unicode_ci");

        b.Entity<Category>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(SlugMaxLength);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.NameDari).HasMaxLength(200);
            e.Property(x => x.NamePashto).HasMaxLength(200);
            e.Property(x => x.Tagline).HasMaxLength(300);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.Icon).HasMaxLength(100);
            e.Property(x => x.Accent).HasMaxLength(50);
            e.HasMany(x => x.Brands).WithOne(x => x.Category!).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Products).WithOne(x => x.Category!).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Brand>(e =>
        {
            // A brand name can appear under more than one category (Albaik spans four),
            // so slug uniqueness is scoped to its parent category.
            e.HasIndex(x => new { x.CategoryId, x.Slug }).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(SlugMaxLength);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Tagline).HasMaxLength(300);
            e.Property(x => x.LogoUrl).HasMaxLength(500);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.Accent).HasMaxLength(50);
            e.HasMany(x => x.Products).WithOne(x => x.Brand!).HasForeignKey(x => x.BrandId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Product>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            // Both are catalogue-wide identifiers. MySQL allows multiple NULLs in a
            // unique index, so a product without an IBN is fine while the numbers are
            // still being collected, and so is an unminted Verification code.
            e.HasIndex(x => x.Ibn).IsUnique();
            e.HasIndex(x => x.VerificationCode).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(SlugMaxLength);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Subtitle).HasMaxLength(300);
            e.Property(x => x.FormulationLabel).HasMaxLength(200);
            e.Property(x => x.ShortDescription).HasMaxLength(1000);
            e.Property(x => x.MetaDescription).HasMaxLength(Product.MetaDescriptionMaxLength);
            e.Property(x => x.Size).HasMaxLength(100);
            e.Property(x => x.Currency).HasMaxLength(10);
            e.Property(x => x.PriceNote).HasMaxLength(300);
            e.Property(x => x.Badge).HasMaxLength(100);
            e.Property(x => x.BadgeStyle).HasMaxLength(100);
            e.Property(x => x.StockStatus).HasMaxLength(50);
            e.Property(x => x.Ibn).HasMaxLength(IbnMaxLength);
            e.Property(x => x.VerificationCode).HasMaxLength(VerificationCodeMaxLength);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.AccentFrom).HasMaxLength(50);
            e.Property(x => x.AccentTo).HasMaxLength(50);
            e.Property(x => x.SuitableFor).HasMaxLength(300);
            e.HasMany(x => x.Images).WithOne(x => x.Product!).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ProductImage>(e =>
        {
            e.Property(x => x.Url).HasMaxLength(500);
            e.Property(x => x.Alt).HasMaxLength(300);
        });

        b.Entity<SiteSetting>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Key).HasMaxLength(KeyMaxLength);
            e.Property(x => x.Group).HasMaxLength(100);
            e.Property(x => x.Label).HasMaxLength(200);
            e.Property(x => x.InputType).HasMaxLength(50);
        });

        b.Entity<NavLink>(e =>
        {
            e.Property(x => x.Label).HasMaxLength(200);
            e.Property(x => x.Path).HasMaxLength(500);
            e.Property(x => x.Group).HasMaxLength(100);
        });

        b.Entity<FooterLink>(e =>
        {
            e.Property(x => x.Group).HasMaxLength(100);
            e.Property(x => x.Label).HasMaxLength(200);
            e.Property(x => x.Path).HasMaxLength(500);
        });

        b.Entity<QuickLink>(e =>
        {
            e.Property(x => x.Label).HasMaxLength(200);
            e.Property(x => x.Path).HasMaxLength(500);
        });

        b.Entity<HomeSection>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Key).HasMaxLength(KeyMaxLength);
            e.Property(x => x.SectionType).HasMaxLength(100);
            e.Property(x => x.Eyebrow).HasMaxLength(200);
            e.Property(x => x.Title).HasMaxLength(300);
            e.Property(x => x.Subtitle).HasMaxLength(500);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.PrimaryCtaLabel).HasMaxLength(200);
            e.Property(x => x.PrimaryCtaHref).HasMaxLength(500);
            e.Property(x => x.SecondaryCtaLabel).HasMaxLength(200);
            e.Property(x => x.SecondaryCtaHref).HasMaxLength(500);
        });

        b.Entity<HeroStat>(e =>
        {
            e.Property(x => x.Value).HasMaxLength(100);
            e.Property(x => x.Label).HasMaxLength(200);
            e.Property(x => x.Accent).HasMaxLength(50);
        });

        b.Entity<Testimonial>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Role).HasMaxLength(200);
            e.Property(x => x.Initials).HasMaxLength(10);
            e.Property(x => x.Title).HasMaxLength(300);
            e.Property(x => x.AvatarUrl).HasMaxLength(500);
        });

        b.Entity<TrustPillar>(e =>
        {
            e.Property(x => x.Icon).HasMaxLength(100);
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Subtitle).HasMaxLength(500);
            e.Property(x => x.Accent).HasMaxLength(50);
        });

        b.Entity<HairProfile>(e =>
        {
            e.Property(x => x.Key).HasMaxLength(KeyMaxLength);
            e.Property(x => x.Icon).HasMaxLength(100);
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Badge).HasMaxLength(100);
            e.Property(x => x.BadgeStyle).HasMaxLength(100);
            e.Property(x => x.MetricValue).HasMaxLength(100);
            e.Property(x => x.MetricLabel).HasMaxLength(200);
        });

        b.Entity<Page>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(SlugMaxLength);
            e.Property(x => x.Title).HasMaxLength(300);
            e.Property(x => x.Subtitle).HasMaxLength(500);
            e.Property(x => x.Eyebrow).HasMaxLength(200);
            e.Property(x => x.MetaDescription).HasMaxLength(1000);
        });

        b.Entity<ContactMessage>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Email).HasMaxLength(320);
            e.Property(x => x.Phone).HasMaxLength(50);
            e.Property(x => x.Company).HasMaxLength(200);
            e.Property(x => x.Subject).HasMaxLength(300);
            e.Property(x => x.Kind).HasMaxLength(50);
            e.Property(x => x.ProductSlug).HasMaxLength(SlugMaxLength);
            e.Property(x => x.ProductName).HasMaxLength(200);
            e.Property(x => x.IpAddress).HasMaxLength(64);
        });

        b.Entity<ContactMessageReply>(e =>
        {
            e.HasIndex(x => x.ContactMessageId);
            e.Property(x => x.Subject).HasMaxLength(200);
            e.Property(x => x.FromAddress).HasMaxLength(320);
            e.Property(x => x.ToAddress).HasMaxLength(320);
            e.Property(x => x.Source).HasMaxLength(50);
            e.Property(x => x.MessageId).HasMaxLength(500);
            e.HasIndex(x => x.MessageId);
            e.HasOne(x => x.ContactMessage)
                .WithMany(message => message.Replies)
                .HasForeignKey(x => x.ContactMessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AdminUser>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Username).HasMaxLength(UsernameMaxLength);
            e.Property(x => x.Email).HasMaxLength(320);
            e.Property(x => x.DisplayName).HasMaxLength(200);
            e.Property(x => x.PasswordHash).HasMaxLength(100);
            e.Property(x => x.Role).HasMaxLength(50);
        });

        foreach (var entity in b.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                var clr = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
                if (clr == typeof(bool))
                {
                    property.SetColumnType("tinyint(1)");
                }
                else if (clr == typeof(DateTime))
                {
                    property.SetPrecision(6);
                }
                else if (clr == typeof(decimal))
                {
                    property.SetPrecision(18);
                    property.SetScale(2);
                }
            }
        }
    }
}
