using System.Net;
using System.Text;
using Albaik.Api.Models;

namespace Albaik.Api.Services;

/// <summary>The site-owned values an outgoing email needs to carry the brand.</summary>
public sealed record EmailBrand(
    string Name,
    string Tagline,
    string? WebsiteUrl,
    string? ContactEmail,
    string? Phone,
    string? Address,
    IReadOnlyList<(string Label, string Url)> Social);

/// <summary>An HTML body and its plain-text alternative.</summary>
public sealed record EmailContent(string Html, string Text);

/// <summary>
/// One branded HTML layout for every outgoing message: contact notifications, visitor
/// auto-replies and dashboard replies. The logo is embedded as a CID resource so it
/// renders in every mail client without relying on the website being reachable.
/// </summary>
public static class EmailTemplate
{
    public const string LogoContentId = "albaik-logo";

    public static EmailContent ContactNotification(ContactMessage message, EmailBrand brand)
    {
        var kind = message.Kind switch
        {
            "wholesale" => "wholesale",
            "product" => "product",
            "newsletter" => "mailing-list",
            _ => "general",
        };

        var product = string.IsNullOrWhiteSpace(message.ProductName)
            ? ""
            : Callout(
                "Product enquiry",
                Encode(message.ProductName),
                string.IsNullOrWhiteSpace(message.ProductSlug)
                    ? null
                    : $"/products/{message.ProductSlug}",
                "#d4af37");

        var rows = new (string Label, string? Value)[]
        {
            ("Name", message.Name),
            ("Email", message.Email),
            ("Phone", message.Phone),
            ("Company", message.Company),
            ("Subject", message.Subject),
            ("Type", kind),
            ("Received", message.CreatedAt.ToString("dd MMM yyyy, HH:mm 'UTC'")),
        };
        var present = rows.Where(row => !string.IsNullOrWhiteSpace(row.Value)).ToArray();

        var details = new StringBuilder();
        details.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" ")
            .Append("style=\"border-collapse:collapse;margin:0 0 22px;\">");
        foreach (var (label, value) in present)
        {
            details.Append("<tr>")
                .Append("<td style=\"width:132px;padding:9px 12px;background:#f4f7fb;border-bottom:1px solid #e6ebf2;")
                .Append("font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5d6475;\">")
                .Append(Encode(label)).Append("</td>")
                .Append("<td style=\"padding:9px 12px;border-bottom:1px solid #e6ebf2;")
                .Append("font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#191c1e;\">")
                .Append(Encode(value)).Append("</td></tr>");
        }
        details.Append("</table>");

        var body = new StringBuilder();
        body.Append(Eyebrow("New " + kind + " enquiry"));
        body.Append("<h1 style=\"margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:25px;")
            .Append("line-height:1.25;color:#050d24;\">A new message from the website</h1>");
        body.Append("<p style=\"margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;")
            .Append("line-height:1.65;color:#5d6475;\">Submitted through the ")
            .Append(Encode(brand.Name)).Append(" website.</p>");
        body.Append(product);
        body.Append(details);
        body.Append("<div style=\"padding:16px 18px;border-left:3px solid #0e3b9c;background:#f7f9fc;")
            .Append("border-radius:0 10px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;")
            .Append("line-height:1.65;color:#191c1e;white-space:pre-wrap;\">")
            .Append(Encode(message.Message)).Append("</div>");
        if (brand.WebsiteUrl is not null)
        {
            body.Append(Cta(brand.WebsiteUrl + "/admin/messages", "Open the dashboard inbox"));
        }

        var text = Text(
            $"New {kind} enquiry",
            $"Submitted through the {brand.Name} website.",
            string.IsNullOrWhiteSpace(message.ProductName) ? null : $"Product: {message.ProductName}",
            string.Join(Environment.NewLine, present.Select(row => $"{row.Label}: {row.Value}")),
            "Message:",
            message.Message,
            "Open the dashboard inbox: " + (brand.WebsiteUrl ?? "the website admin"));

        return new EmailContent(
            Layout(brand, $"New {kind} enquiry from {message.Name}", body.ToString()),
            text);
    }

    public static EmailContent AutoReply(ContactMessage message, EmailBrand brand)
    {
        var product = string.IsNullOrWhiteSpace(message.ProductName)
            ? ""
            : Callout(
                "Your enquiry is about",
                Encode(message.ProductName),
                string.IsNullOrWhiteSpace(message.ProductSlug)
                    ? null
                    : $"/products/{message.ProductSlug}",
                "#0e3b9c");

        var body = new StringBuilder();
        body.Append(Eyebrow("Message received"));
        body.Append("<h1 style=\"margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;")
            .Append("line-height:1.25;color:#050d24;\">Thank you, ")
            .Append(Encode(message.Name)).Append("</h1>");
        body.Append("<p style=\"margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;")
            .Append("line-height:1.7;color:#191c1e;\">We have received your message and a member of the ")
            .Append(Encode(brand.Name)).Append(" team will respond shortly.</p>");
        body.Append(product);
        body.Append("<div style=\"margin:0 0 20px;padding:16px 18px;border-left:3px solid #d4af37;background:#f7f9fc;")
            .Append("border-radius:0 10px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;")
            .Append("line-height:1.65;color:#5d6475;white-space:pre-wrap;\">")
            .Append(Encode(message.Message)).Append("</div>");
        body.Append("<p style=\"margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;")
            .Append("line-height:1.65;color:#191c1e;\">For urgent wholesale or distribution matters, ")
            .Append("you can reach us using the contact details below.</p>");
        if (brand.WebsiteUrl is not null)
        {
            body.Append(Cta(brand.WebsiteUrl, "Visit Albaik"));
        }

        var text = Text(
            $"Thank you, {message.Name}",
            "We have received your message and a member of the Albaik team will respond shortly.",
            string.IsNullOrWhiteSpace(message.ProductName) ? null : $"Your enquiry is about {message.ProductName}.",
            "Your message:",
            message.Message,
            "For urgent wholesale or distribution matters, use the contact details on the website.",
            brand.WebsiteUrl ?? "");

        return new EmailContent(
            Layout(brand, "We have received your message", body.ToString()),
            text);
    }

    public static EmailContent AdminReply(
        ContactMessage message, string subject, string replyBody, EmailBrand brand)
    {
        var body = new StringBuilder();
        body.Append(Eyebrow("A reply from Albaik"));
        body.Append("<h1 style=\"margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:25px;")
            .Append("line-height:1.25;color:#050d24;\">")
            .Append(Encode(subject)).Append("</h1>");
        body.Append("<p style=\"margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;")
            .Append("line-height:1.7;color:#191c1e;\">Hello ")
            .Append(Encode(string.IsNullOrWhiteSpace(message.Name) ? "there" : message.Name))
            .Append(",</p>");
        body.Append("<div style=\"margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;")
            .Append("line-height:1.75;color:#191c1e;\">")
            .Append(Paragraphs(replyBody))
            .Append("</div>");
        body.Append("<p style=\"margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;")
            .Append("line-height:1.65;color:#191c1e;\">Kind regards,</p>");
        body.Append("<p style=\"margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;")
            .Append("font-weight:700;color:#050d24;\">").Append(Encode(brand.Name)).Append("</p>");
        body.Append("<div style=\"margin:24px 0 0;padding:14px 16px;background:#f7f9fc;border-radius:10px;")
            .Append("font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5d6475;\">")
            .Append("<strong style=\"color:#050d24;\">Your original message</strong><br>")
            .Append(Encode(message.Message)).Append("</div>");

        var text = Text(
            subject,
            $"Hello {(string.IsNullOrWhiteSpace(message.Name) ? "there" : message.Name)},",
            replyBody,
            "Kind regards,",
            brand.Name,
            "Your original message:",
            message.Message,
            brand.WebsiteUrl ?? "");

        return new EmailContent(
            Layout(brand, subject, body.ToString()),
            text);
    }

    private static string Layout(EmailBrand brand, string preheader, string inner)
    {
        var footer = Footer(brand);
        var year = DateTime.UtcNow.Year;

        return
            "<!doctype html><html lang=\"en\" dir=\"ltr\"><head>" +
            "<meta charset=\"utf-8\" />" +
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />" +
            "<title>" + Encode(preheader) + "</title></head>" +
            "<body style=\"margin:0;padding:0;background:#eef2f7;\">" +
            "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;\">" +
            Encode(preheader) + "</div>" +
            "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" " +
            "style=\"background:#eef2f7;\"><tr><td align=\"center\" style=\"padding:28px 12px;\">" +
            "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" " +
            "style=\"max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;" +
            "box-shadow:0 10px 34px rgba(5,13,36,0.12);\">" +
            "<tr><td style=\"background-color:#050d24;" +
            "background-image:linear-gradient(135deg,#050d24 0%,#0e3b9c 62%,#1a4fcf 100%);" +
            "padding:28px 32px 24px;\">" +
            "<img src=\"cid:" + LogoContentId + "\" width=\"190\" alt=\"" + Encode(brand.Name) + "\" " +
            "style=\"display:block;border:0;outline:none;text-decoration:none;max-width:190px;height:auto;\" />" +
            "<div style=\"height:3px;width:46px;background:#d4af37;border-radius:2px;margin:18px 0 10px;\"></div>" +
            "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.26em;" +
            "text-transform:uppercase;color:#d4af37;font-weight:700;\">" + Encode(brand.Tagline) + "</div>" +
            "</td></tr>" +
            "<tr><td style=\"padding:34px 32px 28px;background:#ffffff;\">" + inner + "</td></tr>" +
            "<tr><td style=\"padding:22px 32px 24px;background:#050d24;\">" + footer + "</td></tr>" +
            "</table>" +
            "<div style=\"max-width:640px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;" +
            "font-size:11px;line-height:1.6;color:#8a92a3;text-align:center;\">" +
            "&copy; " + year + " " + Encode(brand.Name) + ". This message was sent in response to your enquiry." +
            "</div></td></tr></table></body></html>";
    }

    private static string Footer(EmailBrand brand)
    {
        var sb = new StringBuilder();
        sb.Append("<div style=\"font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;")
            .Append("color:#ffffff;letter-spacing:-0.01em;\">").Append(Encode(brand.Name)).Append("</div>");
        sb.Append("<div style=\"margin-top:3px;font-family:Arial,Helvetica,sans-serif;font-size:9px;")
            .Append("letter-spacing:0.24em;text-transform:uppercase;color:#d4af37;font-weight:700;\">")
            .Append(Encode(brand.Tagline)).Append("</div>");

        var contact = new List<string>();
        if (!string.IsNullOrWhiteSpace(brand.Address)) contact.Add(Encode(brand.Address));
        if (!string.IsNullOrWhiteSpace(brand.Phone)) contact.Add(Encode(brand.Phone));
        if (!string.IsNullOrWhiteSpace(brand.ContactEmail))
            contact.Add("<a href=\"mailto:" + Encode(brand.ContactEmail) + "\" style=\"color:#aeb9d1;text-decoration:none;\">" +
                Encode(brand.ContactEmail) + "</a>");
        if (contact.Count > 0)
        {
            sb.Append("<div style=\"margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;")
                .Append("line-height:1.7;color:#aeb9d1;\">").Append(string.Join("<br>", contact)).Append("</div>");
        }

        var links = new List<string>();
        if (brand.WebsiteUrl is not null)
            links.Add("<a href=\"" + Encode(brand.WebsiteUrl) + "\" style=\"color:#d4af37;text-decoration:none;\">Website</a>");
        foreach (var (label, url) in brand.Social)
        {
            links.Add("<a href=\"" + Encode(url) + "\" style=\"color:#d4af37;text-decoration:none;\">" +
                Encode(label) + "</a>");
        }
        if (links.Count > 0)
        {
            sb.Append("<div style=\"margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;")
                .Append("line-height:1.6;\">").Append(string.Join(" &nbsp;&middot;&nbsp; ", links)).Append("</div>");
        }

        return sb.ToString();
    }

    private static string Eyebrow(string text) =>
        "<div style=\"margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:10px;" +
        "letter-spacing:0.24em;text-transform:uppercase;color:#7d621b;font-weight:700;\">" +
        Encode(text) + "</div>";

    private static string Callout(string label, string value, string? productPath, string accent)
    {
        var link = productPath is null
            ? ""
            : "<div style=\"margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;" +
              "color:#5d6475;\">" + Encode(productPath) + "</div>";
        return "<div style=\"margin:0 0 22px;padding:14px 16px;border-left:3px solid " + accent + ";" +
               "background:#f7f9fc;border-radius:0 10px 10px 0;\">" +
               "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.22em;" +
               "text-transform:uppercase;color:#7d621b;font-weight:700;\">" + Encode(label) + "</div>" +
               "<div style=\"margin-top:3px;font-family:Georgia,'Times New Roman',serif;font-size:17px;" +
               "font-weight:700;color:#050d24;\">" + value + "</div>" + link + "</div>";
    }

    private static string Cta(string url, string label) =>
        "<div style=\"margin:24px 0 0;\"><a href=\"" + Encode(url) + "\" " +
        "style=\"display:inline-block;padding:12px 20px;border-radius:8px;background:#0e3b9c;" +
        "font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;" +
        "text-decoration:none;\">" + Encode(label) + "</a></div>";

    private static string Paragraphs(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        return string.Join(
            "<br><br>",
            value.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n')
                .Select(line => Encode(line.Trim()))
                .Where(line => line.Length > 0));
    }

    private static string Encode(string? value) => WebUtility.HtmlEncode(value ?? "");

    private static string Text(params string?[] blocks) =>
        string.Join(
            Environment.NewLine + Environment.NewLine,
            blocks.Where(block => !string.IsNullOrWhiteSpace(block))) +
        Environment.NewLine + Environment.NewLine +
        "--" + Environment.NewLine +
        "Albaik Group of Companies - The Mark of Pure Perfection";
}
