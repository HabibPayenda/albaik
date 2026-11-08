using Albaik.Api.Data;
using Albaik.Api.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Services;

public record EmailResult(bool Delivered, string? Error, string? MessageId = null);

public interface IEmailSender
{
    bool IsConfigured { get; }
    Task<EmailResult> SendContactNotificationAsync(ContactMessage message, string siteName, CancellationToken ct = default);
    Task<EmailResult> SendAutoReplyAsync(ContactMessage message, string siteName, CancellationToken ct = default);
    Task<EmailResult> SendReplyAsync(ContactMessage message, string subject, string body, string siteName, CancellationToken ct = default);
}

/// <summary>
/// The transport seam. The real implementation talks to SMTP; tests replace it with a
/// recording fake so the branded message and the reply workflow can be asserted without
/// a network server.
/// </summary>
public interface IEmailTransport
{
    bool IsConfigured { get; }
    Task SendAsync(MimeMessage message, CancellationToken ct);
}

public sealed class SmtpEmailTransport : IEmailTransport
{
    private readonly IConfiguration _config;

    public SmtpEmailTransport(IConfiguration config) => _config = config;

    private string? Host => _config["Smtp:Host"];
    private int Port => int.TryParse(_config["Smtp:Port"], out var port) ? port : 587;
    private string? User => _config["Smtp:Username"];
    private string? Pass => _config["Smtp:Password"];
    private bool UseStartTls => !bool.TryParse(_config["Smtp:UseStartTls"], out var startTls) || startTls;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);

    public async Task SendAsync(MimeMessage message, CancellationToken ct)
    {
        using var client = new SmtpClient();
        await client.ConnectAsync(
            Host!,
            Port,
            UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto,
            ct);
        if (!string.IsNullOrWhiteSpace(User))
            await client.AuthenticateAsync(User!, Pass ?? "", ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}

/// <summary>
/// Sends transactional mail over SMTP using MailKit.
///
/// If no SMTP host is configured the sender degrades gracefully: the message is still
/// persisted by the contact controller and the caller records why delivery was skipped,
/// so nothing is ever silently lost.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IEmailTransport _transport;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _log;

    public SmtpEmailSender(
        IEmailTransport transport,
        AppDbContext db,
        IConfiguration config,
        ILogger<SmtpEmailSender> log)
    {
        _transport = transport;
        _db = db;
        _config = config;
        _log = log;
    }

    private string FromAddress => _config["Smtp:FromAddress"] is { Length: > 0 } from
        ? from
        : _config["Smtp:Username"] is { Length: > 0 } user
            ? user
            : "no-reply@albaik-group.com";
    private string FromName => _config["Smtp:FromName"] ?? "Albaik Group of Companies";
    private string? NotifyTo => _config["Smtp:NotifyAddress"];

    public bool IsConfigured => _transport.IsConfigured;

    public async Task<EmailResult> SendContactNotificationAsync(
        ContactMessage message, string siteName, CancellationToken ct = default)
    {
        var to = NotifyTo;
        if (string.IsNullOrWhiteSpace(to))
            return new EmailResult(false, "No notification recipient configured (set Smtp:NotifyAddress).");

        var brand = await LoadBrandAsync(siteName, ct);
        var content = EmailTemplate.ContactNotification(message, brand);

        var subject = string.IsNullOrWhiteSpace(message.ProductName)
            ? $"[{siteName}] New {message.Kind} enquiry from {message.Name}"
            : $"[{siteName}] {message.Kind} enquiry - {message.ProductName} - from {message.Name}";

        return await SendAsync(to, Sanitise(subject), content, message.Email, ct);
    }

    public async Task<EmailResult> SendAutoReplyAsync(
        ContactMessage message, string siteName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(message.Email))
            return new EmailResult(false, "Sender has no email address.");

        var brand = await LoadBrandAsync(siteName, ct);
        var content = EmailTemplate.AutoReply(message, brand);

        return await SendAsync(
            message.Email,
            Sanitise($"We received your message - {siteName}"),
            content,
            NotifyTo,
            ct);
    }

    public async Task<EmailResult> SendReplyAsync(
        ContactMessage message, string subject, string body, string siteName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(message.Email))
            return new EmailResult(false, "Sender has no email address.");

        var brand = await LoadBrandAsync(siteName, ct);
        var content = EmailTemplate.AdminReply(message, subject, body, brand);

        return await SendAsync(message.Email, Sanitise(subject), content, NotifyTo, ct);
    }

    private async Task<EmailBrand> LoadBrandAsync(string fallbackName, CancellationToken ct)
    {
        var settings = await _db.SiteSettings.AsNoTracking()
            .Select(setting => new { setting.Key, setting.Value })
            .ToDictionaryAsync(setting => setting.Key, setting => setting.Value, ct);

        string Value(string key, string fallback = "")
        {
            var value = settings.TryGetValue(key, out var stored) ? stored : null;
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        var social = new (string Key, string Label)[]
        {
            ("social.facebook", "Facebook"),
            ("social.instagram", "Instagram"),
            ("social.tiktok", "TikTok"),
            ("social.whatsapp", "WhatsApp Channel"),
            ("social.linkedin", "LinkedIn"),
        }
        .Select(item => (item.Label, Url: Value(item.Key)))
        .Where(item => item.Url.Length > 0)
        .Select(item => (item.Label, item.Url))
        .ToList();

        var website = PublicSiteUrl.Normalize(settings.GetValueOrDefault("site.publicBaseUrl"))
            ?? Blank((_config["Smtp:PublicUrl"] ?? "").Trim().TrimEnd('/'));
        var logoUrl = website is null ? null : website + "/brand/email-logo-white.png";
        var avatarUrl = website is null ? null : website + "/brand/email-avatar.png";

        return new EmailBrand(
            Value("site.name", fallbackName),
            Value("site.tagline", "The Mark of Pure Perfection"),
            website,
            Blank(Value("contact.email")),
            Blank(Value("contact.phone")),
            Blank(Value("contact.address")),
            social,
            logoUrl,
            avatarUrl);
    }

    private async Task<EmailResult> SendAsync(
        string to,
        string subject,
        EmailContent content,
        string? replyTo,
        CancellationToken ct)
    {
        if (!IsConfigured)
        {
            _log.LogInformation("SMTP not configured - skipping delivery of \"{Subject}\" to {To}.", subject, to);
            return new EmailResult(
                false,
                "SMTP is not configured; the message is stored in the dashboard inbox only.");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(FromName, FromAddress));
            message.To.Add(MailboxAddress.Parse(to));
            if (!string.IsNullOrWhiteSpace(replyTo) && MailboxAddress.TryParse(replyTo, out var replyAddress))
                message.ReplyTo.Add(replyAddress);
            message.Subject = subject;
            message.MessageId = MimeKit.Utils.MimeUtils.GenerateMessageId();

            /*
             * Always send both parts. Setting HtmlBody alone produces a `text/html`-only
             * message, which text-only clients cannot read at all and spam filters score
             * worse - and a notification that lands in the junk folder is the same as one
             * that never arrived. MailKit emits multipart/alternative when both are set.
             */
            var builder = new BodyBuilder
            {
                HtmlBody = content.Html,
                TextBody = content.Text,
            };

            message.Body = builder.ToMessageBody();
            await _transport.SendAsync(message, ct);

            _log.LogInformation("Delivered \"{Subject}\" to {To}.", subject, to);
            return new EmailResult(true, null, message.MessageId);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to deliver \"{Subject}\" to {To}.", subject, to);
            return new EmailResult(false, ex.Message);
        }
    }

    private static string Sanitise(string subject) =>
        subject.Replace('\r', ' ').Replace('\n', ' ').Trim();

    private static string? Blank(string value) => value.Length == 0 ? null : value;
}
