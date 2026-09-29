using Albaik.Api.Data;
using Albaik.Api.Dtos;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Controllers;

[ApiController]
[Route("api")]
public class SiteController : ControllerBase
{
    private readonly AppDbContext _db;
    public SiteController(AppDbContext db) => _db = db;

    /// <summary>Settings + navigation + footer + catalogue tree, fetched once at app start.</summary>
    [HttpGet("bootstrap")]
    public async Task<ActionResult<SiteBootstrapDto>> GetBootstrap()
    {
        var settings = await _db.SiteSettings.OrderBy(s => s.Group).ThenBy(s => s.SortOrder)
            .Select(s => s.ToDto()).ToListAsync();

        var nav = await _db.NavLinks.Where(n => n.IsActive)
            .OrderBy(n => n.SortOrder).Select(n => n.ToDto()).ToListAsync();

        var footer = await _db.FooterLinks.Where(f => f.IsActive)
            .OrderBy(f => f.Group).ThenBy(f => f.SortOrder).Select(f => f.ToDto()).ToListAsync();

        var quickLinks = await _db.QuickLinks.Where(q => q.IsActive)
            .OrderBy(q => q.SortOrder).Select(q => q.ToDto()).ToListAsync();

        var hasQuickLinks = await _db.QuickLinks.AnyAsync();

        var categories = await _db.Categories.Where(c => c.IsActive)
            .Include(c => c.Brands).Include(c => c.Products)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        var brands = await _db.Brands.Where(b => b.IsActive)
            .Include(b => b.Category).Include(b => b.Products)
            .OrderBy(b => b.CategoryId).ThenBy(b => b.SortOrder)
            .ToListAsync();

        return new SiteBootstrapDto(
            settings, nav, footer, quickLinks, hasQuickLinks,
            categories.Select(c => c.ToDto()).ToList(),
            brands.Select(b => b.ToDto()).ToList());
    }

    /// <summary>Everything the home page renders, in one request.</summary>
    [HttpGet("home")]
    public async Task<ActionResult<HomePayloadDto>> GetHome()
    {
        var sections = await _db.HomeSections.Where(s => s.IsVisible)
            .OrderBy(s => s.SortOrder).Select(s => s.ToDto()).ToListAsync();

        var stats = await _db.HeroStats.Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder).Select(s => s.ToDto()).ToListAsync();

        var featured = await _db.Products
            .Include(p => p.Brand).Include(p => p.Category)
            .Where(p => p.IsActive && p.IsFeatured)
            .OrderBy(p => p.SortOrder).Take(6)
            .ToListAsync();

        // If nothing is flagged as featured, fall back to the first few products so the
        // home page never renders an empty grid.
        if (featured.Count == 0)
        {
            featured = await _db.Products
                .Include(p => p.Brand).Include(p => p.Category)
                .Where(p => p.IsActive)
                .OrderBy(p => p.SortOrder).Take(3)
                .ToListAsync();
        }

        var testimonials = await _db.Testimonials.Where(t => t.IsActive)
            .OrderBy(t => t.SortOrder).Select(t => t.ToDto()).ToListAsync();

        var pillars = await _db.TrustPillars.Where(t => t.IsActive)
            .OrderBy(t => t.SortOrder).Select(t => t.ToDto()).ToListAsync();

        var profiles = await _db.HairProfiles.Where(h => h.IsActive)
            .OrderBy(h => h.SortOrder).Select(h => h.ToDto()).ToListAsync();

        var categories = await _db.Categories.Where(c => c.IsActive)
            .Include(c => c.Brands).Include(c => c.Products)
            .OrderBy(c => c.SortOrder).ToListAsync();

        return new HomePayloadDto(
            sections, stats,
            featured.Select(p => p.ToCard()).ToList(),
            testimonials, pillars, profiles,
            categories.Select(c => c.ToDto()).ToList());
    }

    /// <summary>Static content pages (About, Quality, Safety, guides...).</summary>
    [HttpGet("pages")]
    public async Task<ActionResult<List<object>>> GetPages()
    {
        var pages = await _db.Pages.Where(p => p.IsPublished)
            .OrderBy(p => p.SortOrder)
            .Select(p => new { p.Slug, p.Title, p.Subtitle, p.Eyebrow })
            .ToListAsync();
        return Ok(pages);
    }

    [HttpGet("pages/{slug}")]
    public async Task<ActionResult<PageDto>> GetPage(string slug)
    {
        var page = await _db.Pages.FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);
        if (page is null) return NotFound(new { message = $"Page '{slug}' was not found." });
        return page.ToDto();
    }
}
