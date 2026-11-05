using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Albaik.Api.Dtos;
using MySqlConnector;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The search-overlay suggestion chips seam: a `search.suggestions` site setting (a JSON
/// array of label/query pairs) instead of hardcoded chips in the frontend. The API owns
/// the shape — it seeds the defaults, serves them in bootstrap, and rejects malformed
/// values on save so the overlay's fallback never has to paper over a corrupted value
/// without staff knowing.
///
/// The class shares one seeded database, so every test that mutates the setting restores
/// the exact seeded value before returning — read-only assertions therefore never depend
/// on which test ran first. The upgrade test boots its own database file.
/// </summary>
public class SearchSuggestionsSettingTests : IClassFixture<AlbaikApiFactory>
{
    private const string Key = "search.suggestions";
    private const string Group = "search";
    private const string Label = "Search suggestion chips";
    private const string InputType = "json";

    /// <summary>Must stay in lock-step with the seeder's top-up value, or the public contract drift test fails.</summary>
    private const string DefaultSuggestions =
        """[{"label":"Anti-dandruff care","query":"dandruff"},{"label":"Post-oil cleansing","query":"purify"},{"label":"Repair & nourish","query":"repair"},{"label":"Face wash","query":"face"},{"label":"Avora Shine","query":"avora"}]""";

    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    private readonly AlbaikApiFactory _factory;
    public SearchSuggestionsSettingTests(AlbaikApiFactory factory) => _factory = factory;

    private static List<SearchChipDto>? Parse(string? value) =>
        JsonSerializer.Deserialize<List<SearchChipDto>>(value ?? "", WebJson);

    [Fact]
    public async Task Bootstrap_ServesSeededSearchSuggestions()
    {
        using var client = _factory.CreateClient();
        var bootstrap = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        var row = bootstrap!.Settings.FirstOrDefault(s => s.Key == Key);
        Assert.NotNull(row);
        Assert.Equal(InputType, row!.InputType);

        Assert.Equal(new[]
        {
            new SearchChipDto("Anti-dandruff care", "dandruff"),
            new SearchChipDto("Post-oil cleansing", "purify"),
            new SearchChipDto("Repair & nourish", "repair"),
            new SearchChipDto("Face wash", "face"),
            new SearchChipDto("Avora Shine", "avora"),
        }, Parse(row.Value));
    }

    [Fact]
    public async Task UpdateSettings_RejectsMalformedJson()
    {
        using var client = _factory.AdminClient();

        async Task<HttpResponseMessage> Save(string? value) => await client.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { new SiteSettingDto(Key, value, Group, Label, InputType, 0) } });

        Assert.Equal(HttpStatusCode.BadRequest, (await Save("not-json")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Save("""{"label":"Only one","query":"x"}""")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Save("""[{"label":"","query":"x"}]""")).StatusCode);
        // Blank stays legal: it is the explicit signal for "use the bundled fallback".
        Assert.Equal(HttpStatusCode.OK, (await Save(null)).StatusCode);

        await RestoreDefaults(client);
    }

    [Fact]
    public async Task UpdateSettings_SaveReload_RoundTrips()
    {
        using var client = _factory.AdminClient();
        var replacement =
            """[{"label":"Scalp care","query":"scalp"},{"label":"Volume","query":"volume"}]""";

        var save = await client.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { new SiteSettingDto(Key, replacement, Group, Label, InputType, 0) } });
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);

        var bootstrap = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");
        var row = bootstrap!.Settings.First(s => s.Key == Key);
        Assert.Equal(new[]
        {
            new SearchChipDto("Scalp care", "scalp"),
            new SearchChipDto("Volume", "volume"),
        }, Parse(row.Value));

        await RestoreDefaults(client);
    }

    [Fact]
    public async Task UpdateSettings_AllowsExplicitEmptyList()
    {
        using var client = _factory.AdminClient();

        var empty = await client.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { new SiteSettingDto(Key, "[]", Group, Label, InputType, 0) } });
        Assert.Equal(HttpStatusCode.OK, empty.StatusCode);

        var bootstrap = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");
        Assert.Empty(Parse(bootstrap!.Settings.First(s => s.Key == Key).Value)!);

        await RestoreDefaults(client);
    }

    [Fact]
    public async Task UpdateSettings_DoesNotChipValidateOtherJsonRows()
    {
        // `icons.disabled` is also JSON-typed but holds an array of strings, so the chip
        // validation must be scoped to the search setting — otherwise saving the System
        // tab fails on every edit of a non-chip JSON row.
        var databaseName = $"albaik_upgrade_icons_{Guid.NewGuid():N}";
        using (var first = AlbaikApiFactory.ForUpgradeScenario(databaseName, keepDatabaseForFirstBoot: true))
        using (var client = first.CreateClient())
        {
            (await client.GetAsync("/api/home")).EnsureSuccessStatusCode();
        }

        using var factory = AlbaikApiFactory.ForUpgradeScenario(databaseName, keepDatabaseForFirstBoot: false);
        using var admin = factory.AdminClient();
        var row = new SiteSettingDto("icons.disabled", """["droplet","leaf"]""", "system", "Disabled icons", "json", 0);

        var create = await admin.PutAsJsonAsync("/api/admin/settings", new SettingsInput { Settings = new() { row } });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var update = await admin.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { row with { Value = """["droplet","shield"]""" } } });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
    }

    [Fact]
    public async Task UpgradedDatabase_GainsSearchSuggestionsSetting()
    {
        // Simulate a deployment that predates the setting: boot once to produce a real
        // seeded database, then remove the row. Reboot must top it back up, or the Search
        // tab would be missing from the settings screen and the overlay would silently run
        // on its bundled chips forever.
        var databaseName = $"albaik_upgrade_search_{Guid.NewGuid():N}";
        string connectionString;
        using (var first = AlbaikApiFactory.ForUpgradeScenario(databaseName, keepDatabaseForFirstBoot: true))
        using (var client = first.CreateClient())
        {
            connectionString = first.ConnectionString;
            (await client.GetAsync("/api/home")).EnsureSuccessStatusCode();
        }

        await using (var connection = new MySqlConnection(connectionString))
        {
            await connection.OpenAsync();
            await using var del = connection.CreateCommand();
            del.CommandText = "DELETE FROM `SiteSettings` WHERE `Key` = @key";
            del.Parameters.AddWithValue("@key", Key);
            await del.ExecuteNonQueryAsync();
        }

        using var factory = AlbaikApiFactory.ForUpgradeScenario(databaseName, keepDatabaseForFirstBoot: false);
        using var booted = factory.AdminClient();
        var settings = await booted.GetFromJsonAsync<List<SiteSettingDto>>("/api/admin/settings");

        var row = settings!.FirstOrDefault(s => s.Key == Key);
        Assert.NotNull(row);
        Assert.Equal(InputType, row!.InputType);
        Assert.NotEmpty(Parse(row.Value)!);
    }

    private async Task RestoreDefaults(HttpClient client)
    {
        var restore = await client.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { new SiteSettingDto(Key, DefaultSuggestions, Group, Label, InputType, 0) } });
        restore.EnsureSuccessStatusCode();
    }
}