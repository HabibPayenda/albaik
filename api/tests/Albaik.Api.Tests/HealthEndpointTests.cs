using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The health endpoint is the operator's first signal after deployment, so it must
/// report whether the database behind the API can actually be reached rather than
/// answering "ok" from process liveness alone.
/// </summary>
public class HealthEndpointTests
{
    [Fact]
    public async Task Health_ReportsDatabaseConnectivity()
    {
        using var factory = new AlbaikApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal("connected", body.GetProperty("database").GetString());
    }

    [Fact]
    public async Task Health_Returns503_WhenDatabaseIsUnreachable()
    {
        using var factory = new AlbaikApiFactory();
        using (var client = factory.CreateClient())
        {
            (await client.GetAsync("/api/health")).EnsureSuccessStatusCode();
        }

        factory.DropDatabase();

        using var broken = factory.CreateClient();
        var response = await broken.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("unavailable", body.GetProperty("status").GetString());
        Assert.Equal("unreachable", body.GetProperty("database").GetString());
    }
}
