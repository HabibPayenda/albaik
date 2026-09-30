using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 06 — a navigation or footer link flagged "open in a new tab". The header and
/// the footer read both lists from the bootstrap payload, so the flag has to survive the
/// trip from the Menus &amp; footer screen to `/api/bootstrap`. What the frontend then
/// decides — an absolute address leaves in a new tab, an internal route keeps the site's
/// client-side navigation, an unflagged link is untouched — is a frontend rule and has
/// no harness to sit in, so only the data path can be pinned here.
/// </summary>
public class OpenInNewTabTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public OpenInNewTabTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task FlagSavedOnNavLink_IsServedOnBootstrap()
    {
        using var admin = _factory.AdminClient();
        var target = await FlagNavAsync(admin);

        using var site = _factory.CreateClient();
        var bootstrap = await site.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        Assert.NotNull(bootstrap);
        Assert.True(bootstrap!.Nav.Single(n => n.Id == target.Id).OpenInNewTab);
    }

    [Fact]
    public async Task FlagSavedOnFooterLink_IsServedOnBootstrap()
    {
        using var admin = _factory.AdminClient();
        var target = await FlagFooterAsync(admin);

        using var site = _factory.CreateClient();
        var bootstrap = await site.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        Assert.NotNull(bootstrap);
        Assert.True(bootstrap!.Footer.Single(f => f.Id == target.Id).OpenInNewTab);
    }

    private static async Task<NavLinkDto> FlagNavAsync(HttpClient admin)
    {
        // Bootstrap publishes active links only, so write to a link it will publish.
        var links = await admin.GetFromJsonAsync<List<NavLinkDto>>("/api/admin/nav-links");
        Assert.NotNull(links);
        var candidates = links!.Where(n => n.IsActive).ToList();
        Assert.NotEmpty(candidates);
        var target = candidates[0];

        var update = await admin.PutAsJsonAsync($"/api/admin/nav-links/{target.Id}", new
        {
            label = target.Label,
            path = target.Path,
            group = target.Group,
            openInNewTab = true,
            sortOrder = target.SortOrder,
            isActive = target.IsActive,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        return target;
    }

    private static async Task<FooterLinkDto> FlagFooterAsync(HttpClient admin)
    {
        var links = await admin.GetFromJsonAsync<List<FooterLinkDto>>("/api/admin/footer-links");
        Assert.NotNull(links);
        var candidates = links!.Where(f => f.IsActive).ToList();
        Assert.NotEmpty(candidates);
        var target = candidates[0];

        var update = await admin.PutAsJsonAsync($"/api/admin/footer-links/{target.Id}", new
        {
            group = target.Group,
            label = target.Label,
            path = target.Path,
            openInNewTab = true,
            sortOrder = target.SortOrder,
            isActive = target.IsActive,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        return target;
    }
}
