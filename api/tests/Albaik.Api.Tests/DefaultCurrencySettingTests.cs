using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 08 — the configured default currency drives what a new product starts with and
/// the fallback used to format a price that carries no currency of its own, so the setting
/// stops being inert. Both are painted in the frontend, which has no test harness; what can
/// be pinned here is the premise the painting rests on: the field exists to be edited, and
/// what staff save is what the site is served.
/// </summary>
public class DefaultCurrencySettingTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public DefaultCurrencySettingTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task DefaultCurrencySavedInDashboard_IsServedOnBootstrap()
    {
        using var admin = _factory.AdminClient();
        var settings = await admin.GetFromJsonAsync<List<SiteSettingDto>>("/api/admin/settings");
        Assert.NotNull(settings);

        // Without the row there is no field on the Settings screen at all, and the editor
        // and the formatter would quietly keep their built-in AFN whatever staff intend.
        // It also has to be a labelled text row: the screen files rows by group, and a row
        // with neither would be published but uneditable.
        var row = settings!.FirstOrDefault(s => s.Key == "catalog.currency");
        Assert.NotNull(row);
        Assert.Equal("text", row!.InputType);
        Assert.False(string.IsNullOrWhiteSpace(row.Group));
        Assert.False(string.IsNullOrWhiteSpace(row.Label));

        var save = await admin.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { row with { Value = "USD" } } });
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);

        using var site = _factory.CreateClient();
        var bootstrap = await site.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        Assert.NotNull(bootstrap);
        Assert.Equal(
            "USD",
            bootstrap!.Settings.Single(s => s.Key == "catalog.currency").Value);

        // Put the seeded currency back, so the next test in this class starts where the
        // seeder left it.
        var restore = await admin.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { row } });
        Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
    }
}
