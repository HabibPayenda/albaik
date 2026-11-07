namespace Albaik.Api.Models;

/// <summary>
/// Anything the dashboard reorders: a row already carries its position, so the reorder
/// endpoint needs nothing more than Id and the current SortOrder to re-sequence a whole list.
/// </summary>
public interface IOrderedEntity
{
    int Id { get; }
    int SortOrder { get; set; }
}

/// <summary>Key/value store for global site configuration editable from the admin dashboard.</summary>
public class SiteSetting
{
    public int Id { get; set; }
    public string Key { get; set; } = "";
    public string? Value { get; set; }
    public string Group { get; set; } = "general";
    public string? Label { get; set; }
    public string InputType { get; set; } = "text";
    public int SortOrder { get; set; }
}

/// <summary>A single link in the primary header navigation.</summary>
public class NavLink : IOrderedEntity
{
    public int Id { get; set; }
    public string Label { get; set; } = "";
    public string Path { get; set; } = "/";
    public string? Group { get; set; }
    public bool OpenInNewTab { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>A link inside one of the footer columns.</summary>
public class FooterLink : IOrderedEntity
{
    public int Id { get; set; }
    public string Group { get; set; } = "Collections";
    public string Label { get; set; } = "";
    public string Path { get; set; } = "/";
    public bool OpenInNewTab { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>A link in the mega menu's footer strip ("Quick links").</summary>
public class QuickLink : IOrderedEntity
{
    public int Id { get; set; }
    public string Label { get; set; } = "";
    public string Path { get; set; } = "/";
    public bool OpenInNewTab { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// A block on the home page. <see cref="SectionType"/> drives which component renders it,
/// so the admin can reorder, hide or re-title sections without a redeploy.
/// </summary>
public class HomeSection : IOrderedEntity
{
    public int Id { get; set; }
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
    /// <summary>The hero carousel slides, as a JSON array. Null/empty → the section
    /// falls back to its single-set of fields (title, body, CTA labels) for one slide.</summary>
    public string? SlidesJson { get; set; }
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}

/// <summary>Hero metric chips (e.g. "100% / Scalp Purified").</summary>
public class HeroStat : IOrderedEntity
{
    public int Id { get; set; }
    public string Value { get; set; } = "";
    public string Label { get; set; } = "";
    public string? Accent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Testimonial : IOrderedEntity
{
    public int Id { get; set; }
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

/// <summary>The "100% Authentic / Clean Botanical / ..." trust ribbon under the reviews.</summary>
public class TrustPillar : IOrderedEntity
{
    public int Id { get; set; }
    public string Icon { get; set; } = "verified_user";
    public string Title { get; set; } = "";
    public string? Subtitle { get; set; }
    public string? Accent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Hair-type diagnostic cards in the "clinical science" section.</summary>
public class HairProfile : IOrderedEntity
{
    public int Id { get; set; }
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

/// <summary>A static content page (About, Product Safety, Quality Verification, ...).</summary>
public class Page
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Subtitle { get; set; }
    public string? Eyebrow { get; set; }
    public string? ContentHtml { get; set; }
    public string? MetaDescription { get; set; }
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Submission from the contact / wholesale enquiry form.</summary>
public class ContactMessage
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string? Subject { get; set; }
    public string Message { get; set; } = "";
    /// <summary>"contact" | "wholesale" | "product" | "newsletter"</summary>
    public string Kind { get; set; } = "contact";
    /// <summary>Set when the enquiry was started from a product page ("Enquire about this product").</summary>
    public string? ProductSlug { get; set; }
    public string? ProductName { get; set; }
    public bool IsRead { get; set; }
    public bool EmailDelivered { get; set; }
    public string? DeliveryError { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>When staff last replied from the dashboard; null until the first reply.</summary>
    public DateTime? RepliedAt { get; set; }
    /// <summary>How many dashboard replies have been sent for this enquiry.</summary>
    public int ReplyCount { get; set; }
}
