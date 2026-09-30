using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 07 — the Product plate's wordmark is the site's configured short name rather
/// than text fixed in the source, and the built-in wordmark stands in when the setting
/// is cleared. The plate is painted in the frontend, which has no test harness, so what
/// can be pinned here is the premise the painting rests on: the field exists to be
/// edited, and what staff save is what the site is served.
/// </summary>
public class ShortNameSettingTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public ShortNameSettingTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task ShortNameSavedInDashboard_IsServedOnBootstrap()
    {
        using var admin = _factory.AdminClient();
        var settings = await admin.GetFromJsonAsync<List<SiteSettingDto>>("/api/admin/settings");
        Assert.NotNull(settings);

        // Without the row there is no field on the Settings screen at all, and the plate
        // would silently keep the built-in wordmark no matter what staff try to save. It
        // also has to be a labelled text row: the screen files rows by group, and a row
        // with neither would be published but uneditable.
        var row = settings!.FirstOrDefault(s => s.Key == "site.shortName");
        Assert.NotNull(row);
        Assert.Equal("text", row!.InputType);
        Assert.False(string.IsNullOrWhiteSpace(row.Group));
        Assert.False(string.IsNullOrWhiteSpace(row.Label));

        var save = await admin.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { row with { Value = "ALBAIK TEST" } } });
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);

        using var site = _factory.CreateClient();
        var bootstrap = await site.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        Assert.NotNull(bootstrap);
        Assert.Equal(
            "ALBAIK TEST",
            bootstrap!.Settings.Single(s => s.Key == "site.shortName").Value);

        // Put the seeded wordmark back, so the next test in this class starts where the
        // seeder left it.
        var restore = await admin.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { row } });
        Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
    }
}
