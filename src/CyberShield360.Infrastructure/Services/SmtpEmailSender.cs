using System.Net;
using System.Net.Mail;
using CyberShield360.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CyberShield360.Infrastructure.Services;

public class SmtpSettings
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    public string? Password { get; set; }
    public bool EnableSsl { get; set; } = true;
    public string FromAddress { get; set; } = "no-reply@cybershield360.io";
    public string FromName { get; set; } = "CyberShield360 By Mujtaba";
}

public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpSettings _s;
    private readonly ILogger<SmtpEmailSender> _logger;
    public SmtpEmailSender(IOptions<SmtpSettings> opt, ILogger<SmtpEmailSender> logger)
    { _s = opt.Value; _logger = logger; }

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        try
        {
            using var client = new SmtpClient(_s.Host, _s.Port) { EnableSsl = _s.EnableSsl };
            if (!string.IsNullOrEmpty(_s.User))
                client.Credentials = new NetworkCredential(_s.User, _s.Password);
            using var msg = new MailMessage
            {
                From = new MailAddress(_s.FromAddress, _s.FromName),
                Subject = subject, Body = htmlBody, IsBodyHtml = true
            };
            msg.To.Add(to);
            await client.SendMailAsync(msg, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            throw;
        }
    }
}
