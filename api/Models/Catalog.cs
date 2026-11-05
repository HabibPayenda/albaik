namespace Albaik.Api.Models;

/// <summary>
/// Top level of the catalogue hierarchy: Category -> Brand -> Product.
/// </summary>
public class Category : IOrderedEntity
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string? NameDari { get; set; }
    public string? NamePashto { get; set; }
    public string? Tagline { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Icon { get; set; }
    public string? Accent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool ShowInNav { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<Brand> Brands { get; set; } = new();
    public List<Product> Products { get; set; } = new();
}

/// <summary>
/// Second level: a brand (Albaik, Avora Shine, ...) living inside a category.
/// </summary>
public class Brand
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Tagline { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? ImageUrl { get; set; }
    public string? Accent { get; set; }
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<Product> Products { get; set; } = new();
}

/// <summary>
/// Third level: the sellable product itself.
/// </summary>
public class Product
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Subtitle { get; set; }
    public string? FormulationLabel { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }

    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    public int BrandId { get; set; }
    public Brand? Brand { get; set; }

    public string? Size { get; set; }
    public decimal? Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string Currency { get; set; } = "AFN";
    public string? PriceNote { get; set; }

    public double? Rating { get; set; }
    public int ReviewCount { get; set; }
    public string? Badge { get; set; }
    public string? BadgeStyle { get; set; }
    public string? StockStatus { get; set; } = "InStock";

    /// <summary>
    /// The product's number in the International Barcode Network. Digits only, unique
    /// across the catalogue, and optional while the numbers are still being collected.
    /// It identifies the product and proves nothing on its own — the QR code carries a
    /// separate verification code. See docs/adr/0008-verification-code-is-stored-not-derived.md.
    /// </summary>
    public string? Ibn { get; set; }

    /// <summary>
    /// The opaque token inside this product's QR code. Generated once, stored, and
    /// replaced only through the password-confirmed regenerate action. Never derived
    /// from the product, so rotating a server secret cannot invalidate printed labels.
    ///
    /// Nullable on purpose: a database that predates this feature has no value for its
    /// existing rows. The code is minted on first use. MariaDB treats NULLs as distinct
    /// in a unique index, so the unique index tolerates the gap while rows are still
    /// unminted.
    /// </summary>
    public string? VerificationCode { get; set; }

    public string? ImageUrl { get; set; }
    public string? AccentFrom { get; set; }
    public string? AccentTo { get; set; }

    /// <summary>Marketing bullet points shown on cards and the detail page.</summary>
    public List<string> Benefits { get; set; } = new();
    /// <summary>Key ingredient / technology chips.</summary>
    public List<string> Ingredients { get; set; } = new();
    /// <summary>Free-form "how to use" copy from the approved label.</summary>
    public string? HowToUse { get; set; }
    public string? SafetyNote { get; set; }
    public string? SuitableFor { get; set; }

    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<ProductImage> Images { get; set; } = new();
}

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public string Url { get; set; } = "";
    public string? Alt { get; set; }
    public int SortOrder { get; set; }
}
