namespace Albaik.Api.Dtos;

// ---------------------------------------------------------------- read models

public record BrandDto(
    int Id, string Slug, string Name, string? Tagline, string? Description,
    string? LogoUrl, string? ImageUrl, string? Accent,
    int CategoryId, string? CategorySlug, string? CategoryName,
    int SortOrder, bool IsActive, bool IsFeatured, int ProductCount,
    List<ProductCardDto>? Products = null);

public record CategoryDto(
    int Id, string Slug, string Name, string? NameDari, string? NamePashto,
    string? Tagline, string? Description, string? ImageUrl, string? Icon, string? Accent,
    int SortOrder, bool IsActive, bool ShowInNav,
    int BrandCount, int ProductCount,
    List<BrandDto>? Brands = null);

public record ProductCardDto(
    int Id, string Slug, string Name, string? Subtitle, string? FormulationLabel,
    string? ShortDescription, string? Size, decimal? Price, decimal? CompareAtPrice,
    string Currency, double? Rating, int ReviewCount, string? Badge, string? BadgeStyle,
    string? StockStatus, string? ImageUrl, string? AccentFrom, string? AccentTo,
    List<string> Benefits, List<string> Ingredients, bool IsFeatured,
    int BrandId, string? BrandSlug, string? BrandName,
    int CategoryId, string? CategorySlug, string? CategoryName);

public record ProductDetailDto(
    int Id, string Slug, string Name, string? Subtitle, string? FormulationLabel,
    string? ShortDescription, string? Description, string? Size,
    decimal? Price, decimal? CompareAtPrice, string Currency, string? PriceNote,
    double? Rating, int ReviewCount, string? Badge, string? BadgeStyle, string? StockStatus,
    string? ImageUrl, string? AccentFrom, string? AccentTo,
    List<string> Benefits, List<string> Ingredients,
    string? HowToUse, string? SafetyNote, string? SuitableFor,
    bool IsFeatured, bool IsActive, int SortOrder,
    int BrandId, string? BrandSlug, string? BrandName, string? BrandTagline,
    int CategoryId, string? CategorySlug, string? CategoryName,
    List<ProductImageDto> Images,
    List<ProductCardDto> Related);

public record ProductImageDto(int Id, string Url, string? Alt, int SortOrder);

public record SiteSettingDto(string Key, string? Value, string Group, string? Label, string InputType, int SortOrder);

/// <summary>One suggestion chip in the search overlay. The `search.suggestions` site setting stores these as a JSON array; the API both seeds and validates that shape.</summary>
public record SearchChipDto(string Label, string Query);

public record NavLinkDto(int Id, string Label, string Path, string? Group, bool OpenInNewTab, int SortOrder, bool IsActive);
public record FooterLinkDto(int Id, string Group, string Label, string Path, bool OpenInNewTab, int SortOrder, bool IsActive);
public record QuickLinkDto(int Id, string Label, string Path, bool OpenInNewTab, int SortOrder, bool IsActive);
public record HomeSectionDto(int Id, string Key, string SectionType, string? Eyebrow, string? Title, string? Subtitle,
    string? Body, string? ImageUrl, string? PrimaryCtaLabel, string? PrimaryCtaHref, string? SecondaryCtaLabel,
    string? SecondaryCtaHref, string? DataJson, string? SlidesJson, int SortOrder, bool IsVisible);
public record HeroStatDto(int Id, string Value, string Label, string? Accent, int SortOrder, bool IsActive);
public record TestimonialDto(int Id, string Name, string? Role, string? Initials, string? Title, string? Quote,
    int Rating, string? AvatarUrl, int SortOrder, bool IsActive);
public record TrustPillarDto(int Id, string Icon, string Title, string? Subtitle, string? Accent, int SortOrder, bool IsActive);
public record HairProfileDto(int Id, string Key, string Icon, string Title, string? Badge, string? BadgeStyle,
    string? Description, string? MetricValue, string? MetricLabel, int SortOrder, bool IsActive);
public record PageDto(int Id, string Slug, string Title, string? Subtitle, string? Eyebrow, string? ContentHtml,
    string? MetaDescription, int SortOrder, bool IsPublished, DateTime UpdatedAt);
public record ContactMessageDto(int Id, string Name, string Email, string? Phone, string? Company, string? Subject,
    string Message, string Kind, bool IsRead, bool EmailDelivered, string? DeliveryError, DateTime CreatedAt);
public record AdminUserDto(int Id, string Username, string? Email, string? DisplayName, string Role, bool IsActive, DateTime? LastLoginAt);

/// <summary>Everything the marketing shell needs in a single round trip.</summary>
/// <param name="HasQuickLinks">Whether the QuickLinks table holds any rows at all. The
/// public list only carries active links, so without this flag the client cannot tell
/// "none configured" apart from "every link hidden" — hiding the last link would silently
/// resurrect the header's bundled defaults.</param>
public record SiteBootstrapDto(
    List<SiteSettingDto> Settings,
    List<NavLinkDto> Nav,
    List<FooterLinkDto> Footer,
    List<QuickLinkDto> QuickLinks,
    bool HasQuickLinks,
    List<CategoryDto> Categories,
    List<BrandDto> Brands);

public record HomePayloadDto(
    List<HomeSectionDto> Sections,
    List<HeroStatDto> HeroStats,
    List<ProductCardDto> FeaturedProducts,
    List<TestimonialDto> Testimonials,
    List<TrustPillarDto> TrustPillars,
    List<HairProfileDto> HairProfiles,
    List<CategoryDto> Categories);

// ---------------------------------------------------------------- write models

public class CategoryInput
{
    public string Name { get; set; } = "";
    public string? Slug { get; set; }
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
}

public class BrandInput
{
    public string Name { get; set; } = "";
    public string? Slug { get; set; }
    public int CategoryId { get; set; }
    public string? Tagline { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? ImageUrl { get; set; }
    public string? Accent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
}

public class ProductInput
{
    public string Name { get; set; } = "";
    public string? Slug { get; set; }
    public int CategoryId { get; set; }
    public int BrandId { get; set; }
    public string? Subtitle { get; set; }
    public string? FormulationLabel { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? Size { get; set; }
    public decimal? Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string Currency { get; set; } = "AFN";
    public string? PriceNote { get; set; }
    public double? Rating { get; set; }
    public int ReviewCount { get; set; }
    public string? Badge { get; set; }
    public string? BadgeStyle { get; set; }
    public string? StockStatus { get; set; }
    public string? ImageUrl { get; set; }
    public string? AccentFrom { get; set; }
    public string? AccentTo { get; set; }
    public List<string> Benefits { get; set; } = new();
    public List<string> Ingredients { get; set; } = new();
    public string? HowToUse { get; set; }
    public string? SafetyNote { get; set; }
    public string? SuitableFor { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public List<ProductImageInput> Images { get; set; } = new();
}

public class ProductImageInput
{
    public string Url { get; set; } = "";
    public string? Alt { get; set; }
    public int SortOrder { get; set; }
}

public class TestimonialInput
{
    public string Name { get; set; } = "";
    public string? Role { get; set; }
    public string? Initials { get; set; }
    public string? Title { get; set; }
    public string? Quote { get; set; }
    public int Rating { get; set; } = 5;
    public string? AvatarUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class TrustPillarInput
{
    public string Icon { get; set; } = "verified_user";
    public string Title { get; set; } = "";
    public string? Subtitle { get; set; }
    public string? Accent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class HairProfileInput
{
    public string Key { get; set; } = "";
    public string Icon { get; set; } = "water";
    public string Title { get; set; } = "";
    public string? Badge { get; set; }
    public string? BadgeStyle { get; set; }
    public string? Description { get; set; }
    public string? MetricValue { get; set; }
    public string? MetricLabel { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class HeroStatInput
{
    public string Value { get; set; } = "";
    public string Label { get; set; } = "";
    public string? Accent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class NavLinkInput
{
    public string Label { get; set; } = "";
    public string Path { get; set; } = "/";
    public string? Group { get; set; }
    public bool OpenInNewTab { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class FooterLinkInput
{
    public string Group { get; set; } = "Collections";
    public string Label { get; set; } = "";
    public string Path { get; set; } = "/";
    public bool OpenInNewTab { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class QuickLinkInput
{
    public string Label { get; set; } = "";
    public string Path { get; set; } = "/";
    public bool OpenInNewTab { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class HomeSectionInput
{
    public string Key { get; set; } = "";
    public string SectionType { get; set; } = "generic";
    public string? Eyebrow { get; set; }
    public string? Title { get; set; }
    public string? Subtitle { get; set; }
    public string? Body { get; set; }
    public string? ImageUrl { get; set; }
    public string? PrimaryCtaLabel { get; set; }
    public string? PrimaryCtaHref { get; set; }
    public string? SecondaryCtaLabel { get; set; }
    public string? SecondaryCtaHref { get; set; }
    public string? DataJson { get; set; }
    public string? SlidesJson { get; set; }
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}

public class PageInput
{
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Subtitle { get; set; }
    public string? Eyebrow { get; set; }
    public string? ContentHtml { get; set; }
    public string? MetaDescription { get; set; }
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}

public class SettingsInput
{
    public List<SiteSettingDto> Settings { get; set; } = new();
}

/// <summary>
/// Which icons the dashboard's icon selectors may offer.
///
/// Only the *disabled* names travel over the wire. The registry of available icons
/// ships with the front end, so storing the short list keeps the setting small, and an
/// icon added to the registry in a later build shows up automatically instead of
/// staying hidden until somebody re-enables it by hand.
/// </summary>
public record IconStateDto(List<string> Disabled);

public class IconStateInput
{
    public List<string>? Disabled { get; set; }
}

public class ContactInput
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string? Subject { get; set; }
    public string Message { get; set; } = "";
    public string Kind { get; set; } = "contact";
    /// <summary>
    /// Slug of the product the enquiry started from, when the visitor used "Enquire about
    /// this product". The server resolves the name from the catalogue rather than trusting
    /// a client-supplied string, so the email can never claim a product that does not exist.
    /// </summary>
    public string? ProductSlug { get; set; }
    /// <summary>Honeypot field. Real users never fill this in.</summary>
    public string? Website { get; set; }
}

public class LoginInput
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

/// <summary>
/// One move in the dashboard's shared reorder control: the collection's admin key
/// ("home-sections", "trust-pillars", "categories", ...) plus the id list in the exact
/// order the operator wants. The endpoint reassigns SortOrder for every listed row.
/// </summary>
public class ReorderInput
{
    public string Resource { get; set; } = "";
    public List<int> Ids { get; set; } = new();
}

public class LoginResultDto
{
    public string Token { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public AdminUserDto User { get; set; } = null!;
}

public class ChangePasswordInput
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword { get; set; } = "";
}
