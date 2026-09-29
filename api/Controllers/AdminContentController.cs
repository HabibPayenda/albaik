using System.Text.Json;
using Albaik.Api.Data;
using Albaik.Api.Dtos;
using Albaik.Api.Models;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Controllers;

/// <summary>Admin CRUD for every piece of editable website content.</summary>
[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminContentController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly IConfiguration _config;

    public AdminContentController(AppDbContext db, IEmailSender email, IConfiguration config)
    {
        _db = db;
        _email = email;
        _config = config;
    }

    // ------------------------------------------------------------------ dashboard

    [HttpGet("stats")]
    public async Task<ActionResult<object>> Stats()
    {
        var messages = await _db.ContactMessages.CountAsync(m => m.Kind != "newsletter");
        var unread = await _db.ContactMessages.CountAsync(m => m.Kind != "newsletter" && !m.IsRead);

        return new
        {
            categories = await _db.Categories.CountAsync(),
            brands = await _db.Brands.CountAsync(),
            products = await _db.Products.CountAsync(),
            activeProducts = await _db.Products.CountAsync(p => p.IsActive),
            featuredProducts = await _db.Products.CountAsync(p => p.IsFeatured),
            testimonials = await _db.Testimonials.CountAsync(t => t.IsActive),
            pages = await _db.Pages.CountAsync(),
            messages,
            unreadMessages = unread,
            subscribers = await _db.ContactMessages.CountAsync(m => m.Kind == "newsletter"),
            recentMessages = await _db.ContactMessages
                .Where(m => m.Kind != "newsletter")
                .OrderByDescending(m => m.CreatedAt).Take(5)
                .Select(m => m.ToDto()).ToListAsync()
        };
    }

    // ------------------------------------------------------------------ home sections

    [HttpGet("home-sections")]
    public async Task<ActionResult<List<HomeSectionDto>>> HomeSections()
        => await _db.HomeSections.OrderBy(s => s.SortOrder).Select(s => s.ToDto()).ToListAsync();

    [HttpPut("home-sections/{id:int}")]
    public async Task<ActionResult<HomeSectionDto>> UpdateHomeSection(int id, [FromBody] HomeSectionInput i)
    {
        var s = await _db.HomeSections.FindAsync(id);
        if (s is null) return NotFound(new { message = "Section not found." });
        s.Eyebrow = i.Eyebrow; s.Title = i.Title; s.Subtitle = i.Subtitle; s.Body = i.Body;
        s.ImageUrl = i.ImageUrl;
        s.PrimaryCtaLabel = i.PrimaryCtaLabel; s.PrimaryCtaHref = i.PrimaryCtaHref;
        s.SecondaryCtaLabel = i.SecondaryCtaLabel; s.SecondaryCtaHref = i.SecondaryCtaHref;
        s.DataJson = i.DataJson; s.SlidesJson = i.SlidesJson; s.SortOrder = i.SortOrder; s.IsVisible = i.IsVisible;
        await _db.SaveChangesAsync();
        return s.ToDto();
    }

    [HttpPost("home-sections")]
    public async Task<ActionResult<HomeSectionDto>> CreateHomeSection([FromBody] HomeSectionInput i)
    {
        if (string.IsNullOrWhiteSpace(i.Key)) return BadRequest(new { message = "A unique key is required." });
        if (await _db.HomeSections.AnyAsync(s => s.Key == i.Key)) return Conflict(new { message = $"Key '{i.Key}' is already used." });
        var s = new HomeSection { Key = i.Key.Trim() };
        Apply(s, i);
        _db.HomeSections.Add(s);
        await _db.SaveChangesAsync();
        return s.ToDto();
    }

    [HttpDelete("home-sections/{id:int}")]
    public async Task<ActionResult<object>> DeleteHomeSection(int id)
    {
        var s = await _db.HomeSections.FindAsync(id);
        if (s is null) return NotFound(new { message = "Section not found." });
        _db.HomeSections.Remove(s);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Section '{s.Key}' deleted." });
    }

    // ------------------------------------------------------------------ simple content lists

    [HttpGet("hero-stats")]
    public async Task<ActionResult<List<HeroStatDto>>> HeroStats()
        => await _db.HeroStats.OrderBy(s => s.SortOrder).Select(s => s.ToDto()).ToListAsync();

    [HttpPost("hero-stats")]
    public async Task<ActionResult<HeroStatDto>> CreateHeroStat([FromBody] HeroStatInput i)
    {
        var s = new HeroStat();
        Apply(s, i);
        _db.HeroStats.Add(s);
        await _db.SaveChangesAsync();
        return s.ToDto();
    }

    [HttpPut("hero-stats/{id:int}")]
    public async Task<ActionResult<HeroStatDto>> UpdateHeroStat(int id, [FromBody] HeroStatInput i)
    {
        var s = await _db.HeroStats.FindAsync(id);
        if (s is null) return NotFound(new { message = "Hero stat not found." });
        Apply(s, i);
        await _db.SaveChangesAsync();
        return s.ToDto();
    }

    [HttpDelete("hero-stats/{id:int}")]
    public async Task<ActionResult<object>> DeleteHeroStat(int id)
    {
        var s = await _db.HeroStats.FindAsync(id);
        if (s is null) return NotFound(new { message = "Hero stat not found." });
        _db.HeroStats.Remove(s);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Hero stat deleted." });
    }

    [HttpGet("testimonials")]
    public async Task<ActionResult<List<TestimonialDto>>> Testimonials()
        => await _db.Testimonials.OrderBy(t => t.SortOrder).Select(t => t.ToDto()).ToListAsync();

    [HttpPost("testimonials")]
    public async Task<ActionResult<TestimonialDto>> CreateTestimonial([FromBody] TestimonialInput i)
    {
        if (string.IsNullOrWhiteSpace(i.Name)) return BadRequest(new { message = "Name is required." });
        var t = new Testimonial();
        Apply(t, i);
        _db.Testimonials.Add(t);
        await _db.SaveChangesAsync();
        return t.ToDto();
    }

    [HttpPut("testimonials/{id:int}")]
    public async Task<ActionResult<TestimonialDto>> UpdateTestimonial(int id, [FromBody] TestimonialInput i)
    {
        var t = await _db.Testimonials.FindAsync(id);
        if (t is null) return NotFound(new { message = "Testimonial not found." });
        Apply(t, i);
        await _db.SaveChangesAsync();
        return t.ToDto();
    }

    [HttpDelete("testimonials/{id:int}")]
    public async Task<ActionResult<object>> DeleteTestimonial(int id)
    {
        var t = await _db.Testimonials.FindAsync(id);
        if (t is null) return NotFound(new { message = "Testimonial not found." });
        _db.Testimonials.Remove(t);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Testimonial deleted." });
    }

    [HttpGet("trust-pillars")]
    public async Task<ActionResult<List<TrustPillarDto>>> TrustPillars()
        => await _db.TrustPillars.OrderBy(t => t.SortOrder).Select(t => t.ToDto()).ToListAsync();

    [HttpPost("trust-pillars")]
    public async Task<ActionResult<TrustPillarDto>> CreateTrustPillar([FromBody] TrustPillarInput i)
    {
        var t = new TrustPillar();
        Apply(t, i);
        _db.TrustPillars.Add(t);
        await _db.SaveChangesAsync();
        return t.ToDto();
    }

    [HttpPut("trust-pillars/{id:int}")]
    public async Task<ActionResult<TrustPillarDto>> UpdateTrustPillar(int id, [FromBody] TrustPillarInput i)
    {
        var t = await _db.TrustPillars.FindAsync(id);
        if (t is null) return NotFound(new { message = "Trust pillar not found." });
        Apply(t, i);
        await _db.SaveChangesAsync();
        return t.ToDto();
    }

    [HttpDelete("trust-pillars/{id:int}")]
    public async Task<ActionResult<object>> DeleteTrustPillar(int id)
    {
        var t = await _db.TrustPillars.FindAsync(id);
        if (t is null) return NotFound(new { message = "Trust pillar not found." });
        _db.TrustPillars.Remove(t);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Trust pillar deleted." });
    }

    [HttpGet("hair-profiles")]
    public async Task<ActionResult<List<HairProfileDto>>> HairProfiles()
        => await _db.HairProfiles.OrderBy(h => h.SortOrder).Select(h => h.ToDto()).ToListAsync();

    [HttpPost("hair-profiles")]
    public async Task<ActionResult<HairProfileDto>> CreateHairProfile([FromBody] HairProfileInput i)
    {
        var h = new HairProfile();
        Apply(h, i);
        _db.HairProfiles.Add(h);
        await _db.SaveChangesAsync();
        return h.ToDto();
    }

    [HttpPut("hair-profiles/{id:int}")]
    public async Task<ActionResult<HairProfileDto>> UpdateHairProfile(int id, [FromBody] HairProfileInput i)
    {
        var h = await _db.HairProfiles.FindAsync(id);
        if (h is null) return NotFound(new { message = "Hair profile not found." });
        Apply(h, i);
        await _db.SaveChangesAsync();
        return h.ToDto();
    }

    [HttpDelete("hair-profiles/{id:int}")]
    public async Task<ActionResult<object>> DeleteHairProfile(int id)
    {
        var h = await _db.HairProfiles.FindAsync(id);
        if (h is null) return NotFound(new { message = "Hair profile not found." });
        _db.HairProfiles.Remove(h);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Hair profile deleted." });
    }

    // ------------------------------------------------------------------ navigation & footer

    [HttpGet("nav-links")]
    public async Task<ActionResult<List<NavLinkDto>>> NavLinks()
        => await _db.NavLinks.OrderBy(n => n.SortOrder).Select(n => n.ToDto()).ToListAsync();

    [HttpPost("nav-links")]
    public async Task<ActionResult<NavLinkDto>> CreateNavLink([FromBody] NavLinkInput i)
    {
        if (string.IsNullOrWhiteSpace(i.Label)) return BadRequest(new { message = "Label is required." });
        var n = new NavLink();
        Apply(n, i);
        _db.NavLinks.Add(n);
        await _db.SaveChangesAsync();
        return n.ToDto();
    }

    [HttpPut("nav-links/{id:int}")]
    public async Task<ActionResult<NavLinkDto>> UpdateNavLink(int id, [FromBody] NavLinkInput i)
    {
        var n = await _db.NavLinks.FindAsync(id);
        if (n is null) return NotFound(new { message = "Nav link not found." });
        Apply(n, i);
        await _db.SaveChangesAsync();
        return n.ToDto();
    }

    [HttpDelete("nav-links/{id:int}")]
    public async Task<ActionResult<object>> DeleteNavLink(int id)
    {
        var n = await _db.NavLinks.FindAsync(id);
        if (n is null) return NotFound(new { message = "Nav link not found." });
        _db.NavLinks.Remove(n);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Nav link deleted." });
    }

    [HttpGet("footer-links")]
    public async Task<ActionResult<List<FooterLinkDto>>> FooterLinks()
        => await _db.FooterLinks.OrderBy(f => f.Group).ThenBy(f => f.SortOrder).Select(f => f.ToDto()).ToListAsync();

    [HttpPost("footer-links")]
    public async Task<ActionResult<FooterLinkDto>> CreateFooterLink([FromBody] FooterLinkInput i)
    {
        if (string.IsNullOrWhiteSpace(i.Label)) return BadRequest(new { message = "Label is required." });
        var f = new FooterLink();
        Apply(f, i);
        _db.FooterLinks.Add(f);
        await _db.SaveChangesAsync();
        return f.ToDto();
    }

    [HttpPut("footer-links/{id:int}")]
    public async Task<ActionResult<FooterLinkDto>> UpdateFooterLink(int id, [FromBody] FooterLinkInput i)
    {
        var f = await _db.FooterLinks.FindAsync(id);
        if (f is null) return NotFound(new { message = "Footer link not found." });
        Apply(f, i);
        await _db.SaveChangesAsync();
        return f.ToDto();
    }

    [HttpDelete("footer-links/{id:int}")]
    public async Task<ActionResult<object>> DeleteFooterLink(int id)
    {
        var f = await _db.FooterLinks.FindAsync(id);
        if (f is null) return NotFound(new { message = "Footer link not found." });
        _db.FooterLinks.Remove(f);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Footer link deleted." });
    }

    [HttpGet("quick-links")]
    public async Task<ActionResult<List<QuickLinkDto>>> QuickLinks()
        => await _db.QuickLinks.OrderBy(q => q.SortOrder).Select(q => q.ToDto()).ToListAsync();

    [HttpPost("quick-links")]
    public async Task<ActionResult<QuickLinkDto>> CreateQuickLink([FromBody] QuickLinkInput i)
    {
        if (string.IsNullOrWhiteSpace(i.Label)) return BadRequest(new { message = "Label is required." });
        var q = new QuickLink();
        Apply(q, i);
        _db.QuickLinks.Add(q);
        await _db.SaveChangesAsync();
        return q.ToDto();
    }

    [HttpPut("quick-links/{id:int}")]
    public async Task<ActionResult<QuickLinkDto>> UpdateQuickLink(int id, [FromBody] QuickLinkInput i)
    {
        var q = await _db.QuickLinks.FindAsync(id);
        if (q is null) return NotFound(new { message = "Quick link not found." });
        Apply(q, i);
        await _db.SaveChangesAsync();
        return q.ToDto();
    }

    [HttpDelete("quick-links/{id:int}")]
    public async Task<ActionResult<object>> DeleteQuickLink(int id)
    {
        var q = await _db.QuickLinks.FindAsync(id);
        if (q is null) return NotFound(new { message = "Quick link not found." });
        _db.QuickLinks.Remove(q);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Quick link deleted." });
    }

    // ------------------------------------------------------------------ pages

    [HttpGet("pages")]
    public async Task<ActionResult<List<PageDto>>> Pages()
        => await _db.Pages.OrderBy(p => p.SortOrder).Select(p => p.ToDto()).ToListAsync();

    [HttpGet("pages/{id:int}")]
    public async Task<ActionResult<PageDto>> Page(int id)
    {
        var p = await _db.Pages.FindAsync(id);
        return p is null ? NotFound(new { message = "Page not found." }) : p.ToDto();
    }

    [HttpPost("pages")]
    public async Task<ActionResult<PageDto>> CreatePage([FromBody] PageInput i)
    {
        if (string.IsNullOrWhiteSpace(i.Title)) return BadRequest(new { message = "Title is required." });
        var slug = Slug.From(string.IsNullOrWhiteSpace(i.Slug) ? i.Title : i.Slug);
        if (await _db.Pages.AnyAsync(p => p.Slug == slug)) return Conflict(new { message = $"Slug '{slug}' is already in use." });

        var p = new Page { Slug = slug };
        Apply(p, i);
        _db.Pages.Add(p);
        await _db.SaveChangesAsync();
        return p.ToDto();
    }

    [HttpPut("pages/{id:int}")]
    public async Task<ActionResult<PageDto>> UpdatePage(int id, [FromBody] PageInput i)
    {
        var p = await _db.Pages.FindAsync(id);
        if (p is null) return NotFound(new { message = "Page not found." });

        if (!string.IsNullOrWhiteSpace(i.Slug))
        {
            var slug = Slug.From(i.Slug);
            if (slug != p.Slug)
            {
                if (await _db.Pages.AnyAsync(x => x.Slug == slug && x.Id != id))
                    return Conflict(new { message = $"Slug '{slug}' is already in use." });
                p.Slug = slug;
            }
        }

        Apply(p, i);
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return p.ToDto();
    }

    [HttpDelete("pages/{id:int}")]
    public async Task<ActionResult<object>> DeletePage(int id)
    {
        var p = await _db.Pages.FindAsync(id);
        if (p is null) return NotFound(new { message = "Page not found." });
        _db.Pages.Remove(p);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Page '{p.Title}' deleted." });
    }

    // ------------------------------------------------------------------ settings

    [HttpGet("settings")]
    public async Task<ActionResult<List<SiteSettingDto>>> Settings()
        => await _db.SiteSettings.OrderBy(s => s.Group).ThenBy(s => s.SortOrder).Select(s => s.ToDto()).ToListAsync();

    /// <summary>Bulk upsert — the settings screen posts the whole form at once.</summary>
    [HttpPut("settings")]
    public async Task<ActionResult<List<SiteSettingDto>>> UpdateSettings([FromBody] SettingsInput input)
    {
        var existing = await _db.SiteSettings.ToDictionaryAsync(s => s.Key);
        foreach (var item in input.Settings)
        {
            if (string.IsNullOrWhiteSpace(item.Key)) continue;

            // JSON-typed settings carry a shape the marketing shell parses on every page
            // load, so refuse to store a value the frontend could not read back — the
            // overlay's bundled fallback would otherwise silently hide a broken edit and
            // nobody would notice the setting was corrupted. Validation is per-key: only
            // `search.suggestions` has the chip shape (the other JSON-typed setting,
            // `icons.disabled`, is an array of strings owned by the icons endpoint).
            if (item.Key == "search.suggestions" && ValidateSearchSuggestions(item.Value) is { } problem)
            {
                return BadRequest(new { message = problem });
            }

            if (existing.TryGetValue(item.Key, out var row))
                row.Value = item.Value;
            else
                _db.SiteSettings.Add(new SiteSetting { Key = item.Key.Trim(), Value = item.Value, Group = item.Group, Label = item.Label, InputType = item.InputType });
        }
        await _db.SaveChangesAsync();
        return await _db.SiteSettings.OrderBy(s => s.Group).ThenBy(s => s.SortOrder).Select(s => s.ToDto()).ToListAsync();
    }

/// <summary>
/// The accepted shape of the `search.suggestions` setting: a list of search chips, each
/// with a non-empty label and query. Null or blank is legal (the overlay falls back to its
/// bundled chips), as is an explicit empty list (all chips hidden). Non-JSON, an object
/// instead of an array, or a chip missing its label or query is refused.
/// </summary>
private static string? ValidateSearchSuggestions(string? value)
{
    if (string.IsNullOrWhiteSpace(value)) return null;
    try
    {
        var chips = JsonSerializer.Deserialize<List<SearchChipDto>>(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        if (chips is null)
            return "The 'search.suggestions' setting must be a JSON array of { \"label\", \"query\" } objects.";
        if (chips.Any(c => c is null || string.IsNullOrWhiteSpace(c.Label) || string.IsNullOrWhiteSpace(c.Query)))
            return "Every chip in 'search.suggestions' needs a non-empty label and query.";
    }
    catch (JsonException)
    {
        return "The 'search.suggestions' setting must be a valid JSON array of { \"label\", \"query\" } objects.";
    }
    return null;
}

    // ------------------------------------------------------------------ icon library

    private const string IconSettingKey = "icons.disabled";

    /// <summary>The names an editor has switched off, so the icon selectors can hide them.</summary>
    [HttpGet("icons")]
    public async Task<ActionResult<IconStateDto>> Icons()
    {
        var row = await _db.SiteSettings.FirstOrDefaultAsync(s => s.Key == IconSettingKey);
        return Ok(new IconStateDto(DisabledNames(row?.Value)));
    }

    [HttpPut("icons")]
    public async Task<ActionResult<IconStateDto>> UpdateIcons([FromBody] IconStateInput input)
    {
        var names = (input.Disabled ?? new List<string>())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Select(n => n.Trim())
            .Distinct(StringComparer.Ordinal)
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToList();

        var value = JsonSerializer.Serialize(names);
        var row = await _db.SiteSettings.FirstOrDefaultAsync(s => s.Key == IconSettingKey);

        if (row is null)
            _db.SiteSettings.Add(new SiteSetting
            {
                Key = IconSettingKey,
                Value = value,
                Group = "system",
                Label = "Disabled icons",
                InputType = "json",
            });
        else
            row.Value = value;

        await _db.SaveChangesAsync();
        return Ok(new IconStateDto(names));
    }

    /// <summary>
    /// A hand-edited or half-written value must never lock an editor out of the screen,
    /// so an unparseable setting reads as "nothing is disabled".
    /// </summary>
    private static List<string> DisabledNames(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return new List<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(value) ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }

    // ------------------------------------------------------------------ message inbox

    /// <summary>
    /// Whether outbound mail is actually wired up. The settings screen uses this to
    /// tell the operator, in plain language, if contact-form notifications will send.
    /// </summary>
    [HttpGet("email-status")]
    public ActionResult<object> EmailStatus()
    {
        // Config keys exist but are blank until an operator fills them in, so treat
        // empty strings as "not set" rather than relying on null.
        static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

        var host = Blank(_config["Smtp:Host"]);
        var username = Blank(_config["Smtp:Username"]);
        var notify = Blank(_config["Smtp:NotifyAddress"]);
        var from = Blank(_config["Smtp:FromAddress"]) ?? username ?? "no-reply@albaik-group.com";
        var port = Blank(_config["Smtp:Port"]) ?? "587";

        var problems = new List<string>();
        if (host is null) problems.Add("Smtp:Host is not set.");
        if (username is null) problems.Add("Smtp:Username is not set.");
        if (notify is null) problems.Add("Smtp:NotifyAddress is not set, so nobody receives the notification.");

        return new
        {
            configured = _email.IsConfigured,
            host,
            port,
            fromAddress = from,
            notifyAddress = notify,
            problems,
        };
    }

    [HttpGet("messages")]
    public async Task<ActionResult<object>> Messages([FromQuery] string? kind, [FromQuery] bool? unreadOnly)
    {
        var q = _db.ContactMessages.AsQueryable();
        if (!string.IsNullOrWhiteSpace(kind)) q = q.Where(m => m.Kind == kind);
        if (unreadOnly == true) q = q.Where(m => !m.IsRead);

        var items = await q.OrderByDescending(m => m.CreatedAt).Select(m => m.ToDto()).ToListAsync();
        return new { items, total = items.Count, unread = items.Count(m => !m.IsRead) };
    }

    [HttpPut("messages/{id:int}/read")]
    public async Task<ActionResult<ContactMessageDto>> MarkRead(int id, [FromQuery] bool read = true)
    {
        var m = await _db.ContactMessages.FindAsync(id);
        if (m is null) return NotFound(new { message = "Message not found." });
        m.IsRead = read;
        await _db.SaveChangesAsync();
        return m.ToDto();
    }

    [HttpDelete("messages/{id:int}")]
    public async Task<ActionResult<object>> DeleteMessage(int id)
    {
        var m = await _db.ContactMessages.FindAsync(id);
        if (m is null) return NotFound(new { message = "Message not found." });
        _db.ContactMessages.Remove(m);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Message deleted." });
    }

    // ------------------------------------------------------------------ reorder

    /// <summary>
    /// One shared endpoint for every dashboard list the operator can re-sequence: the
    /// body names the collection by its admin key and supplies the full ordered id list.
    /// Rows missing from the list are left untouched; ids nobody recognises are skipped,
    /// so a stale client can never scramble unrelated rows.
    /// </summary>
    [HttpPut("reorder")]
    public async Task<ActionResult<object>> Reorder([FromBody] ReorderInput input)
    {
        var ids = input.Ids ?? new List<int>();
        if (ids.Count == 0) return BadRequest(new { message = "At least one id is required." });

        switch (input.Resource)
        {
            case "home-sections": return await ApplyOrder(_db.HomeSections, "Home section", ids);
            case "hero-stats": return await ApplyOrder(_db.HeroStats, "Hero stat", ids);
            case "testimonials": return await ApplyOrder(_db.Testimonials, "Testimonial", ids);
            case "trust-pillars": return await ApplyOrder(_db.TrustPillars, "Trust pillar", ids);
            case "hair-profiles": return await ApplyOrder(_db.HairProfiles, "Hair profile", ids);
            case "nav-links": return await ApplyOrder(_db.NavLinks, "Nav link", ids);
            case "footer-links": return await ApplyOrder(_db.FooterLinks, "Footer link", ids);
            case "quick-links": return await ApplyOrder(_db.QuickLinks, "Quick link", ids);
            case "categories": return await ApplyOrder(_db.Categories, "Category", ids);
            default: return NotFound(new { message = $"Unknown collection '{input.Resource}'." });
        }
    }

    private async Task<ActionResult<object>> ApplyOrder<T>(DbSet<T> set, string label, List<int> ids)
        where T : class, IOrderedEntity
    {
        var rows = await set.Where(e => ids.Contains(e.Id)).ToListAsync();
        if (rows.Count == 0) return NotFound(new { message = "Nothing to reorder." });

        var lookup = rows.ToDictionary(e => e.Id);
        for (var i = 0; i < ids.Count; i++)
            if (lookup.TryGetValue(ids[i], out var row))
                row.SortOrder = i;

        await _db.SaveChangesAsync();
        return Ok(new { message = $"{label} order updated." });
    }

    // ------------------------------------------------------------------ helpers

    private static void Apply(HomeSection s, HomeSectionInput i)
    {
        s.SectionType = i.SectionType; s.Eyebrow = i.Eyebrow; s.Title = i.Title; s.Subtitle = i.Subtitle;
        s.Body = i.Body; s.ImageUrl = i.ImageUrl;
        s.PrimaryCtaLabel = i.PrimaryCtaLabel; s.PrimaryCtaHref = i.PrimaryCtaHref;
        s.SecondaryCtaLabel = i.SecondaryCtaLabel; s.SecondaryCtaHref = i.SecondaryCtaHref;
        s.DataJson = i.DataJson; s.SlidesJson = i.SlidesJson; s.SortOrder = i.SortOrder; s.IsVisible = i.IsVisible;
    }

    private static void Apply(HeroStat s, HeroStatInput i)
    {
        s.Value = i.Value; s.Label = i.Label; s.Accent = i.Accent;
        s.SortOrder = i.SortOrder; s.IsActive = i.IsActive;
    }

    private static void Apply(Testimonial t, TestimonialInput i)
    {
        t.Name = i.Name; t.Role = i.Role; t.Initials = i.Initials; t.Title = i.Title; t.Quote = i.Quote;
        t.Rating = i.Rating; t.AvatarUrl = i.AvatarUrl; t.SortOrder = i.SortOrder; t.IsActive = i.IsActive;
    }

    private static void Apply(TrustPillar t, TrustPillarInput i)
    {
        t.Icon = i.Icon; t.Title = i.Title; t.Subtitle = i.Subtitle; t.Accent = i.Accent;
        t.SortOrder = i.SortOrder; t.IsActive = i.IsActive;
    }

    private static void Apply(HairProfile h, HairProfileInput i)
    {
        h.Key = i.Key; h.Icon = i.Icon; h.Title = i.Title; h.Badge = i.Badge; h.BadgeStyle = i.BadgeStyle;
        h.Description = i.Description; h.MetricValue = i.MetricValue; h.MetricLabel = i.MetricLabel;
        h.SortOrder = i.SortOrder; h.IsActive = i.IsActive;
    }

    private static void Apply(NavLink n, NavLinkInput i)
    {
        n.Label = i.Label; n.Path = i.Path; n.Group = i.Group;
        n.OpenInNewTab = i.OpenInNewTab; n.SortOrder = i.SortOrder; n.IsActive = i.IsActive;
    }

    private static void Apply(FooterLink f, FooterLinkInput i)
    {
        f.Group = i.Group; f.Label = i.Label; f.Path = i.Path;
        f.OpenInNewTab = i.OpenInNewTab; f.SortOrder = i.SortOrder; f.IsActive = i.IsActive;
    }

    private static void Apply(QuickLink q, QuickLinkInput i)
    {
        q.Label = i.Label; q.Path = i.Path;
        q.OpenInNewTab = i.OpenInNewTab; q.SortOrder = i.SortOrder; q.IsActive = i.IsActive;
    }

    private static void Apply(Page p, PageInput i)
    {
        p.Title = i.Title; p.Subtitle = i.Subtitle; p.Eyebrow = i.Eyebrow;
        p.ContentHtml = i.ContentHtml; p.MetaDescription = i.MetaDescription;
        p.SortOrder = i.SortOrder; p.IsPublished = i.IsPublished;
    }
}
