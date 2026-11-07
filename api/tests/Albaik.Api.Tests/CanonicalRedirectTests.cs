using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 10 — every public page has one canonical address. These tests drive the real
/// HTTP host with the headers an edge proxy sends, because that is the boundary search
/// engines and browsers meet: a 301 and a <c>Location</c> that preserves the path and
/// query. The origin comes from the dashboard-editable <c>site.publicBaseUrl</c> setting,
/// so the tests also pin the shape that setting is allowed to take.
/// </summary>
public class CanonicalRedirectTests : IClassFixture<AlbaikApiFactory>
{
    private const string CanonicalOrigin = "https://albaik-group.af";
    private const string CanonicalHost = "albaik-group.af";

    private readonly AlbaikApiFactory _factory;

    public CanonicalRedirectTests(AlbaikApiFactory factory)
    {
        _factory = factory;
        // A built front end ships hashed, mixed-case filenames. Path normalisation must
        // leave their casing alone.
        _factory.WriteWebRootFile("assets/app-AbC123.js", "console.log('mixed case fixture');");
    }

    [Fact]
    public async Task WwwHost_RedirectsToApex_PreservingPathAndQuery()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            await SaveSettingAsync(admin, row, CanonicalOrigin);

            using var client = PageClient();
            var response = await client.SendAsync(
                Request(HttpMethod.Get, "/collections/hair-care?ref=share", "www." + CanonicalHost, "https"));

            AssertPermanentRedirect(response, "https://albaik-group.af/collections/hair-care?ref=share");
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task HttpScheme_RedirectsToHttps_PreservingPathAndQuery()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            await SaveSettingAsync(admin, row, CanonicalOrigin);

            using var client = PageClient();
            var response = await client.SendAsync(
                Request(HttpMethod.Get, "/products/shampoo?colour=red", CanonicalHost, "http"));

            AssertPermanentRedirect(response, "https://albaik-group.af/products/shampoo?colour=red");
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task TrailingSlashAndMixedCasePath_RedirectToCanonicalLowercaseForm()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            await SaveSettingAsync(admin, row, CanonicalOrigin);

            using var client = PageClient();
            var response = await client.SendAsync(
                Request(HttpMethod.Get, "/Collections/Hair-Care/?filter=all", CanonicalHost, "https"));

            AssertPermanentRedirect(response, "https://albaik-group.af/collections/hair-care?filter=all");
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task MixedCaseHashedAsset_IsServedInsteadOfLowercased()
    {
        using var client = PageClient();
        var response = await client.GetAsync("/assets/app-AbC123.js");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(response.Headers.Location);
        Assert.Contains("mixed case fixture", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task BrandShortcut_RedirectsToCollectionScopedBrandUrl()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            await SaveSettingAsync(admin, row, CanonicalOrigin);

            using var client = PageClient();

            // `albaik` is a Brand in four Collections. The seeded catalogue's first
            // active Brand by sort order is the Hair Care one, so that is the address
            // search engines should remember.
            var aliased = await client.SendAsync(
                Request(HttpMethod.Get, "/brands/albaik?ref=nav", CanonicalHost, "https"));
            AssertPermanentRedirect(aliased, "https://albaik-group.af/collections/hair-care/albaik?ref=nav");

            // A Brand that lives in one Collection still resolves to that Collection.
            var single = await client.SendAsync(
                Request(HttpMethod.Get, "/brands/avora-shine", CanonicalHost, "https"));
            AssertPermanentRedirect(single, "https://albaik-group.af/collections/hair-care/avora-shine");
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task PublicSiteUrlSetting_RejectsNonHttps_AndNormalisesTrailingSlash()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            var rejected = await admin.PutAsJsonAsync(
                "/api/admin/settings",
                new SettingsInput { Settings = new() { row with { Value = "http://albaik-group.af" } } });
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);

            var accepted = await admin.PutAsJsonAsync(
                "/api/admin/settings",
                new SettingsInput { Settings = new() { row with { Value = CanonicalOrigin + "/" } } });
            Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);

            var saved = await accepted.Content.ReadFromJsonAsync<List<SiteSettingDto>>();
            Assert.NotNull(saved);
            Assert.Equal(
                CanonicalOrigin,
                saved!.Single(s => s.Key == "site.publicBaseUrl").Value);
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task PublicSiteUrlSetting_DrivesRedirectLocation()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            // A non-apex origin proves the Location is built from the setting rather than
            // hard-coded in the middleware.
            await SaveSettingAsync(admin, row, "https://public.albaik.example");

            using var client = PageClient();
            var response = await client.SendAsync(
                Request(HttpMethod.Get, "/collections/hair-care", "www.public.albaik.example", "https"));

            AssertPermanentRedirect(response, "https://public.albaik.example/collections/hair-care");
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task RequestOnCanonicalHostAndScheme_IsNotRedirected()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            await SaveSettingAsync(admin, row, CanonicalOrigin);

            using var client = PageClient();
            var response = await client.SendAsync(
                Request(HttpMethod.Get, "/collections/hair-care", CanonicalHost, "https"));

            // The canonical request reaches the normal pipeline (the not-found shell in
            // this test web root); a redirect here would be a loop.
            Assert.NotEqual(HttpStatusCode.MovedPermanently, response.StatusCode);
            Assert.Null(response.Headers.Location);
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task UnknownApiAndUploadPaths_KeepTheirOwn404()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            await SaveSettingAsync(admin, row, CanonicalOrigin);

            using var client = PageClient();

            var api = await client.SendAsync(
                Request(HttpMethod.Get, "/api/does-not-exist/", CanonicalHost, "https"));
            Assert.Equal(HttpStatusCode.NotFound, api.StatusCode);
            Assert.Null(api.Headers.Location);

            var upload = await client.SendAsync(
                Request(HttpMethod.Get, "/uploads/does-not-exist.jpg", CanonicalHost, "https"));
            Assert.Equal(HttpStatusCode.NotFound, upload.StatusCode);
            Assert.Null(upload.Headers.Location);
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    [Fact]
    public async Task NonGetRequests_PassThroughWithoutARedirect()
    {
        using var admin = _factory.AdminClient();
        var row = await PublicSiteUrlRowAsync(admin);
        try
        {
            await SaveSettingAsync(admin, row, CanonicalOrigin);

            using var client = PageClient();
            var response = await client.SendAsync(
                Request(HttpMethod.Post, "/collections/hair-care", "www." + CanonicalHost, "http"));

            // A 301 on a POST would be replayed by clients as a GET; the request must
            // reach the normal pipeline untouched.
            Assert.NotEqual(HttpStatusCode.MovedPermanently, response.StatusCode);
        }
        finally
        {
            await RestoreSettingAsync(admin, row);
        }
    }

    /// <summary>
    /// A client that stops at the first hop. These tests assert the 301 itself, so
    /// following the Location would hide it behind whatever the next request returns.
    /// </summary>
    private HttpClient PageClient()
        => _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    private static async Task<SiteSettingDto> PublicSiteUrlRowAsync(HttpClient admin)
    {
        var settings = await admin.GetFromJsonAsync<List<SiteSettingDto>>("/api/admin/settings");
        Assert.NotNull(settings);
        var row = settings!.SingleOrDefault(s => s.Key == "site.publicBaseUrl");
        Assert.NotNull(row);
        return row!;
    }

    private static async Task SaveSettingAsync(HttpClient admin, SiteSettingDto row, string value)
    {
        var response = await admin.PutAsJsonAsync(
            "/api/admin/settings",
            new SettingsInput { Settings = new() { row with { Value = value } } });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static Task RestoreSettingAsync(HttpClient admin, SiteSettingDto row)
        => SaveSettingAsync(admin, row, row.Value ?? string.Empty);

    private static HttpRequestMessage Request(HttpMethod method, string pathAndQuery, string host, string scheme)
    {
        var request = new HttpRequestMessage(method, pathAndQuery);
        request.Headers.Host = host;
        request.Headers.TryAddWithoutValidation("X-Forwarded-Proto", scheme);
        return request;
    }

    private static void AssertPermanentRedirect(HttpResponseMessage response, string expectedLocation)
    {
        Assert.Equal(HttpStatusCode.MovedPermanently, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        Assert.Equal(expectedLocation, response.Headers.Location!.ToString());
    }
}
