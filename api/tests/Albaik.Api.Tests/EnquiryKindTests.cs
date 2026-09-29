using System.Net;
using System.Net.Http.Json;
using Albaik.Api.Dtos;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Ticket 07 — the messages screen shows a friendly label for every enquiry kind a
/// visitor can send, including product enquiries. The labels and the type filter live in
/// the dashboard frontend, which has no test harness; these tests pin the API contract
/// that screen depends on: every kind a visitor can submit is stored and served with its
/// own `kind`, and the admin list can filter by it. Product enquiries were the kind that
/// could previously arrive with nothing labelling them on the screen.
/// </summary>
public class EnquiryKindTests : IClassFixture<AlbaikApiFactory>
{
    private readonly AlbaikApiFactory _factory;
    public EnquiryKindTests(AlbaikApiFactory factory) => _factory = factory;

    private sealed record MessagesEnvelope(List<ContactMessageDto> Items, int Total, int Unread);

    [Theory]
    [InlineData("contact")]
    [InlineData("wholesale")]
    [InlineData("product")]
    public async Task ContactFormEnquiry_ReachesMessagesWithItsKind(string kind)
    {
        var marker = $"ticket07-{kind}-{Guid.NewGuid():N}";
        using (var publicClient = _factory.CreateClient())
        {
            var post = await publicClient.PostAsJsonAsync("/api/contact", new
            {
                name = "Ticket Seven",
                email = "ticket07@example.com",
                message = marker,
                kind,
            });
            Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        }

        using var admin = _factory.AdminClient();
        var envelope = await admin.GetFromJsonAsync<MessagesEnvelope>($"/api/admin/messages?kind={kind}");

        Assert.NotNull(envelope);
        var stored = envelope!.Items.FirstOrDefault(m => m.Message == marker);
        Assert.NotNull(stored);
        Assert.Equal(kind, stored!.Kind);
    }

    [Fact]
    public async Task NewsletterOptIn_ReachesMessagesAsItsOwnKind()
    {
        var email = $"ticket07-news-{Guid.NewGuid():N}@example.com";
        using (var publicClient = _factory.CreateClient())
        {
            var post = await publicClient.PostAsJsonAsync("/api/contact/newsletter", new { email });
            Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        }

        using var admin = _factory.AdminClient();
        var envelope = await admin.GetFromJsonAsync<MessagesEnvelope>("/api/admin/messages?kind=newsletter");

        Assert.NotNull(envelope);
        var stored = envelope!.Items.FirstOrDefault(m => m.Email == email);
        Assert.NotNull(stored);
        Assert.Equal("newsletter", stored!.Kind);
    }
}
