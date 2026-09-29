using Albaik.Api.Data;
using Albaik.Api.Dtos;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Controllers;

[ApiController]
[Route("api/catalog")]
public class CatalogController : ControllerBase
{
    private readonly AppDbContext _db;
    public CatalogController(AppDbContext db) => _db = db;

    /// <summary>All active categories, optionally with their brands nested.</summary>
    [HttpGet("categories")]
    public async Task<ActionResult<List<CategoryDto>>> GetCategories([FromQuery] bool withBrands = false)
    {
        var categories = await _db.Categories
            .Where(c => c.IsActive)
            .Include(c => c.Brands)
            .Include(c => c.Products)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync();

        if (!withBrands)
            return categories.Select(c => c.ToDto()).ToList();

        var brandIds = categories.SelectMany(c => c.Brands).Select(b => b.Id).ToList();
        var counts = await _db.Products
            .Where(p => p.IsActive && brandIds.Contains(p.BrandId))
            .GroupBy(p => p.BrandId)
            .Select(g => new { BrandId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BrandId, x => x.Count);

        return categories.Select(c => c.ToDto(
            c.Brands.Where(b => b.IsActive).OrderBy(b => b.SortOrder)
                .Select(b => b.ToDto()).ToList()
        )).ToList();
    }

    /// <summary>A single category with its brands and product counts.</summary>
    [HttpGet("categories/{slug}")]
    public async Task<ActionResult<CategoryDto>> GetCategory(string slug)
    {
        var c = await _db.Categories
            .Include(x => x.Brands).Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive);
        if (c is null) return NotFound(new { message = $"Category '{slug}' was not found." });

        var brands = c.Brands.Where(b => b.IsActive).OrderBy(b => b.SortOrder).ToList();
        var brandIds = brands.Select(b => b.Id).ToList();
        var counts = await _db.Products
            .Where(p => p.IsActive && brandIds.Contains(p.BrandId))
            .GroupBy(p => p.BrandId)
            .Select(g => new { BrandId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BrandId, x => x.Count);

        var dtos = brands.Select(b => new BrandDto(
            b.Id, b.Slug, b.Name, b.Tagline, b.Description, b.LogoUrl, b.ImageUrl, b.Accent,
            b.CategoryId, c.Slug, c.Name, b.SortOrder, b.IsActive, b.IsFeatured,
            counts.GetValueOrDefault(b.Id))).ToList();

        return c.ToDto(dtos);
    }

    /// <summary>Brands, optionally filtered to one category.</summary>
    [HttpGet("brands")]
    public async Task<ActionResult<List<BrandDto>>> GetBrands([FromQuery] string? category)
    {
        var q = _db.Brands.Include(b => b.Category).Include(b => b.Products).Where(b => b.IsActive);
        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(b => b.Category!.Slug == category);

        var brands = await q.OrderBy(b => b.CategoryId).ThenBy(b => b.SortOrder).ToListAsync();
        return brands.Select(b => b.ToDto()).ToList();
    }

    /// <summary>A brand inside a category, with all of its products.</summary>
    [HttpGet("brands/{categorySlug}/{brandSlug}")]
    public async Task<ActionResult<BrandDto>> GetBrand(string categorySlug, string brandSlug)
    {
        var b = await _db.Brands
            .Include(x => x.Category)
            // Loaded only so the DTO's ProductCount is populated.
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.Slug == brandSlug && x.Category!.Slug == categorySlug && x.IsActive);

        if (b is null) return NotFound(new { message = $"Brand '{brandSlug}' was not found in '{categorySlug}'." });

        /*
         * The product cards are fetched as their own query rather than with
         * `.Include(x => x.Products).ThenInclude(p => p.Brand).ThenInclude(...)`.
         *
         * Two ThenInclude branches hanging off the same collection is not a legal include
         * tree: the second `.Include(x => x.Products)` walks back up a branch EF has
         * already descended. EF Core 10 escalates that to a thrown
         * NavigationBaseIncludeIgnored, so this endpoint used to 500 and the brand page
         * showed "Brand not found". From the Products root, Brand and Category are
         * siblings — which is legal, and matches how GetProducts already queries.
         */
        var products = await _db.Products
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .Where(p => p.BrandId == b.Id && p.IsActive)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
            .ToListAsync();

        return b.ToDto(products.Select(p => p.ToCard()).ToList());
    }

    /// <summary>Paginated, filterable product listing.</summary>
    [HttpGet("products")]
    public async Task<ActionResult<object>> GetProducts(
        [FromQuery] string? category,
        [FromQuery] string? brand,
        [FromQuery] string? search,
        [FromQuery] bool? featured,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.Products
            .Include(p => p.Brand).Include(p => p.Category)
            .Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(p => p.Category!.Slug == category);
        if (!string.IsNullOrWhiteSpace(brand)) q = q.Where(p => p.Brand!.Slug == brand);
        if (featured == true) q = q.Where(p => p.IsFeatured);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            q = q.Where(p => EF.Functions.Like(p.Name, $"%{term}%")
                          || EF.Functions.Like(p.ShortDescription ?? "", $"%{term}%")
                          || EF.Functions.Like(p.Brand!.Name, $"%{term}%"));
        }

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(p => p.IsFeatured).ThenBy(p => p.SortOrder).ThenBy(p => p.Name)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return new
        {
            items = items.Select(p => p.ToCard()).ToList(),
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    /// <summary>Full product detail with gallery and related products.</summary>
    [HttpGet("products/{slug}")]
    public async Task<ActionResult<ProductDetailDto>> GetProduct(string slug)
    {
        var p = await _db.Products
            .Include(x => x.Brand).Include(x => x.Category)
            .Include(x => x.Images)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive);

        if (p is null) return NotFound(new { message = $"Product '{slug}' was not found." });

        var related = await _db.Products
            .Include(x => x.Brand).Include(x => x.Category)
            .Where(x => x.IsActive && x.Id != p.Id && x.CategoryId == p.CategoryId)
            .OrderByDescending(x => x.BrandId == p.BrandId)
            .ThenBy(x => x.SortOrder)
            .Take(3)
            .ToListAsync();

        return p.ToDetail(related.Select(r => r.ToCard()).ToList());
    }
}
