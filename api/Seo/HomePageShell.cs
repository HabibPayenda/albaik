using System.Collections.Generic;
using System.Net;
using System.Text;
using System.Text.Json;
using Albaik.Api.Data;
using Albaik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Seo;

/// <summary>
/// Turns the home page's database rows into one <see cref="SeoPage"/>.
///
/// The queries mirror <c>GET /api/home</c> - the payload the SPA renders - so the shell's
/// crawlable content is the same content a visitor sees once React takes over. It is a
/// subset of the visible page (never extra claims or products), which is what keeps the
/// response free of cloaking.
/// </summary>
public static class HomePageShell
{
    private const string OpenGraphImagePath = "/pwa-512.png";
    private const int OpenGraphImageSize = 512;

    public static async Task<SeoPage> BuildAsync(
        AppDbContext db, SiteSettingsSnapshot site, CancellationToken ct)
    {
        var sections = await db.HomeSections.AsNoTracking()
            .Where(s => s.IsVisible)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);

        var categories = await db.Categories.AsNoTracking()
            .Include(c => c.Brands)
            .Include(c => c.Products)
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync(ct);

        var featured = await db.Products.AsNoTracking()
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .Where(p => p.IsActive && p.IsFeatured)
            .OrderBy(p => p.SortOrder)
            .Take(6)
            .ToListAsync(ct);

        if (featured.Count == 0)
        {
            featured = await db.Products.AsNoTracking()
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Where(p => p.IsActive)
                .OrderBy(p => p.SortOrder)
                .Take(3)
                .ToListAsync(ct);
        }

        var canonicalUrl = SeoUrl.Absolute(site.BaseUrl, "/");
        var imageUrl = SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath);
        var description = SeoText.ClampDescription(site.Description);
        if (description.Length == 0) description = site.Tagline;

        return new SeoPage(
            SeoPageType.Home,
            200,
            "/",
            canonicalUrl,
            $"{site.Name} — {site.Tagline}",
            description,
            site.Name,
            "website",
            imageUrl,
            OpenGraphImageSize,
            OpenGraphImageSize,
            site.Name,
            BuildStructuredData(site),
            BuildContentHtml(site, sections, categories, featured));
    }

    private static string BuildContentHtml(
        SiteSettingsSnapshot site,
        List<HomeSection> sections,
        List<Category> categories,
        List<Product> featured)
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"seo-home\">");

        var heroSection = sections.FirstOrDefault(s => s.SectionType == "hero");
        if (heroSection is not null)
        {
            var hero = ReadHero(heroSection, site);
            sb.Append("<header class=\"seo-hero\">");

            var headline = JoinHeadline(hero.Title, hero.Accent);
            if (headline.Length > 0)
                sb.Append("<h1>").Append(Html(headline)).Append("</h1>");

            if (!string.IsNullOrWhiteSpace(hero.Body))
                sb.Append("<p>").Append(Html(hero.Body)).Append("</p>");

            if (!string.IsNullOrWhiteSpace(site.Tagline))
                sb.Append("<p class=\"seo-tagline\">").Append(Html(site.Tagline)).Append("</p>");

            AppendCta(sb, hero.PrimaryLabel, hero.PrimaryHref);
            AppendCta(sb, hero.SecondaryLabel, hero.SecondaryHref);
            sb.Append("</header>");
        }

        var collectionsSection = sections.FirstOrDefault(s => s.SectionType == "collections");
        if (collectionsSection is not null && categories.Count > 0)
        {
            sb.Append("<section class=\"seo-collections\">");
            AppendSectionHeading(sb, collectionsSection);

            foreach (var category in categories)
            {
                sb.Append("<article>");
                sb.Append("<h3><a href=\"")
                    .Append(Html(SafeHref($"/collections/{category.Slug}")))
                    .Append("\">")
                    .Append(Html(category.Name))
                    .Append("</a></h3>");

                if (!string.IsNullOrWhiteSpace(category.Tagline))
                    sb.Append("<p>").Append(Html(category.Tagline)).Append("</p>");

                sb.Append("<p>").Append(Plural(category.Products.Count, "product")).Append("</p>");

                var brands = category.Brands
                    .Where(b => b.IsActive)
                    .OrderBy(b => b.SortOrder)
                    .Take(4)
                    .ToList();
                if (brands.Count > 0)
                {
                    sb.Append("<ul>");
                    foreach (var brand in brands)
                    {
                        sb.Append("<li><a href=\"")
                            .Append(Html(SafeHref($"/collections/{category.Slug}/{brand.Slug}")))
                            .Append("\">")
                            .Append(Html(brand.Name))
                            .Append("</a></li>");
                    }
                    sb.Append("</ul>");
                }

                sb.Append("<a href=\"")
                    .Append(Html(SafeHref($"/collections/{category.Slug}")))
                    .Append("\">Browse ")
                    .Append(Html(category.Name))
                    .Append("</a>");
                sb.Append("</article>");
            }

            sb.Append("</section>");
        }

        var featuredSection = sections.FirstOrDefault(s => s.SectionType == "featured-products");
        if (featuredSection is not null && featured.Count > 0)
        {
            sb.Append("<section class=\"seo-featured-products\">");
            AppendSectionHeading(sb, featuredSection);

            foreach (var product in featured)
            {
                sb.Append("<article>");
                sb.Append("<h3><a href=\"")
                    .Append(Html(SafeHref($"/products/{product.Slug}")))
                    .Append("\">")
                    .Append(Html(product.Name))
                    .Append("</a></h3>");

                var label = product.FormulationLabel ?? product.Brand?.Name ?? product.Category?.Name;
                if (!string.IsNullOrWhiteSpace(label))
                    sb.Append("<p>").Append(Html(label)).Append("</p>");

                if (!string.IsNullOrWhiteSpace(product.Size))
                    sb.Append("<p>").Append(Html(product.Size)).Append("</p>");
                sb.Append("</article>");
            }

            AppendCta(sb, featuredSection.PrimaryCtaLabel, featuredSection.PrimaryCtaHref);
            sb.Append("</section>");
        }

        sb.Append("</div>");
        return sb.ToString();
    }

    private static void AppendSectionHeading(StringBuilder sb, HomeSection section)
    {
        if (!string.IsNullOrWhiteSpace(section.Eyebrow))
            sb.Append("<p class=\"seo-eyebrow\">").Append(Html(section.Eyebrow)).Append("</p>");
        if (!string.IsNullOrWhiteSpace(section.Title))
            sb.Append("<h2>").Append(Html(section.Title)).Append("</h2>");
        if (!string.IsNullOrWhiteSpace(section.Subtitle))
            sb.Append("<p>").Append(Html(section.Subtitle)).Append("</p>");
    }

    private static void AppendCta(StringBuilder sb, string? label, string? href)
    {
        if (string.IsNullOrWhiteSpace(label) || string.IsNullOrWhiteSpace(href)) return;
        sb.Append("<a href=\"")
            .Append(Html(SafeHref(href)))
            .Append("\">")
            .Append(Html(label))
            .Append("</a>");
    }

    private static HeroCopy ReadHero(HomeSection section, SiteSettingsSnapshot site)
    {
        var slide = FirstSlide(section.SlidesJson);
        if (slide is not null)
        {
            return new HeroCopy(
                JsonString(slide, "title"),
                JsonString(slide, "accentWord"),
                JsonString(slide, "body"),
                JsonString(slide, "primaryCtaLabel"),
                JsonString(slide, "primaryCtaHref"),
                JsonString(slide, "secondaryCtaLabel"),
                JsonString(slide, "secondaryCtaHref"));
        }

        var data = ParseJson(section.DataJson);
        return new HeroCopy(
            NonBlank(section.Title) ?? "The Mark of",
            NonBlank(JsonString(data, "accentWord")) ?? "Pure Perfection.",
            NonBlank(section.Body) ?? site.Description,
            NonBlank(section.PrimaryCtaLabel) ?? "Explore the Collections",
            NonBlank(section.PrimaryCtaHref) ?? "/collections",
            NonBlank(section.SecondaryCtaLabel) ?? "Our Product Approach",
            NonBlank(section.SecondaryCtaHref) ?? "/about");
    }

    private static object BuildStructuredData(SiteSettingsSnapshot site)
    {
        var rootUrl = SeoUrl.Absolute(site.BaseUrl, "/");
        var organization = new Dictionary<string, object?>
        {
            ["@type"] = "Organization",
            ["@id"] = rootUrl + "#organization",
            ["name"] = site.Name,
            ["url"] = rootUrl,
            ["logo"] = SeoUrl.Absolute(site.BaseUrl, OpenGraphImagePath),
        };

        if (site.Phone is not null || site.ContactEmail is not null)
        {
            var contactPoint = new Dictionary<string, object?>
            {
                ["@type"] = "ContactPoint",
                ["contactType"] = "customer service",
            };
            if (site.Phone is not null) contactPoint["telephone"] = site.Phone;
            if (site.ContactEmail is not null) contactPoint["email"] = site.ContactEmail;
            organization["contactPoint"] = contactPoint;
        }

        if (site.Address is not null) organization["address"] = site.Address;
        if (site.SameAs.Count > 0) organization["sameAs"] = site.SameAs;

        var website = new Dictionary<string, object?>
        {
            ["@type"] = "WebSite",
            ["@id"] = rootUrl + "#website",
            ["name"] = site.Name,
            ["url"] = rootUrl,
        };

        return new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@graph"] = new object[] { organization, website },
        };
    }

    private static string JoinHeadline(string? title, string? accent)
    {
        var parts = new[] { title, accent }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Select(part => part!.Trim())
            .ToList();
        return string.Join(" ", parts);
    }

    private static string Plural(int count, string singular) =>
        $"{count} {singular}{(count == 1 ? string.Empty : "s")}";

    private static string Html(string value) => WebUtility.HtmlEncode(value);

    private static string SafeHref(string href)
    {
        var value = href.Trim();
        if (value.Length == 0) return "#";
        if (value.StartsWith('/') || value.StartsWith('#')) return value;
        if (Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
            uri.Scheme is "http" or "https" or "mailto" or "tel")
            return value;
        return "#";
    }

    private static string? NonBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record HeroCopy(
        string? Title,
        string? Accent,
        string? Body,
        string? PrimaryLabel,
        string? PrimaryHref,
        string? SecondaryLabel,
        string? SecondaryHref);

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static JsonElement? FirstSlide(string? slidesJson)
    {
        var root = ParseJson(slidesJson);
        if (root is null) return null;
        var value = root.Value;
        if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() == 0) return null;
        return value[0];
    }

    private static string? JsonString(JsonElement? element, string name)
    {
        if (element is null) return null;
        var value = element.Value;
        if (value.ValueKind != JsonValueKind.Object) return null;
        if (!value.TryGetProperty(name, out var property)) return null;
        return property.ValueKind == JsonValueKind.String ? property.GetString() : null;
    }
}
