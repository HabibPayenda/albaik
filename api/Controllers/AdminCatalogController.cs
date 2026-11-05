using Albaik.Api.Data;
using Albaik.Api.Dtos;
using Albaik.Api.Models;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Albaik.Api.Controllers;

/// <summary>Admin CRUD for the Category -> Brand -> Product hierarchy.</summary>
[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminCatalogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ImagePipeline _images;
    public AdminCatalogController(AppDbContext db, IWebHostEnvironment env, ImagePipeline images)
    {
        _db = db;
        _env = env;
        _images = images;
    }

    // ------------------------------------------------------------------ categories

    [HttpGet("categories")]
    public async Task<ActionResult<List<CategoryDto>>> Categories()
    {
        var cats = await _db.Categories.Include(c => c.Brands).Include(c => c.Products)
            .OrderBy(c => c.SortOrder).ToListAsync();
        return cats.Select(c => c.ToDto()).ToList();
    }

    [HttpPost("categories")]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CategoryInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Name)) return BadRequest(new { message = "Name is required." });

        var slug = await UniqueCategorySlug(string.IsNullOrWhiteSpace(input.Slug) ? Slug.From(input.Name) : Slug.From(input.Slug));
        var c = new Category { Slug = slug };
        Apply(c, input);
        _db.Categories.Add(c);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Categories), new { id = c.Id }, c.ToDto());
    }

    [HttpPut("categories/{id:int}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(int id, [FromBody] CategoryInput input)
    {
        var c = await _db.Categories.Include(x => x.Brands).Include(x => x.Products).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound(new { message = "Category not found." });

        if (!string.IsNullOrWhiteSpace(input.Slug) && Slug.From(input.Slug) != c.Slug)
            c.Slug = await UniqueCategorySlug(Slug.From(input.Slug), id);

        Apply(c, input);
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return c.ToDto();
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<ActionResult<object>> DeleteCategory(int id)
    {
        var c = await _db.Categories.Include(x => x.Brands).Include(x => x.Products).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound(new { message = "Category not found." });

        if (c.Brands.Count > 0 || c.Products.Count > 0)
            return Conflict(new { message = $"'{c.Name}' still contains {c.Brands.Count} brand(s) and {c.Products.Count} product(s). Move or delete them first." });

        _db.Categories.Remove(c);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Category '{c.Name}' deleted." });
    }

    // ------------------------------------------------------------------ brands

    [HttpGet("brands")]
    public async Task<ActionResult<List<BrandDto>>> Brands()
    {
        var brands = await _db.Brands.Include(b => b.Category).Include(b => b.Products)
            .OrderBy(b => b.CategoryId).ThenBy(b => b.SortOrder).ToListAsync();
        return brands.Select(b => b.ToDto()).ToList();
    }

    [HttpPost("brands")]
    public async Task<ActionResult<BrandDto>> CreateBrand([FromBody] BrandInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Name)) return BadRequest(new { message = "Name is required." });
        if (!await _db.Categories.AnyAsync(c => c.Id == input.CategoryId))
            return BadRequest(new { message = "Select a valid category." });

        var b = new Brand { Slug = await UniqueBrandSlug(input.CategoryId, string.IsNullOrWhiteSpace(input.Slug) ? Slug.From(input.Name) : Slug.From(input.Slug)) };
        Apply(b, input);
        _db.Brands.Add(b);
        await _db.SaveChangesAsync();
        await _db.Entry(b).Reference(x => x.Category).LoadAsync();
        return CreatedAtAction(nameof(Brands), new { id = b.Id }, b.ToDto());
    }

    [HttpPut("brands/{id:int}")]
    public async Task<ActionResult<BrandDto>> UpdateBrand(int id, [FromBody] BrandInput input)
    {
        var b = await _db.Brands.Include(x => x.Category).Include(x => x.Products).FirstOrDefaultAsync(x => x.Id == id);
        if (b is null) return NotFound(new { message = "Brand not found." });

        var desiredSlug = string.IsNullOrWhiteSpace(input.Slug) ? b.Slug : Slug.From(input.Slug);
        if (desiredSlug != b.Slug || input.CategoryId != b.CategoryId)
            b.Slug = await UniqueBrandSlug(input.CategoryId, desiredSlug, id);

        Apply(b, input);
        b.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(b).Reference(x => x.Category).LoadAsync();
        return b.ToDto();
    }

    [HttpDelete("brands/{id:int}")]
    public async Task<ActionResult<object>> DeleteBrand(int id)
    {
        var b = await _db.Brands.Include(x => x.Products).FirstOrDefaultAsync(x => x.Id == id);
        if (b is null) return NotFound(new { message = "Brand not found." });

        if (b.Products.Count > 0)
            return Conflict(new { message = $"'{b.Name}' still has {b.Products.Count} product(s). Move or delete them first." });

        _db.Brands.Remove(b);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Brand '{b.Name}' deleted." });
    }

    // ------------------------------------------------------------------ products

    [HttpGet("products")]
    public async Task<ActionResult<object>> Products([FromQuery] string? search, [FromQuery] int? categoryId, [FromQuery] int? brandId)
    {
        var q = _db.Products.Include(p => p.Brand).Include(p => p.Category).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(p => EF.Functions.Like(p.Name, $"%{search.Trim()}%"));
        if (categoryId is not null) q = q.Where(p => p.CategoryId == categoryId);
        if (brandId is not null) q = q.Where(p => p.BrandId == brandId);

        var items = await q.OrderBy(p => p.CategoryId).ThenBy(p => p.BrandId).ThenBy(p => p.SortOrder).ToListAsync();
        return new { items = items.Select(p => p.ToCard()).ToList(), total = items.Count };
    }

    [HttpGet("products/{id:int}")]
    public async Task<ActionResult<ProductDetailDto>> Product(int id)
    {
        var p = await _db.Products.Include(x => x.Brand).Include(x => x.Category).Include(x => x.Images)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new { message = "Product not found." });
        return p.ToDetail(new List<ProductCardDto>());
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductCardDto>> CreateProduct([FromBody] ProductInput input)
    {
        var validation = await Validate(input);
        if (validation is not null) return BadRequest(new { message = validation });

        var p = new Product
        {
            Slug = await UniqueProductSlug(string.IsNullOrWhiteSpace(input.Slug) ? Slug.From(input.Name) : Slug.From(input.Slug)),
            VerificationCode = await NewUniqueVerificationCodeAsync(),
        };
        Apply(p, input);
        _db.Products.Add(p);
        await _db.SaveChangesAsync();
        await _db.Entry(p).Reference(x => x.Brand).LoadAsync();
        await _db.Entry(p).Reference(x => x.Category).LoadAsync();
        return CreatedAtAction(nameof(Product), new { id = p.Id }, p.ToCard());
    }

    [HttpPut("products/{id:int}")]
    public async Task<ActionResult<ProductCardDto>> UpdateProduct(int id, [FromBody] ProductInput input)
    {
        var validation = await Validate(input, id);
        if (validation is not null) return BadRequest(new { message = validation });

        var p = await _db.Products.Include(x => x.Images).Include(x => x.Brand).Include(x => x.Category)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new { message = "Product not found." });

        if (!string.IsNullOrWhiteSpace(input.Slug) && Slug.From(input.Slug) != p.Slug)
            p.Slug = await UniqueProductSlug(Slug.From(input.Slug), id);

        Apply(p, input);

        // Replace the gallery wholesale — the admin form always posts the full list.
        _db.ProductImages.RemoveRange(p.Images);
        p.Images = input.Images
            .Where(i => !string.IsNullOrWhiteSpace(i.Url))
            .Select((i, index) => new ProductImage { ProductId = p.Id, Url = i.Url.Trim(), Alt = i.Alt, SortOrder = index })
            .ToList();

        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(p).Reference(x => x.Brand).LoadAsync();
        await _db.Entry(p).Reference(x => x.Category).LoadAsync();
        return p.ToCard();
    }

    [HttpDelete("products/{id:int}")]
    public async Task<ActionResult<object>> DeleteProduct(int id)
    {
        var p = await _db.Products.FindAsync(id);
        if (p is null) return NotFound(new { message = "Product not found." });
        _db.Products.Remove(p);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Product '{p.Name}' deleted." });
    }

    // ------------------------------------------------------------------ verification

    /// <summary>
    /// The product's IBN, its verification code and the absolute URL the QR code encodes.
    ///
    /// The URL is absolute on purpose: a printed QR has to resolve from a phone that knows
    /// nothing about this deployment, so the origin comes from the `site.publicBaseUrl`
    /// setting, falling back to the host the request arrived on. Generating a QR from a
    /// laptop without that setting would encode localhost and be useless once printed.
    /// </summary>
    [HttpGet("products/{id:int}/verification")]
    public async Task<ActionResult<object>> ProductVerification(int id)
    {
        var p = await _db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new { message = "Product not found." });

        var code = await EnsureVerificationCodeAsync(p.Id);
        return Ok(new
        {
            ibn = p.Ibn,
            verificationCode = code,
            verificationCodeDisplay = VerificationCodes.ForDisplay(code),
            verifyUrl = $"{await PublicBaseUrlAsync()}/verify/{code}",
        });
    }

    /// <summary>The QR code as vector art — what a printer wants.</summary>
    [HttpGet("products/{id:int}/qr.svg")]
    public async Task<IActionResult> ProductQrSvg(int id)
    {
        var p = await _db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new { message = "Product not found." });

        var svg = QrCodeRenderer.Svg(await VerifyUrlAsync(p.Id));
        return File(Encoding.UTF8.GetBytes(svg), "image/svg+xml", $"{p.Slug}-qr.svg");
    }

    /// <summary>The QR code as a bitmap, for a quick proof or a screen.</summary>
    [HttpGet("products/{id:int}/qr.png")]
    public async Task<IActionResult> ProductQrPng(int id)
    {
        var p = await _db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new { message = "Product not found." });

        return File(QrCodeRenderer.Png(await VerifyUrlAsync(p.Id)), "image/png", $"{p.Slug}-qr.png");
    }

    /// <summary>
    /// Replaces the product's verification code. Every QR already printed with the old
    /// code stops verifying, so the request must carry the signed-in admin's password —
    /// a mis-click here is a reprint, not an undo.
    /// </summary>
    [HttpPost("products/{id:int}/verification-code")]
    public async Task<ActionResult<object>> RegenerateVerificationCode(int id, [FromBody] RegenerateVerificationCodeInput input)
    {
        var p = await _db.Products.FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new { message = "Product not found." });

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var admin = int.TryParse(userId, out var parsed) ? await _db.AdminUsers.FindAsync(parsed) : null;
        if (admin is null || !BCrypt.Net.BCrypt.Verify(input.Password ?? string.Empty, admin.PasswordHash))
            return BadRequest(new { message = "Your password is incorrect." });

        p.VerificationCode = await NewUniqueVerificationCodeAsync();
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            verificationCode = p.VerificationCode,
            verificationCodeDisplay = VerificationCodes.ForDisplay(p.VerificationCode),
            verifyUrl = $"{await PublicBaseUrlAsync()}/verify/{p.VerificationCode}",
        });
    }

    private async Task<string> VerifyUrlAsync(int productId) =>
        $"{await PublicBaseUrlAsync()}/verify/{await EnsureVerificationCodeAsync(productId)}";

    /// <summary>
    /// A product created before verification codes existed has an empty one. Mint it on
    /// first use rather than requiring a migration step, and save so the QR a staff member
    /// just printed is the one that will verify tomorrow.
    /// </summary>
    private async Task<string> EnsureVerificationCodeAsync(int productId)
    {
        var p = await _db.Products.FirstOrDefaultAsync(x => x.Id == productId)
                ?? throw new InvalidOperationException($"Product {productId} not found.");

        var existing = p.VerificationCode;
        if (existing is not null && VerificationCodes.IsWellFormed(existing)) return existing;

        p.VerificationCode = await NewUniqueVerificationCodeAsync();
        await _db.SaveChangesAsync();
        return p.VerificationCode;
    }

    private async Task<string> NewUniqueVerificationCodeAsync()
    {
        // 80 bits of entropy makes a collision implausible, but the unique index is the
        // actual guarantee; retry rather than let a 1-in-10^24 throw reach the user.
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var candidate = VerificationCodes.New();
            if (!await _db.Products.AnyAsync(x => x.VerificationCode == candidate)) return candidate;
        }
        throw new InvalidOperationException("Could not mint a unique verification code.");
    }

    private async Task<string> PublicBaseUrlAsync()
    {
        var configured = await _db.SiteSettings
            .Where(s => s.Key == "site.publicBaseUrl")
            .Select(s => s.Value)
            .FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(configured)) return configured.Trim().TrimEnd('/');
        return $"{Request.Scheme}://{Request.Host}";
    }

    // ------------------------------------------------------------------ image upload

    /// <summary>
    /// Stores an uploaded catalogue image under wwwroot/uploads and returns its public URL.
    ///
    /// Every raster upload is transcoded to WebP by <see cref="ImagePipeline"/> and
    /// is guaranteed to come back at or under 300 KB. Callers therefore never need
    /// to pre-shrink anything, and a direct POST cannot bypass the ceiling.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(24 * 1024 * 1024)]
    public Task<ActionResult<object>> Upload(IFormFile file, CancellationToken ct)
        => Store(file, ImagePipeline.Limits.Product, "uploads", ct);

    /// <summary>
    /// Stores a product photograph. A product image is framed 4:5 and shown whole, so this
    /// route accepts only exactly 1080×1350 and rejects every other size — what an editor
    /// stores is then always the dimensions the Product frame is designed for.
    ///
    /// Separate route from <see cref="Upload"/>, which stays the general catalogue-image
    /// route (collection, brand and section artwork also use it), on the same reasoning as
    /// the backdrop route: the size guarantee belongs to the route, not to a
    /// caller-supplied argument. See docs/adr/0006-product-images-are-framed-4-5.md.
    /// </summary>
    [HttpPost("upload/product")]
    [RequestSizeLimit(24 * 1024 * 1024)]
    public Task<ActionResult<object>> UploadProductPhoto(IFormFile file, CancellationToken ct)
        => Store(file, ImagePipeline.Limits.Product, "uploads", ct, ProductPhotoSize);

    /// <summary>The one accepted product-image size — 4:5, matching the Product frame.</summary>
    private static readonly (int Width, int Height) ProductPhotoSize = (1080, 1350);

    /// <summary>
    /// Stores an uploaded hero backdrop under wwwroot/uploads/backdrops.
    ///
    /// Separate route on purpose. A backdrop is shown at viewport width, so it needs a
    /// larger dimension ceiling than a product card; giving it its own route is what
    /// keeps this route's 300 KB guarantee unconditional rather than dependent on a
    /// caller-supplied argument. See docs/adr/0002-backdrop-upload-route.md.
    ///
    /// The folder deliberately sits under /uploads/ so the existing `albaik-media`
    /// runtime cache rule already covers backdrops with no PWA configuration change.
    /// </summary>
    [HttpPost("upload/backdrop")]
    [RequestSizeLimit(24 * 1024 * 1024)]
    public Task<ActionResult<object>> UploadBackdrop(IFormFile file, CancellationToken ct)
        => Store(file, ImagePipeline.Limits.Backdrop, "uploads/backdrops", ct);

    /// <summary>
    /// Stores an art-directed hero backdrop for one breakpoint.
    ///
    /// The hero banner is supplied as four compositions rather than one picture cropped
    /// four ways, so each breakpoint is uploaded to its own path and gets its own
    /// dimension ceiling. The variant is a path segment rather than a query string for
    /// the same reason the route is separate at all: the guarantee must not depend on a
    /// caller-supplied argument the caller can get wrong. See
    /// docs/adr/0002-backdrop-upload-route.md and docs/adr/0007-hero-backdrop-per-breakpoint.md.
    /// </summary>
    [HttpPost("upload/backdrop/{variant}")]
    [RequestSizeLimit(24 * 1024 * 1024)]
    public async Task<ActionResult<object>> UploadBackdropVariant(string variant, IFormFile file, CancellationToken ct)
    {
        var limits = variant.ToLowerInvariant() switch
        {
            "ultrawide" => ImagePipeline.Limits.BackdropUltrawide,
            "desktop" => ImagePipeline.Limits.BackdropDesktop,
            "tablet" => ImagePipeline.Limits.BackdropTablet,
            "mobile" => ImagePipeline.Limits.BackdropMobile,
            _ => (ImagePipeline.Limits?)null,
        };

        if (limits is null)
        {
            return BadRequest(new
            {
                message = $"Unknown backdrop variant '{variant}'. Choose ultrawide, desktop, tablet or mobile."
            });
        }

        return await Store(file, limits.Value, "uploads/backdrops", ct);
    }

    private async Task<ActionResult<object>> Store(
        IFormFile file,
        ImagePipeline.Limits limits,
        string folder,
        CancellationToken ct,
        (int Width, int Height)? exactSize = null)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "No file was uploaded." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!ImagePipeline.IsAccepted(ext))
            return BadRequest(new { message = $"Unsupported file type '{ext}'. Allowed: {ImagePipeline.DescribeAccepted()}" });

        ImageResult result;
        await using (var source = file.OpenReadStream())
            result = await _images.ProcessAsync(source, ext, limits, ct);

        if (result.Bytes.Length == 0)
            return BadRequest(new { message = "That file could not be read as an image." });

        // A raster file that failed to transcode is either corrupt or a format
        // Skia does not know. Storing it would put an unbounded file on the site,
        // so reject rather than accept something the pipeline cannot vouch for.
        if (!result.Transcoded && !IsPassthrough(ext))
            return BadRequest(new { message = $"'{file.FileName}' could not be decoded as an image. Try re-exporting it as JPEG or PNG." });

        // A route that demands one exact size (the product photograph) rejects anything
        // else here, before it is stored, so the site never receives a product image that
        // does not match the Product frame.
        if (exactSize is { } size && (result.Width != size.Width || result.Height != size.Height))
            return BadRequest(new
            {
                message = result.Width > 0 && result.Height > 0
                    ? $"Product images must be exactly {size.Width}×{size.Height} (4:5). This one is {result.Width}×{result.Height}."
                    : $"Product images must be exactly {size.Width}×{size.Height} (4:5), and this file's dimensions could not be read."
            });

        if (result.ExceedsCeiling(limits.MaxBytes))
            return BadRequest(new
            {
                message = $"'{file.FileName}' is {result.Bytes.Length / 1024} KB and could not be brought under "
                          + $"{limits.MaxBytes / 1024} KB. Please supply a smaller image."
            });

        var root = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(root, folder);
        Directory.CreateDirectory(dir);

        var name = $"{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid().ToString("N")[..6]}{result.Extension}";
        var full = Path.Combine(dir, name);

        await System.IO.File.WriteAllBytesAsync(full, result.Bytes, ct);

        return Ok(new
        {
            url = $"/{folder}/{name}",
            fileName = name,
            size = result.Bytes.LongLength,
            width = result.Width,
            height = result.Height,
            quality = result.Quality,
            // Lets the editor tell the admin what actually happened, e.g.
            // "2.1 MB -> 148 KB".
            originalSize = result.OriginalBytes,
            transcoded = result.Transcoded,
            ceiling = limits.MaxBytes
        });
    }

    private static bool IsPassthrough(string ext) =>
        ext is ".svg" or ".gif";

    // ------------------------------------------------------------------ helpers

    private static void Apply(Category c, CategoryInput i)
    {
        c.Name = i.Name.Trim();
        c.NameDari = i.NameDari; c.NamePashto = i.NamePashto;
        c.Tagline = i.Tagline; c.Description = i.Description;
        // Same rule as a brand's artwork: blank has to be stored as nothing, because the
        // collection hero reads "no backdrop" from truthiness and "   " is truthy.
        c.ImageUrl = NullIfBlank(i.ImageUrl);
        c.Icon = i.Icon; c.Accent = i.Accent;
        c.SortOrder = i.SortOrder; c.IsActive = i.IsActive; c.ShowInNav = i.ShowInNav;
    }

    private static void Apply(Brand b, BrandInput i)
    {
        b.Name = i.Name.Trim();
        b.CategoryId = i.CategoryId;
        b.Tagline = i.Tagline; b.Description = i.Description;
        // Artwork is free text and the brand page decides "no banner" from truthiness, so
        // a value made only of spaces has to be stored as nothing. Kept verbatim it would
        // sail past that guard and ask the browser for a photograph that cannot exist.
        b.LogoUrl = NullIfBlank(i.LogoUrl); b.ImageUrl = NullIfBlank(i.ImageUrl);
        b.Accent = i.Accent;
        b.SortOrder = i.SortOrder; b.IsActive = i.IsActive; b.IsFeatured = i.IsFeatured;
    }

    private static string? NullIfBlank(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Apply(Product p, ProductInput i)
    {
        p.Name = i.Name.Trim();
        p.CategoryId = i.CategoryId;
        p.BrandId = i.BrandId;
        p.Subtitle = i.Subtitle; p.FormulationLabel = i.FormulationLabel;
        p.ShortDescription = i.ShortDescription; p.Description = i.Description;
        p.Size = i.Size; p.Price = i.Price; p.CompareAtPrice = i.CompareAtPrice;
        p.Currency = string.IsNullOrWhiteSpace(i.Currency) ? "AFN" : i.Currency;
        p.PriceNote = i.PriceNote;
        p.Rating = i.Rating; p.ReviewCount = i.ReviewCount;
        p.Badge = i.Badge; p.BadgeStyle = i.BadgeStyle;
        p.StockStatus = i.StockStatus; p.ImageUrl = i.ImageUrl;
        p.Ibn = string.IsNullOrWhiteSpace(i.Ibn) ? null : i.Ibn.Trim();
        p.AccentFrom = i.AccentFrom; p.AccentTo = i.AccentTo;
        p.Benefits = i.Benefits.Where(b => !string.IsNullOrWhiteSpace(b)).Select(b => b.Trim()).ToList();
        p.Ingredients = i.Ingredients.Where(b => !string.IsNullOrWhiteSpace(b)).Select(b => b.Trim()).ToList();
        p.HowToUse = i.HowToUse; p.SafetyNote = i.SafetyNote; p.SuitableFor = i.SuitableFor;
        p.IsFeatured = i.IsFeatured; p.IsActive = i.IsActive; p.SortOrder = i.SortOrder;
    }

    private async Task<string?> Validate(ProductInput i, int? productId = null)
    {
        if (string.IsNullOrWhiteSpace(i.Name)) return "Name is required.";
        if (!await _db.Categories.AnyAsync(c => c.Id == i.CategoryId)) return "Select a valid category.";
        var brand = await _db.Brands.FirstOrDefaultAsync(b => b.Id == i.BrandId);
        if (brand is null) return "Select a valid brand.";
        if (brand.CategoryId != i.CategoryId) return "The selected brand does not belong to the selected category.";

        // The IBN is a plain number with no format of its own, but two products sharing
        // one makes it useless for telling them apart — which is the whole reason it is
        // printed on the page.
        var ibn = i.Ibn?.Trim();
        if (!string.IsNullOrEmpty(ibn))
        {
            if (!ibn.All(char.IsAsciiDigit)) return "The IBN must contain digits only.";
            if (await _db.Products.AnyAsync(p => p.Ibn == ibn && (productId == null || p.Id != productId)))
                return "Another product already uses that IBN.";
        }

        return null;
    }

    private async Task<string> UniqueCategorySlug(string slug, int? exceptId = null)
        => await UniqueSlug(slug, s => _db.Categories.AnyAsync(c => c.Slug == s && (exceptId == null || c.Id != exceptId)));

    private async Task<string> UniqueBrandSlug(int categoryId, string slug, int? exceptId = null)
        => await UniqueSlug(slug, s => _db.Brands.AnyAsync(b => b.Slug == s && b.CategoryId == categoryId && (exceptId == null || b.Id != exceptId)));

    private async Task<string> UniqueProductSlug(string slug, int? exceptId = null)
        => await UniqueSlug(slug, s => _db.Products.AnyAsync(p => p.Slug == s && (exceptId == null || p.Id != exceptId)));

    private static async Task<string> UniqueSlug(string slug, Func<string, Task<bool>> taken)
    {
        if (!await taken(slug)) return slug;
        for (var n = 2; n < 500; n++)
        {
            var candidate = $"{slug}-{n}";
            if (!await taken(candidate)) return candidate;
        }
        return $"{slug}-{Guid.NewGuid().ToString("N")[..6]}";
    }
}
