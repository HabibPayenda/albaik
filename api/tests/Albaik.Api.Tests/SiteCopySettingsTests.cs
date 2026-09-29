using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Microsoft.Data.Sqlite;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 05 — the site-owned copy (product tab labels, the "All formulas" filter chip
/// and the contact-form labels) lives in dashboard-editable settings. The API's job is
/// to seed those rows with the exact current text and to serve them, so a pre-deployment
/// database that predates the settings gains them without a reseed. Empty values keep
/// meaning "use the built-in text" — that behaviour lives in the frontend, which falls
/// back when a value is blank; these tests pin the seeded contract the fallback
/// defaults must match, and the drift behaviour.
/// </summary>
public class SiteCopySettingsTests : IClassFixture<AlbaikApiFactory>
{
    private const string Group = "labels";

    /// <summary>Must stay in lock-step with the seeder's top-up value.</summary>
    private static readonly (string Key, string Value)[] Defaults =
    [
        ("labels.productTab.benefits", "Key benefits"),
        ("labels.productTab.usage", "How to use"),
        ("labels.productTab.safety", "Safety"),
        ("labels.featured.allFormulas", "All formulas"),
        ("labels.contact.fullName", "Full name"),
        ("labels.contact.email", "Email address"),
        ("labels.contact.phone", "Phone / WhatsApp"),
        ("labels.contact.company", "Company / shop"),
        ("labels.contact.enquiryType", "Enquiry type"),
        ("labels.contact.subject", "Subject"),
        ("labels.contact.message", "Message"),
        ("labels.contact.submit", "Send message"),
    ];

    private readonly AlbaikApiFactory _factory;
    public SiteCopySettingsTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Bootstrap_ServesSeededCopyLabels()
    {
        using var client = _factory.CreateClient();
        var bootstrap = await client.GetFromJsonAsync<SiteBootstrapDto>("/api/bootstrap");

        var rows = bootstrap!.Settings.Where(s => s.Key.StartsWith("labels.")).ToList();
        Assert.Equal(Defaults.Length, rows.Count);

        foreach (var (key, value) in Defaults)
        {
            var row = rows.FirstOrDefault(r => r.Key == key);
            Assert.NotNull(row);
            Assert.Equal(Group, row!.Group);
            Assert.Equal(value, row.Value);
            Assert.Equal("text", row.InputType);
        }
    }

    [Fact]
    public async Task UpgradedDatabase_GainsCopyLabels()
    {
        // A deployment that predates this ticket has no `labels.*` rows and the bulk
        // seed would skip them forever (the categories early-return). Boot once to
        // produce a seeded database, remove the rows, and require the reboot to put
        // them back with the exact current text.
        var dbPath = Path.Combine(Path.GetTempPath(), $"albaik-upgrade-labels-{Guid.NewGuid():N}.db");
        using (var first = AlbaikApiFactory.ForUpgradeScenario(dbPath, keepDatabaseForFirstBoot: true))
        using (var client = first.CreateClient())
        {
            (await client.GetAsync("/api/home")).EnsureSuccessStatusCode();
        }

        await using (var connection = new SqliteConnection($"Data Source={dbPath}"))
        {
            await connection.OpenAsync();
            await using var del = connection.CreateCommand();
            del.CommandText = "DELETE FROM \"SiteSettings\" WHERE \"Key\" LIKE 'labels.%'";
            await del.ExecuteNonQueryAsync();
        }

        using var factory = AlbaikApiFactory.ForUpgradeScenario(dbPath, keepDatabaseForFirstBoot: false);
        using var admin = factory.AdminClient();
        var settings = await admin.GetFromJsonAsync<List<SiteSettingDto>>("/api/admin/settings");

        foreach (var (key, value) in Defaults)
        {
            var row = settings!.FirstOrDefault(s => s.Key == key);
            Assert.NotNull(row);
            Assert.Equal(value, row!.Value);
        }
    }
}