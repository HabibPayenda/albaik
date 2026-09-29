using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The dashboard reorder seam: PUT /api/admin/reorder takes a collection name and an
/// ordered id list, reassigns the rows' positions, and the next public payload reflects
/// the new order without any redeploy.
///
/// Each test drives a different collection so the shared seeded database keeps the
/// scenarios independent.
/// </summary>
public class ReorderEndpointTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public ReorderEndpointTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Reorder_ReassignsPositionsInAdminList()
    {
        using var client = _factory.AdminClient();

        var before = await client.GetFromJsonAsync<List<TestimonialDto>>("/api/admin/testimonials");
        Assert.NotNull(before);
        Assert.True(before.Count >= 3);
        var ordered = before.Select(t => t.Id).ToList();
        var reversed = Enumerable.Reverse(ordered).ToList();

        var response = await client.PutAsJsonAsync(
            "/api/admin/reorder", new { resource = "testimonials", ids = reversed });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var after = await client.GetFromJsonAsync<List<TestimonialDto>>("/api/admin/testimonials");
        Assert.Equal(reversed, after!.Select(t => t.Id).ToList());
    }

    [Fact]
    public async Task Reorder_Categories_ReflectedOnHomeImmediately()
    {
        using var client = _factory.AdminClient();

        var before = await client.GetFromJsonAsync<HomePayloadDto>("/api/home");
        var ordered = before!.Categories.Select(c => c.Id).ToList();
        var reversed = Enumerable.Reverse(ordered).ToList();

        var response = await client.PutAsJsonAsync(
            "/api/admin/reorder", new { resource = "categories", ids = reversed });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var after = await client.GetFromJsonAsync<HomePayloadDto>("/api/home");
        Assert.Equal(reversed, after!.Categories.Select(c => c.Id).ToList());
    }

    [Fact]
    public async Task Reorder_NavLinks_ReflectedOnBootstrapImmediately()
    {
        using var client = _factory.AdminClient();

        var before = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");
        var ordered = before!.Nav.Select(n => n.Id).ToList();
        var reversed = Enumerable.Reverse(ordered).ToList();

        var response = await client.PutAsJsonAsync(
            "/api/admin/reorder", new { resource = "nav-links", ids = reversed });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var after = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");
        Assert.Equal(reversed, after!.Nav.Select(n => n.Id).ToList());
    }

    [Fact]
    public async Task Reorder_UnknownCollection_Returns404()
    {
        using var client = _factory.AdminClient();

        var response = await client.PutAsJsonAsync(
            "/api/admin/reorder", new { resource = "does-not-exist", ids = new[] { 1 } });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Reorder_EmptyIdList_Returns400()
    {
        using var client = _factory.AdminClient();

        var response = await client.PutAsJsonAsync(
            "/api/admin/reorder", new { resource = "testimonials", ids = Array.Empty<int>() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}