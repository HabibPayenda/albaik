using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 05 — the guided-selection panel shows a profile's metric value as its headline
/// statistic with the metric label beneath it, and falls back to naming the match when
/// staff left the value blank, which is the promise the dashboard's own banner makes. The
/// painting lives in the frontend, which has no test harness, so these tests pin the
/// contract it reads: the figure saved in the dashboard arrives on the home payload the
/// panel is built from.
/// </summary>
public class HairProfileMetricTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public HairProfileMetricTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task MetricSavedInDashboard_IsServedOnTheHomePayload()
    {
        using var admin = _factory.AdminClient();
        var profiles = await admin.GetFromJsonAsync<List<HairProfileDto>>("/api/admin/hair-profiles");
        Assert.NotNull(profiles);

        // The home payload carries active profiles only, so write to one it will publish.
        var candidates = profiles!.Where(p => p.IsActive).ToList();
        Assert.NotEmpty(candidates);
        var target = candidates[0];

        var update = await admin.PutAsJsonAsync($"/api/admin/hair-profiles/{target.Id}", new
        {
            key = target.Key,
            icon = target.Icon,
            title = target.Title,
            badge = target.Badge,
            badgeStyle = target.BadgeStyle,
            description = target.Description,
            metricValue = "95%",
            metricLabel = "fewer broken strands",
            sortOrder = target.SortOrder,
            isActive = target.IsActive,
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        using var site = _factory.CreateClient();
        // The route the home page fetches (`endpoints.home`).
        var home = await site.GetFromJsonAsync<HomePayloadDto>("/api/home");

        Assert.NotNull(home);
        var served = Assert.Single(home!.HairProfiles, p => p.Key == target.Key);
        Assert.Equal("95%", served.MetricValue);
        Assert.Equal("fewer broken strands", served.MetricLabel);
    }
}
