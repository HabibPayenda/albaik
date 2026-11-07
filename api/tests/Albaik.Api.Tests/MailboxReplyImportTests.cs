using Albaik.Api.Data;
using Albaik.Api.Models;
using Albaik.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MimeKit;
using MimeKit.Utils;
using Xunit;

namespace Albaik.Api.Tests;

/// <summary>
/// Phone replies are written in a mail app and never touch the website, so the Sent
/// folder sync must match and store them without duplicating a poll.
/// </summary>
public class MailboxReplyImportTests
{
    [Fact]
    public async Task SentReply_MatchesEnquiry_IsStoredOnce_AndIsIdempotent()
    {
        using var factory = new AlbaikApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var importer = scope.ServiceProvider.GetRequiredService<MailboxReplyImporter>();

        var email = $"phone-{Guid.NewGuid():N}@example.com";
        var contact = new ContactMessage
        {
            Name = "Phone Visitor",
            Email = email,
            Message = "Original website enquiry.",
            Kind = "contact",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
        };
        db.ContactMessages.Add(contact);
        await db.SaveChangesAsync();

        var message = new MimeMessage
        {
            Subject = "Re: Your enquiry to Albaik",
            InReplyTo = "<original@albaik.test>",
            MessageId = MimeUtils.GenerateMessageId(),
            Date = DateTimeOffset.UtcNow,
        };
        message.From.Add(new MailboxAddress("Albaik", "info@albaik.test"));
        message.To.Add(MailboxAddress.Parse(email));
        message.Body = new TextPart("plain") { Text = "This reply was written on a phone." };

        Assert.True(await importer.ImportAsync(message));
        Assert.False(await importer.ImportAsync(message));

        var stored = await db.ContactMessageReplies
            .Where(reply => reply.ContactMessageId == contact.Id)
            .ToListAsync();
        var reply = Assert.Single(stored);
        Assert.Equal("phone", reply.Source);
        Assert.Equal("This reply was written on a phone.", reply.Body);
        Assert.Equal(message.MessageId, reply.MessageId);
        Assert.Equal(email, reply.ToAddress);

        var refreshed = await db.ContactMessages.FindAsync(contact.Id);
        Assert.NotNull(refreshed);
        Assert.Equal(1, refreshed!.ReplyCount);
        Assert.NotNull(refreshed.RepliedAt);
        Assert.True(refreshed.IsRead);
    }

    [Fact]
    public async Task SentMailToSomeoneElse_IsNotImported()
    {
        using var factory = new AlbaikApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var importer = scope.ServiceProvider.GetRequiredService<MailboxReplyImporter>();

        db.ContactMessages.Add(new ContactMessage
        {
            Name = "Known Visitor",
            Email = "known@example.com",
            Message = "An enquiry.",
            Kind = "contact",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
        });
        await db.SaveChangesAsync();

        var message = new MimeMessage
        {
            Subject = "Re: Something unrelated",
            InReplyTo = "<other@example.com>",
            MessageId = MimeUtils.GenerateMessageId(),
            Date = DateTimeOffset.UtcNow,
        };
        message.From.Add(new MailboxAddress("Albaik", "info@albaik.test"));
        message.To.Add(MailboxAddress.Parse("someone-else@example.com"));
        message.Body = new TextPart("plain") { Text = "Not a website enquiry reply." };

        Assert.False(await importer.ImportAsync(message));
        Assert.Empty(await db.ContactMessageReplies.ToListAsync());
    }

    [Fact]
    public async Task HtmlOnlySentReply_IsStoredAsReadableText()
    {
        using var factory = new AlbaikApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var importer = scope.ServiceProvider.GetRequiredService<MailboxReplyImporter>();

        var email = $"html-{Guid.NewGuid():N}@example.com";
        var contact = new ContactMessage
        {
            Name = "HTML Visitor",
            Email = email,
            Message = "An enquiry.",
            Kind = "contact",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
        };
        db.ContactMessages.Add(contact);
        await db.SaveChangesAsync();

        var message = new MimeMessage
        {
            Subject = "Re: Your enquiry",
            InReplyTo = "<original@albaik.test>",
            MessageId = MimeUtils.GenerateMessageId(),
            Date = DateTimeOffset.UtcNow,
        };
        message.From.Add(new MailboxAddress("Albaik", "info@albaik.test"));
        message.To.Add(MailboxAddress.Parse(email));
        message.Body = new TextPart("html") { Text = "<p>Hello <strong>phone</strong></p>" };

        Assert.True(await importer.ImportAsync(message));

        var reply = await db.ContactMessageReplies.SingleAsync(item => item.ContactMessageId == contact.Id);
        Assert.Contains("Hello", reply.Body);
        Assert.Contains("phone", reply.Body);
        Assert.DoesNotContain("<p>", reply.Body);
    }
    [Fact]
    public async Task CustomerReplyFromInbox_IsStoredAndMarksTheThreadUnread()
    {
        using var factory = new AlbaikApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var importer = scope.ServiceProvider.GetRequiredService<MailboxReplyImporter>();

        var email = $"customer-{Guid.NewGuid():N}@example.com";
        var contact = new ContactMessage
        {
            Name = "Customer",
            Email = email,
            Message = "Original website enquiry.",
            Kind = "contact",
            IsRead = true,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
        };
        db.ContactMessages.Add(contact);
        await db.SaveChangesAsync();

        var message = new MimeMessage
        {
            Subject = "Re: Your reply from Albaik",
            InReplyTo = "<dashboard-reply@albaik.test>",
            MessageId = MimeUtils.GenerateMessageId(),
            Date = DateTimeOffset.UtcNow,
        };
        message.From.Add(MailboxAddress.Parse(email));
        message.To.Add(MailboxAddress.Parse("inbox@albaik.test"));
        message.Body = new TextPart("plain") { Text = "The customer replied from Gmail." };

        Assert.True(await importer.ImportAsync(message, isInbound: true));
        Assert.False(await importer.ImportAsync(message, isInbound: true));

        var reply = await db.ContactMessageReplies.SingleAsync(item => item.ContactMessageId == contact.Id);
        Assert.Equal("customer", reply.Source);
        Assert.Equal(email, reply.FromAddress);
        Assert.Equal("inbox@albaik.test", reply.ToAddress);
        Assert.Equal("The customer replied from Gmail.", reply.Body);

        var refreshed = await db.ContactMessages.FindAsync(contact.Id);
        Assert.NotNull(refreshed);
        Assert.Equal(1, refreshed!.CustomerReplyCount);
        Assert.NotNull(refreshed.LastCustomerReplyAt);
        Assert.Equal(0, refreshed.ReplyCount);
        Assert.False(refreshed.IsRead);
    }

    [Fact]
    public async Task InboundMailFromAnUnknownSender_IsNotImported()
    {
        using var factory = new AlbaikApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var importer = scope.ServiceProvider.GetRequiredService<MailboxReplyImporter>();

        db.ContactMessages.Add(new ContactMessage
        {
            Name = "Known Visitor",
            Email = "known@example.com",
            Message = "An enquiry.",
            Kind = "contact",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
        });
        await db.SaveChangesAsync();

        var message = new MimeMessage
        {
            Subject = "Re: newsletter",
            MessageId = MimeUtils.GenerateMessageId(),
            Date = DateTimeOffset.UtcNow,
        };
        message.From.Add(MailboxAddress.Parse("unknown@example.com"));
        message.To.Add(MailboxAddress.Parse("inbox@albaik.test"));
        message.Body = new TextPart("plain") { Text = "Not from a known enquiry." };

        Assert.False(await importer.ImportAsync(message, isInbound: true));
        Assert.Empty(await db.ContactMessageReplies.ToListAsync());
    }
}
