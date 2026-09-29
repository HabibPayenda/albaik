using System.ComponentModel.DataAnnotations;
using Albaik.Api.Data;
using Albaik.Api.Dtos;
using Albaik.Api.Models;
using Albaik.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<ContactController> _log;

    public ContactController(AppDbContext db, IEmailSender email, ILogger<ContactController> log)
    {
        _db = db;
        _email = email;
        _log = log;
    }

    [HttpPost]
    public async Task<ActionResult<object>> Submit([FromBody] ContactInput input, CancellationToken ct)
    {
        // Honeypot: a real browser never fills this hidden field.
        if (!string.IsNullOrWhiteSpace(input.Website))
        {
            _log.LogWarning("Discarded contact submission that filled the honeypot field.");
            return Ok(new { ok = true, delivered = false, message = "Thank you — your message has been received." });
        }

        if (string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.Message))
            return BadRequest(new { message = "Please provide your name and a message." });

        if (!new EmailAddressAttribute().IsValid(input.Email))
            return BadRequest(new { message = "Please provide a valid email address." });

        var kind = string.IsNullOrWhiteSpace(input.Kind) ? "contact" : input.Kind.Trim().ToLowerInvariant();
        if (kind is not ("contact" or "wholesale" or "product" or "newsletter")) kind = "contact";

        /*
         * Resolve the product server-side from the slug rather than accepting a product
         * name from the client. The slug is the only thing the product page sends, so the
         * name in the notification email is always the catalogue's own — a visitor cannot
         * make an enquiry appear to be about a product that does not exist, and renaming a
         * product in the dashboard does not leave stale names in old enquiries.
         */
        string? productName = null;
        string? productSlug = null;
        if (!string.IsNullOrWhiteSpace(input.ProductSlug))
        {
            var slug = input.ProductSlug.Trim();
            var match = await _db.Products
                .Where(p => p.Slug == slug)
                .Select(p => new { p.Slug, p.Name })
                .FirstOrDefaultAsync(ct);
            if (match is not null)
            {
                productSlug = match.Slug;
                productName = match.Name;
            }
            else
            {
                _log.LogWarning("Contact enquiry referenced unknown product slug {Slug}.", slug);
            }
        }

        var message = new ContactMessage
        {
            Name = input.Name.Trim(),
            Email = input.Email.Trim(),
            Phone = input.Phone?.Trim(),
            Company = input.Company?.Trim(),
            Subject = input.Subject?.Trim(),
            Message = input.Message.Trim(),
            Kind = kind,
            ProductSlug = productSlug,
            ProductName = productName,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            CreatedAt = DateTime.UtcNow
        };

        var siteName = await _db.SiteSettings.Where(s => s.Key == "site.name")
            .Select(s => s.Value).FirstOrDefaultAsync(ct) ?? "Albaik Group of Companies";

        var notify = await _email.SendContactNotificationAsync(message, siteName, ct);
        message.EmailDelivered = notify.Delivered;
        message.DeliveryError = notify.Error;

        if (notify.Delivered && !string.IsNullOrWhiteSpace(message.Email))
            await _email.SendAutoReplyAsync(message, siteName, ct);

        _db.ContactMessages.Add(message);
        await _db.SaveChangesAsync(ct);

        _log.LogInformation("Contact message #{Id} stored ({Kind}); email delivered = {Delivered}.",
            message.Id, kind, notify.Delivered);

        return Ok(new
        {
            ok = true,
            delivered = notify.Delivered,
            id = message.Id,
            message = "Thank you — your message has been received and the Albaik team will respond shortly."
        });
    }

    /// <summary>Lightweight newsletter opt-in used by the footer form.</summary>
    [HttpPost("newsletter")]
    public async Task<ActionResult<object>> Newsletter([FromBody] ContactInput input, CancellationToken ct)
    {
        if (!new EmailAddressAttribute().IsValid(input.Email))
            return BadRequest(new { message = "Please provide a valid email address." });

        var email = input.Email.Trim().ToLowerInvariant();

        var exists = await _db.ContactMessages.AnyAsync(m => m.Kind == "newsletter" && m.Email == email, ct);
        if (exists)
            return Ok(new { ok = true, message = "You are already on the Albaik mailing list." });

        _db.ContactMessages.Add(new ContactMessage
        {
            Name = string.IsNullOrWhiteSpace(input.Name) ? "Mailing list subscriber" : input.Name.Trim(),
            Email = email,
            Message = "Requested to join the Albaik mailing list.",
            Kind = "newsletter",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
        });
        await _db.SaveChangesAsync(ct);

        return Ok(new { ok = true, message = "Thank you — you have been added to the Albaik mailing list." });
    }
}
