using Albaik.Api.Data;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;
using Microsoft.Extensions.DependencyInjection;

namespace Albaik.Api.Services;

/// <summary>
/// Polls the mailbox's Sent folder for replies written on a phone or another mail app.
///
/// The website only sees emails it sends itself. To surface a phone reply in the
/// dashboard, this background service reads the Sent folder over IMAP and hands each
/// message to <see cref="MailboxReplyImporter"/>. It is inert until
/// <c>Imap:Host</c> is configured, and a mailbox outage is logged rather than taking
/// the public site down.
/// </summary>
public sealed class ImapReplySyncService : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly IConfiguration _config;
    private readonly ILogger<ImapReplySyncService> _log;

    public ImapReplySyncService(
        IServiceScopeFactory scopes,
        IConfiguration config,
        ILogger<ImapReplySyncService> log)
    {
        _scopes = scopes;
        _config = config;
        _log = log;
    }

    private string? Host => Blank(_config["Imap:Host"]);
    private int Port => int.TryParse(_config["Imap:Port"], out var port) ? port : 993;
    private string? User => Blank(_config["Imap:Username"]);
    private string? Password => _config["Imap:Password"];
    private bool UseStartTls => bool.TryParse(_config["Imap:UseStartTls"], out var startTls) && startTls;
    private string? SentFolder => Blank(_config["Imap:SentFolder"]);
    private int PollMinutes => int.TryParse(_config["Imap:PollMinutes"], out var minutes)
        ? Math.Clamp(minutes, 1, 1440)
        : 2;
    private int LookbackDays => int.TryParse(_config["Imap:LookbackDays"], out var days)
        ? Math.Clamp(days, 1, 365)
        : 14;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (Host is null || !IsEnabled())
        {
            _log.LogInformation("IMAP reply sync is off: set Imap:Host, Imap:Username and Imap:Password to enable it.");
            return;
        }

        try
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception error)
            {
                _log.LogWarning(error, "IMAP reply sync failed; the next poll will retry.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(PollMinutes), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task SyncAsync(CancellationToken ct)
    {
        using var client = new ImapClient();
        await client.ConnectAsync(Host!, Port, Security(), ct);

        if (!string.IsNullOrWhiteSpace(User))
            await client.AuthenticateAsync(User!, Password ?? "", ct);

        var folder = ResolveSentFolder(client);
        await folder.OpenAsync(FolderAccess.ReadOnly, ct);

        try
        {
            var since = DateTime.UtcNow.AddDays(-LookbackDays);
            var uids = await folder.SearchAsync(SearchQuery.SentSince(since), ct);

            // A busy mailbox still only needs the recent tail; the Message-Id import
            // guard makes a repeated poll harmless.
            var recent = uids.Count > 500 ? uids.Skip(uids.Count - 500).ToList() : uids.ToList();

            var imported = 0;
            using var scope = _scopes.CreateScope();
            var importer = scope.ServiceProvider.GetRequiredService<MailboxReplyImporter>();

            foreach (var uid in recent)
            {
                ct.ThrowIfCancellationRequested();
                var message = await folder.GetMessageAsync(uid, ct);
                if (await importer.ImportAsync(message, ct)) imported += 1;
            }

            if (imported > 0)
                _log.LogInformation("IMAP reply sync imported {Count} phone replies.", imported);
        }
        finally
        {
            await folder.CloseAsync(false, ct);
            await client.DisconnectAsync(true, ct);
        }
    }

    private IMailFolder ResolveSentFolder(ImapClient client)
    {
        if (SentFolder is not null)
        {
            try
            {
                var personal = client.GetFolder(client.PersonalNamespaces[0]);
                var configured = personal.GetSubfolder(SentFolder);
                if (configured is not null) return configured;
            }
            catch (FolderNotFoundException)
            {
                // Fall through to the special-use folder / common names.
            }
        }

        try
        {
            var special = client.GetFolder(SpecialFolder.Sent);
            if (special is not null) return special;
        }
        catch (Exception error) when (error is NotSupportedException or FolderNotFoundException)
        {
            // Fall through to the common names below.
        }

        var root = client.GetFolder(client.PersonalNamespaces[0]);
        foreach (var name in new[] { "Sent", "Sent Items", "Sent Messages" })
        {
            try
            {
                var folder = root.GetSubfolder(name);
                if (folder is not null) return folder;
            }
            catch (FolderNotFoundException)
            {
                // Try the next common name.
            }
        }

        throw new InvalidOperationException(
            "The mailbox has no Sent folder. Set Imap:SentFolder to the folder name shown in the mail panel.");
    }

    private SecureSocketOptions Security() => UseStartTls
        ? SecureSocketOptions.StartTls
        : Port == 993
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.Auto;

    private bool IsEnabled() =>
        !bool.TryParse(_config["Imap:Enabled"], out var enabled) || enabled;

    private static string? Blank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
