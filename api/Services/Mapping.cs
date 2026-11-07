using System.Text;
using System.Text.RegularExpressions;
using Albaik.Api.Dtos;
using Albaik.Api.Models;

namespace Albaik.Api.Services;

public static class Slug
{
    // The column is varchar(200); leave room for the "-2".."-499" uniqueness suffix so
    // a long name can never push the final slug past the column width.
    private const int MaxLength = 200;
    private const int UniquenessReserve = 5;

    public static string From(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return Guid.NewGuid().ToString("N")[..8];
        var s = value.Trim().ToLowerInvariant();
        s = Regex.Replace(s, @"[^a-z0-9\u0600-\u06FF]+", "-");
        s = s.Trim('-');
        if (string.IsNullOrEmpty(s)) return Guid.NewGuid().ToString("N")[..8];

        if (s.Length > MaxLength - UniquenessReserve)
            s = s[..(MaxLength - UniquenessReserve)].TrimEnd('-');

        return string.IsNullOrEmpty(s) ? Guid.NewGuid().ToString("N")[..8] : s;
    }
}

public static class Mapping
{
    public static ProductCardDto ToCard(this Product p) => new(
        p.Id, p.Slug, p.Name, p.Subtitle, p.FormulationLabel, p.ShortDescription,
        p.Size, p.Price, p.CompareAtPrice, p.Currency, p.Rating, p.ReviewCount,
        p.Badge, p.BadgeStyle, p.StockStatus, p.ImageUrl, p.AccentFrom, p.AccentTo,
        p.Benefits, p.Ingredients, p.IsFeatured,
        p.BrandId, p.Brand?.Slug, p.Brand?.Name,
        p.CategoryId, p.Category?.Slug, p.Category?.Name,
        p.Ibn);

    public static ProductDetailDto ToDetail(this Product p, List<ProductCardDto> related) => new(
        p.Id, p.Slug, p.Name, p.Subtitle, p.FormulationLabel, p.ShortDescription, p.Description,
        p.MetaDescription,
        p.Size, p.Price, p.CompareAtPrice, p.Currency, p.PriceNote,
        p.Rating, p.ReviewCount, p.Badge, p.BadgeStyle, p.StockStatus,
        p.ImageUrl, p.AccentFrom, p.AccentTo, p.Benefits, p.Ingredients,
        p.HowToUse, p.SafetyNote, p.SuitableFor,
        p.IsFeatured, p.IsActive, p.SortOrder,
        p.BrandId, p.Brand?.Slug, p.Brand?.Name, p.Brand?.Tagline,
        p.CategoryId, p.Category?.Slug, p.Category?.Name,
        p.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto(i.Id, i.Url, i.Alt, i.SortOrder)).ToList(),
        related,
        p.Ibn);

    public static BrandDto ToDto(this Brand b, List<ProductCardDto>? products = null) => new(
        b.Id, b.Slug, b.Name, b.Tagline, b.Description, b.LogoUrl, b.ImageUrl, b.Accent,
        b.CategoryId, b.Category?.Slug, b.Category?.Name,
        b.SortOrder, b.IsActive, b.IsFeatured,
        b.Products?.Count ?? 0, products);

    public static CategoryDto ToDto(this Category c, List<BrandDto>? brands = null) => new(
        c.Id, c.Slug, c.Name, c.NameDari, c.NamePashto, c.Tagline, c.Description,
        c.ImageUrl, c.Icon, c.Accent, c.SortOrder, c.IsActive, c.ShowInNav,
        c.Brands?.Count ?? 0, c.Products?.Count ?? 0, brands);

    public static SiteSettingDto ToDto(this SiteSetting s) => new(s.Key, s.Value, s.Group, s.Label, s.InputType, s.SortOrder);
    public static NavLinkDto ToDto(this NavLink n) => new(n.Id, n.Label, n.Path, n.Group, n.OpenInNewTab, n.SortOrder, n.IsActive);
    public static FooterLinkDto ToDto(this FooterLink f) => new(f.Id, f.Group, f.Label, f.Path, f.OpenInNewTab, f.SortOrder, f.IsActive);
    public static QuickLinkDto ToDto(this QuickLink q) => new(q.Id, q.Label, q.Path, q.OpenInNewTab, q.SortOrder, q.IsActive);
    public static HomeSectionDto ToDto(this HomeSection h) => new(h.Id, h.Key, h.SectionType, h.Eyebrow, h.Title, h.Subtitle,
        h.Body, h.ImageUrl, h.PrimaryCtaLabel, h.PrimaryCtaHref, h.SecondaryCtaLabel, h.SecondaryCtaHref, h.DataJson, h.SlidesJson, h.SortOrder, h.IsVisible);
    public static HeroStatDto ToDto(this HeroStat h) => new(h.Id, h.Value, h.Label, h.Accent, h.SortOrder, h.IsActive);
    public static TestimonialDto ToDto(this Testimonial t) => new(t.Id, t.Name, t.Role, t.Initials, t.Title, t.Quote, t.Rating, t.AvatarUrl, t.SortOrder, t.IsActive);
    public static TrustPillarDto ToDto(this TrustPillar t) => new(t.Id, t.Icon, t.Title, t.Subtitle, t.Accent, t.SortOrder, t.IsActive);
    public static HairProfileDto ToDto(this HairProfile h) => new(h.Id, h.Key, h.Icon, h.Title, h.Badge, h.BadgeStyle, h.Description, h.MetricValue, h.MetricLabel, h.SortOrder, h.IsActive);
    public static PageDto ToDto(this Page p) => new(p.Id, p.Slug, p.Title, p.Subtitle, p.Eyebrow, p.ContentHtml, p.MetaDescription, p.SortOrder, p.IsPublished, p.UpdatedAt);
    public static ContactMessageDto ToDto(this ContactMessage m) => new(m.Id, m.Name, m.Email, m.Phone, m.Company, m.Subject, m.Message, m.Kind, m.IsRead, m.EmailDelivered, m.DeliveryError, m.CreatedAt);
    public static AdminUserDto ToDto(this AdminUser u) => new(u.Id, u.Username, u.Email, u.DisplayName, u.Role, u.IsActive, u.LastLoginAt);
}

/// <summary>Small helpers for the plain-text → HTML conversion used by the page editor.</summary>
public static class TextHtml
{
    public static string Paragraphs(IEnumerable<string> lines)
    {
        var sb = new StringBuilder();
        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
            sb.Append("<p>").Append(System.Net.WebUtility.HtmlEncode(line.Trim())).Append("</p>");
        return sb.ToString();
    }
}
