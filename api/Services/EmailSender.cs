using Albaik.Api.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Albaik.Api.Services;

public record EmailResult(bool Delivered, string? Error);

public interface IEmailSender
{
    bool IsConfigured { get; }
    Task<EmailResult> SendContactNotificationAsync(ContactMessage message, string siteName, CancellationToken ct = default);
    Task<EmailResult> SendAutoReplyAsync(ContactMessage message, string siteName, CancellationToken ct = default);
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
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _log;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> log)
    {
        _config = config;
        _log = log;
    }

    private string? Host => _config["Smtp:Host"];
    private int Port => int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
    private string? User => _config["Smtp:Username"];
    private string? Pass => _config["Smtp:Password"];
    private string FromAddress => _config["Smtp:FromAddress"] is { Length: > 0 } f ? f : User ?? "no-reply@albaik-group.com";
    private string FromName => _config["Smtp:FromName"] ?? "Albaik Group of Companies";
    private string? NotifyTo => _config["Smtp:NotifyAddress"];
    private bool UseStartTls => !bool.TryParse(_config["Smtp:UseStartTls"], out var t) || t;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);

    public Task<EmailResult> SendContactNotificationAsync(ContactMessage m, string siteName, CancellationToken ct = default)
    {
        var to = NotifyTo ?? _config["Site:ContactEmail"];
        if (string.IsNullOrWhiteSpace(to))
            return Task.FromResult(new EmailResult(false, "No notification recipient configured (set Smtp:NotifyAddress)."));

        var rows = new (string Label, string? Value)[]
        {
            ("Name", m.Name), ("Email", m.Email), ("Phone", m.Phone),
            ("Company", m.Company), ("Subject", m.Subject), ("Type", m.Kind),
            ("Product", m.ProductName),
            ("Received", m.CreatedAt.ToString("u")),
        };

        var present = rows.Where(r => !string.IsNullOrWhiteSpace(r.Value)).ToList();

        var cells = string.Join("", present
            .Select(r =>
                "<tr>" +
                "<td style=\"padding:8px 12px;background:#f2f4f7;border:1px solid #e6e8eb;font-size:13px;color:#444652;width:130px;\">" + Encode(r.Label) + "</td>" +
                "<td style=\"padding:8px 12px;border:1px solid #e6e8eb;font-size:13px;color:#191c1e;\">" + Encode(r.Value) + "</td>" +
                "</tr>"));

        /*
         * A product enquiry gets its own callout above the detail table. The whole point
         * of the "Enquire about this product" button is that the team should not have to
         * guess which of twenty formulations the visitor meant, so the product is the
         * most prominent thing in the message rather than one grey row among seven.
         */
        var productBlock = string.IsNullOrWhiteSpace(m.ProductName)
            ? ""
            : "<div style=\"padding:14px 16px;border-left:3px solid #d4af37;background:#f7f9fc;margin-bottom:20px;\">" +
              "<div style=\"font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#7d621b;font-weight:700;\">Product enquiry</div>" +
              "<div style=\"font-family:Georgia,serif;font-size:17px;color:#050d24;font-weight:700;margin-top:3px;\">" + Encode(m.ProductName) + "</div>" +
              (string.IsNullOrWhiteSpace(m.ProductSlug)
                  ? ""
                  : "<div style=\"font-size:12px;color:#747684;margin-top:3px;\">/products/" + Encode(m.ProductSlug) + "</div>") +
              "</div>";

        var html = Wrap(
            "<h2 style=\"margin:0 0 4px;font-family:Georgia,serif;color:#050d24;\">New " + Encode(m.Kind) + " enquiry</h2>" +
            "<p style=\"margin:0 0 20px;color:#444652;font-size:14px;\">Submitted via the " + Encode(siteName) + " website.</p>" +
            productBlock +
            "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border-collapse:collapse;margin-bottom:20px;\">" +
            cells +
            "</table>" +
            "<div style=\"padding:16px;border-left:3px solid #0e3b9c;background:#f7f9fc;white-space:pre-wrap;font-size:14px;color:#191c1e;\">" +
            Encode(m.Message) +
            "</div>");

        var text = Text(
            "New " + m.Kind + " enquiry",
            "Submitted via the " + siteName + " website.",
            string.IsNullOrWhiteSpace(m.ProductName) ? "" : "Regarding product: " + m.ProductName,
            string.Join(Environment.NewLine, present.Select(r => r.Label.PadRight(10) + r.Value)),
            "Message",
            m.Message);

        var subject = string.IsNullOrWhiteSpace(m.ProductName)
            ? "[" + siteName + "] New " + m.Kind + " enquiry from " + m.Name
            : "[" + siteName + "] " + m.Kind + " enquiry — " + m.ProductName + " — from " + m.Name;

        return SendAsync(to, subject, html, text, m.Email, ct);
    }

    public Task<EmailResult> SendAutoReplyAsync(ContactMessage m, string siteName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(m.Email))
            return Task.FromResult(new EmailResult(false, "Sender has no email address."));

        // Echo the product back, so the visitor can tell at a glance that the enquiry
        // that reached the team is about the right formulation.
        var about = string.IsNullOrWhiteSpace(m.ProductName)
            ? ""
            : "<p style=\"margin:0 0 14px;color:#191c1e;font-size:15px;line-height:1.6;\">" +
              "Your enquiry is about <strong>" + Encode(m.ProductName) + "</strong>.</p>";

        var html = Wrap(
            "<h2 style=\"margin:0 0 12px;font-family:Georgia,serif;color:#050d24;\">Thank you, " + Encode(m.Name) + "</h2>" +
            "<p style=\"margin:0 0 14px;color:#191c1e;font-size:15px;line-height:1.6;\">We have received your message and a member of the Albaik Group team will respond shortly.</p>" +
            about +
            "<p style=\"margin:0 0 20px;color:#444652;font-size:14px;line-height:1.6;\">For urgent wholesale or distribution matters you can also reach us on WhatsApp using the number published on our website.</p>" +
            "<div style=\"padding:16px;border-left:3px solid #d4af37;background:#f7f9fc;white-space:pre-wrap;font-size:14px;color:#444652;\">" +
            Encode(m.Message) +
            "</div>" +
            "<p style=\"margin:24px 0 0;font-size:13px;color:#747684;\">&mdash; " + Encode(siteName) + " &middot; The Mark of Pure Perfection</p>");

        var text = Text(
            "Thank you, " + m.Name,
            "We have received your message and a member of the Albaik Group team will respond shortly.",
            string.IsNullOrWhiteSpace(m.ProductName) ? "" : "Your enquiry is about " + m.ProductName + ".",
            "For urgent wholesale or distribution matters you can also reach us on WhatsApp using the number published on our website.",
            "Your message",
            m.Message);

        return SendAsync(m.Email, "We received your message — " + siteName, html, text, NotifyTo, ct);
    }

    private async Task<EmailResult> SendAsync(string to, string subject, string html, string text, string? replyTo, CancellationToken ct)
    {
        if (!IsConfigured)
        {
            _log.LogInformation("SMTP not configured — skipping delivery of \"{Subject}\" to {To}.", subject, to);
            return new EmailResult(false, "SMTP is not configured; the message is stored in the dashboard inbox only.");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(FromName, FromAddress));
            message.To.Add(MailboxAddress.Parse(to));
            if (!string.IsNullOrWhiteSpace(replyTo) && MailboxAddress.TryParse(replyTo, out var rt))
                message.ReplyTo.Add(rt);
            message.Subject = subject;

            /*
             * Always send both parts. Setting HtmlBody alone produces a `text/html`-only
             * message, which text-only clients cannot read at all and spam filters score
             * worse — and a notification that lands in the junk folder is the same as one
             * that never arrived. MailKit emits multipart/alternative when both are set.
             */
            message.Body = new BodyBuilder { HtmlBody = html, TextBody = text }.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(Host!, Port, UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto, ct);
            if (!string.IsNullOrWhiteSpace(User))
                await client.AuthenticateAsync(User!, Pass ?? "", ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);

            _log.LogInformation("Delivered \"{Subject}\" to {To}.", subject, to);
            return new EmailResult(true, null);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to deliver \"{Subject}\" to {To}.", subject, to);
            return new EmailResult(false, ex.Message);
        }
    }

    private static string Encode(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "");

    /// <summary>
    /// The plain-text alternative to <see cref="Wrap"/>. Blocks are separated by a blank
    /// line, which is how a text reader expresses the paragraph and section spacing the
    /// HTML version gets from styling.
    /// </summary>
    private static string Text(params string[] blocks) =>
        string.Join(
            Environment.NewLine + Environment.NewLine,
            blocks.Where(b => !string.IsNullOrWhiteSpace(b))) +
        Environment.NewLine + Environment.NewLine +
        "-- " + Environment.NewLine +
        "Albaik Group of Companies - The Mark of Pure Perfection";

    private static string Wrap(string inner) =>
        "<!doctype html><html><body style=\"margin:0;padding:0;background:#eceef1;\">" +
        "<div style=\"max-width:620px;margin:0 auto;padding:32px 16px;\">" +
        "<div style=\"background:#0e3b9c;background-image:linear-gradient(135deg,#050d24 0%,#0e3b9c 60%,#1a4fcf 100%);padding:24px 28px;border-radius:16px 16px 0 0;\">" +
        "<div style=\"font-family:Georgia,serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;\">ALBAIK</div>" +
        "<div style=\"font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#d4af37;margin-top:2px;\">Pure Perfection</div>" +
        "</div>" +
        "<div style=\"background:#ffffff;padding:28px;border-radius:0 0 16px 16px;border:1px solid #e6e8eb;border-top:none;font-family:Arial,Helvetica,sans-serif;\">" +
        inner +
        "</div>" +
        "<div style=\"text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#747684;padding:16px;\">" +
        "Albaik Group of Companies &middot; The Mark of Pure Perfection" +
        "</div></div></body></html>";
}
