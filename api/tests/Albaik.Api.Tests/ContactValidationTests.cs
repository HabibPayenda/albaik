using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Contact fields are stored in columns with fixed widths. An over-long value must be
/// refused before the controller sends its notification emails, otherwise the visitor is
/// told the message failed (a 500) after the team has already been emailed about it.
/// [ApiController] turns the DataAnnotations violation into a 400.
/// </summary>
public class ContactValidationTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public ContactValidationTests(AlbaikApiFactory factory) => _factory = factory;

    [Fact]
    public async Task OverLongContactFields_AreRejectedWith400()
    {
        using var client = _factory.CreateClient();

        var payloads = new[]
        {
            new Dictionary<string, object>
            {
                ["name"] = new string('n', 201),
                ["email"] = "long-name@example.com",
                ["message"] = "Valid message.",
            },
            new Dictionary<string, object>
            {
                ["name"] = "Valid Name",
                ["email"] = new string('e', 309) + "@example.com",
                ["message"] = "Valid message.",
            },
            new Dictionary<string, object>
            {
                ["name"] = "Valid Name",
                ["email"] = "long-phone@example.com",
                ["phone"] = new string('1', 51),
                ["message"] = "Valid message.",
            },
            new Dictionary<string, object>
            {
                ["name"] = "Valid Name",
                ["email"] = "long-company@example.com",
                ["company"] = new string('c', 201),
                ["message"] = "Valid message.",
            },
            new Dictionary<string, object>
            {
                ["name"] = "Valid Name",
                ["email"] = "long-subject@example.com",
                ["subject"] = new string('s', 301),
                ["message"] = "Valid message.",
            },
            new Dictionary<string, object>
            {
                ["name"] = "Valid Name",
                ["email"] = "long-message@example.com",
                ["message"] = new string('m', 5001),
            },
        };

        foreach (var payload in payloads)
        {
            var response = await client.PostAsJsonAsync("/api/contact", payload);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
