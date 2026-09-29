using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 06 — a trust pillar's icon is chosen in the dashboard and the public approach
/// section renders it from data, instead of a fixed icon mapping in code. The rendering
/// itself lives in the frontend, which has no test harness; these tests pin the API
/// contract that rendering depends on, end to end:
///
///   * every seeded pillar carries a non-empty icon, so a freshly deployed site always
///     has a glyph to draw (the frontend still guards against a blank value for rows
///     saved before the contract existed);
///   * an icon picked in the dashboard is what the public home payload serves, with no
///     redeploy.
/// </summary>
public class PillarIconTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public PillarIconTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task HomePayload_SeededPillarsAllCarryAnIcon()
    {
        using var client = _factory.CreateClient();
        var home = await client.GetFromJsonAsync<HomePayloadDto>("/api/home");

        Assert.NotNull(home);
        Assert.NotEmpty(home!.TrustPillars);
        Assert.All(home.TrustPillars, pillar => Assert.False(string.IsNullOrWhiteSpace(pillar.Icon)));
    }

    [Fact]
    public async Task PillarIcon_PickedInDashboard_IsServedToThePublicHome()
    {
        using var admin = _factory.AdminClient();
        var pillars = await admin.GetFromJsonAsync<List<TrustPillarDto>>("/api/admin/trust-pillars");
        Assert.NotNull(pillars);
        var pillar = pillars!.First(t => t.IsActive);

        const string chosen = "science";
        var update = await admin.PutAsJsonAsync($"/api/admin/trust-pillars/{pillar.Id}", new
        {
            icon = chosen,
            title = pillar.Title,
            subtitle = pillar.Subtitle,
            accent = pillar.Accent,
            sortOrder = pillar.SortOrder,
            isActive = true,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        using var publicClient = _factory.CreateClient();
        var home = await publicClient.GetFromJsonAsync<HomePayloadDto>("/api/home");
        var served = home!.TrustPillars.FirstOrDefault(t => t.Id == pillar.Id);

        Assert.NotNull(served);
        Assert.Equal(chosen, served!.Icon);
    }
}
