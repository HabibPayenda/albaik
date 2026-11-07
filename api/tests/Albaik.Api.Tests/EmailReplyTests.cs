using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Albaik.Api.Dtos;
using Albaik.Api.Services;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MimeKit;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// The dashboard reply workflow and the branded email template. A recording transport
/// replaces SMTP, so the real message-building code runs and the test asserts what the
/// visitor would actually receive.
/// </summary>
public class EmailReplyTests
{
    [Fact]
    public async Task ContactForm_SendsBrandedNotificationAndAutoReply()
    {
        using var factory = new RecordingEmailFactory();
        using var client = factory.CreateClient();
        var email = $"visitor-{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/contact", new
        {
            name = "Test Visitor",
            email,
            message = "Hello <b>team</b>, please send wholesale terms.",
            kind = "wholesale",
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var sent = factory.Transport.Messages;
        Assert.Equal(2, sent.Count);

        var notification = Assert.Single(sent, message => message.To.Any(to => to.ToString().Contains("inbox@albaik.test")));
        var autoReply = Assert.Single(sent, message => message.To.Any(to => to.ToString().Contains(email)));

        Assert.Contains("New wholesale enquiry", notification.Subject, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Hello &lt;b&gt;team&lt;/b&gt;", Html(notification), StringComparison.Ordinal);
        AssertBranded(notification, "Albaik Group of Companies");
        Assert.Contains(email, notification.ReplyTo.ToString());

        Assert.Contains("We received your message", autoReply.Subject, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Thank you, Test Visitor", Html(autoReply), StringComparison.Ordinal);
        AssertBranded(autoReply, "Albaik Group of Companies");
        Assert.Contains("inbox@albaik.test", autoReply.ReplyTo.ToString());
    }

    [Fact]
    public async Task AdminReply_SendsBrandedEmailAndTracksTheReply()
    {
        using var factory = new RecordingEmailFactory();
        using var client = factory.CreateClient();
        var email = $"reply-{Guid.NewGuid():N}@example.com";

        var created = await client.PostAsJsonAsync("/api/contact", new
        {
            name = "Reply Visitor",
            email,
            subject = "Wholesale enquiry",
            message = "Original question about wholesale pricing.",
            kind = "contact",
        });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);

        using var admin = factory.AdminClient();
        var list = await admin.GetFromJsonAsync<AdminMessageList>("/api/admin/messages");
        Assert.NotNull(list);
        var message = Assert.Single(list!.Items, item => item.Email == email);
        Assert.Equal(0, message.ReplyCount);

        factory.Transport.Messages.Clear();

        var reply = await admin.PostAsJsonAsync($"/api/admin/messages/{message.Id}/reply", new
        {
            subject = "Re: Wholesale enquiry",
            body = "Hello,\n\nThank you for your enquiry. Our wholesale team will contact you shortly.\n\nAlbaik",
        });

        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        var result = await reply.Content.ReadFromJsonAsync<ReplyResult>();
        Assert.NotNull(result);
        Assert.True(result!.Sent);
        Assert.Equal(1, result.ReplyCount);
        Assert.NotNull(result.RepliedAt);

        var sent = Assert.Single(factory.Transport.Messages);
        Assert.Contains(email, sent.To.ToString(), StringComparison.Ordinal);
        Assert.Equal("Re: Wholesale enquiry", sent.Subject);
        Assert.Contains("Our wholesale team will contact you shortly.", Html(sent), StringComparison.Ordinal);
        Assert.Contains("Original question about wholesale pricing.", Html(sent), StringComparison.Ordinal);
        AssertBranded(sent, "Albaik Group of Companies");

        var replies = await admin.GetFromJsonAsync<List<ContactMessageReplyDto>>(
            $"/api/admin/messages/{message.Id}/replies");
        var sentReply = Assert.Single(replies!);
        Assert.Equal("Re: Wholesale enquiry", sentReply.Subject);
        Assert.Contains("wholesale team", sentReply.Body, StringComparison.OrdinalIgnoreCase);

        var refreshed = await admin.GetFromJsonAsync<AdminMessageList>("/api/admin/messages");
        var updated = Assert.Single(refreshed!.Items, item => item.Id == message.Id);
        Assert.Equal(1, updated.ReplyCount);
        Assert.NotNull(updated.RepliedAt);
        Assert.True(updated.IsRead);
    }

    [Fact]
    public async Task Reply_RequiresAuthentication()
    {
        using var factory = new RecordingEmailFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/admin/messages/1/reply", new
        {
            subject = "Re: test",
            body = "test",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Reply_ReturnsAUsefulErrorWhenSmtpIsNotConfigured()
    {
        using var factory = new AlbaikApiFactory();
        using var client = factory.CreateClient();
        var email = $"smtp-off-{Guid.NewGuid():N}@example.com";

        var created = await client.PostAsJsonAsync("/api/contact", new
        {
            name = "SMTP Off",
            email,
            message = "Test message while SMTP is disabled.",
            kind = "contact",
        });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);

        using var admin = factory.AdminClient();
        var list = await admin.GetFromJsonAsync<AdminMessageList>("/api/admin/messages");
        var message = Assert.Single(list!.Items, item => item.Email == email);

        var reply = await admin.PostAsJsonAsync($"/api/admin/messages/{message.Id}/reply", new
        {
            subject = "Re: test",
            body = "A reply",
        });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, reply.StatusCode);
        Assert.Contains("SMTP is not configured", await reply.Content.ReadAsStringAsync());

        var refreshed = await admin.GetFromJsonAsync<AdminMessageList>("/api/admin/messages");
        var unchanged = Assert.Single(refreshed!.Items, item => item.Id == message.Id);
        Assert.Equal(0, unchanged.ReplyCount);
        Assert.Null(unchanged.RepliedAt);
    }

    private static void AssertBranded(MimeMessage message, string brand)
    {
        var html = Html(message);
        Assert.Contains("https://albaik.test/brand/email-logo-white.png", html, StringComparison.Ordinal);
        Assert.Contains(brand, html, StringComparison.Ordinal);
        Assert.Contains("The Mark of Pure Perfection", html, StringComparison.Ordinal);
        Assert.Contains("linear-gradient(135deg,#050d24", html, StringComparison.Ordinal);
        Assert.Contains("https://albaik.test/brand/email-avatar.png", html, StringComparison.Ordinal);
        Assert.DoesNotContain(message.BodyParts, part => part.ContentType.IsMimeType("image", "png"));
    }

    private static string Html(MimeMessage message) =>
        message.BodyParts.OfType<TextPart>()
            .First(part => part.ContentType.IsMimeType("text", "html"))
            .Text;

    private sealed record AdminMessageList(List<ContactMessageDto> Items, int Total, int Unread);
    private sealed record ReplyResult(bool Sent, DateTime? RepliedAt, int ReplyCount, string Message);
}

/// <summary>A factory whose SMTP transport records messages instead of sending them.</summary>
public sealed class RecordingEmailFactory : AlbaikApiFactory
{
    public RecordingEmailTransport Transport { get; } = new();

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Smtp:NotifyAddress", "inbox@albaik.test");
        builder.UseSetting("Smtp:PublicUrl", "https://albaik.test");
        builder.UseSetting("Smtp:FromAddress", "no-reply@albaik.test");
        builder.UseSetting("Smtp:FromName", "Albaik Group of Companies");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailTransport>();
            services.AddSingleton<IEmailTransport>(Transport);
        });
    }
}

public sealed class RecordingEmailTransport : IEmailTransport
{
    public List<MimeMessage> Messages { get; } = new();
    public bool IsConfigured => true;

    public Task SendAsync(MimeMessage message, CancellationToken ct)
    {
        Messages.Add(message);
        return Task.CompletedTask;
    }
}
