using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Albaik.Api.Data;
using Albaik.Api.Models;
using MailKit;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace Albaik.Api.Services;

/// <summary>
/// Turns a sent email found in the mailbox into a reply on the matching enquiry.
///
/// Phone replies never touch the website, so this importer reads the mailbox's Sent
/// folder and matches a message by recipient e-mail plus the usual reply markers
/// (<c>Re:</c>, <c>In-Reply-To</c> or <c>References</c>). The Message-Id is the
/// idempotency key, so repeated polls cannot duplicate a reply.
/// </summary>
public sealed class MailboxReplyImporter
{
    private readonly AppDbContext _db;
    private readonly ILogger<MailboxReplyImporter> _log;

    public MailboxReplyImporter(AppDbContext db, ILogger<MailboxReplyImporter> log)
    {
        _db = db;
        _log = log;
    }

    /// <summary>Imports one sent message. Returns true only when a new reply was stored.</summary>
    public async Task<bool> ImportAsync(MimeMessage message, CancellationToken ct = default)
    {
        var subject = (message.Subject ?? string.Empty).Trim();
        var looksLikeReply = subject.StartsWith("Re:", StringComparison.OrdinalIgnoreCase)
            || !string.IsNullOrWhiteSpace(message.InReplyTo)
            || message.References.Count > 0;
        if (!looksLikeReply) return false;

        var recipients = message.To.Mailboxes
            .Concat(message.Cc.Mailboxes)
            .Concat(message.Bcc.Mailboxes)
            .Select(mailbox => mailbox.Address)
            .Where(address => !string.IsNullOrWhiteSpace(address))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (recipients.Count == 0) return false;

        var sentAt = message.Date == default ? DateTime.UtcNow : message.Date.UtcDateTime;

        // The recipient must be someone who actually submitted an enquiry. The newest
        // matching enquiry wins when the same person wrote more than once.
        var contact = await _db.ContactMessages
            .Where(enquiry => recipients.Contains(enquiry.Email) && enquiry.CreatedAt <= sentAt.AddDays(1))
            .OrderByDescending(enquiry => enquiry.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (contact is null) return false;

        var messageId = Identity(message);
        if (await _db.ContactMessageReplies.AnyAsync(
                reply => reply.MessageId == messageId, ct))
        {
            return false;
        }

        var storedSubject = Truncate(subject, 200);

        // A dashboard reply sent just before this feature stored no Message-Id, so its
        // own Sent-folder copy could otherwise be imported as a second reply. The same
        // subject and a timestamp within a few minutes is the same message.
        var nearDuplicate = await _db.ContactMessageReplies.AnyAsync(
            reply => reply.ContactMessageId == contact.Id
                && reply.Subject == storedSubject
                && reply.SentAt >= sentAt.AddMinutes(-5)
                && reply.SentAt <= sentAt.AddMinutes(5),
            ct);
        if (nearDuplicate) return false;

        var body = ExtractBody(message);
        if (string.IsNullOrWhiteSpace(body)) body = "(no plain-text body)";
        if (body.Length > 100_000) body = body[..100_000];

        var reply = new ContactMessageReply
        {
            ContactMessageId = contact.Id,
            Subject = storedSubject,
            Body = body,
            FromAddress = Truncate(message.From.Mailboxes.FirstOrDefault()?.Address ?? "", 320),
            ToAddress = contact.Email,
            SentAt = sentAt,
            Source = "phone",
            MessageId = messageId,
        };

        _db.ContactMessageReplies.Add(reply);
        contact.RepliedAt = sentAt;
        contact.ReplyCount += 1;
        contact.IsRead = true;
        await _db.SaveChangesAsync(ct);

        _log.LogInformation(
            "Imported a phone reply to {Email} (contact {ContactId}) from the mailbox Sent folder.",
            contact.Email, contact.Id);
        return true;
    }

    private static string Identity(MimeMessage message)
    {
        if (!string.IsNullOrWhiteSpace(message.MessageId))
            return message.MessageId.Trim();

        var raw = $"{message.From}|{message.To}|{message.Subject}|{message.Date:O}";
        return "sha256:" + Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
    }

    private static string ExtractBody(MimeMessage message)
    {
        var parts = message.BodyParts.OfType<TextPart>().ToArray();

        var plain = parts.FirstOrDefault(part => part.ContentType.IsMimeType("text", "plain"));
        if (plain is not null) return plain.Text.Trim();

        var html = parts.FirstOrDefault(part => part.ContentType.IsMimeType("text", "html"));
        return html is null ? "" : StripHtml(html.Text);
    }

    private static string StripHtml(string html)
    {
        var text = Regex.Replace(html, "<(br|/p|/div|/li|/tr)[^>]*>", "\n", RegexOptions.IgnoreCase);
        text = Regex.Replace(text, "<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        text = Regex.Replace(text, "[ \t]+", " ");
        text = Regex.Replace(text, "\n{3,}", "\n\n");
        return text.Trim();
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
