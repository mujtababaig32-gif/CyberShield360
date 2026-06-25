using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class NotificationsController : ApiControllerBase
{
    private readonly ICurrentUser _user;
    private readonly ApplicationDbContext _db;

    public NotificationsController(ICurrentUser user, ApplicationDbContext db)
    {
        _user = user;
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tenantId)
            return Unauthorized();

        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(100)
            .ToListAsync(ct);

        var failedFindings = await _db.ScanFindings
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId && !x.Passed)
            .GroupBy(x => x.Severity)
            .Select(g => new { severity = g.Key.ToString(), count = g.Count() })
            .ToListAsync(ct);

        var openRisks = await _db.Risks
            .AsNoTracking()
            .CountAsync(x => x.TenantId == tenantId && x.Status != CyberShield360.Domain.Enums.RiskStatus.Closed, ct);

        var openVulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .CountAsync(x => x.TenantId == tenantId && x.Status != CyberShield360.Domain.Enums.VulnerabilityStatus.Remediated, ct);

        var items = notifications.Select(x => new
        {
            id = x.Id,
            title = x.Subject,
            message = StripHtml(x.Body),
            category = GetCategory(x.Subject, x.Body),
            severity = GetSeverity(x.Subject, x.Body, x.Sent, x.Error),
            status = x.Sent ? "Delivered" : "Pending",
            channel = x.Channel.ToString(),
            recipient = x.Recipient,
            error = x.Error,
            createdUtc = x.CreatedAtUtc,
            sentAtUtc = x.SentAtUtc
        }).ToList();

        var categories = items
            .GroupBy(x => x.category)
            .Select(g => new { name = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalNotifications = items.Count,
            unreadNotifications = items.Count(x => x.status != "Delivered"),
            criticalNotifications = items.Count(x => x.severity == "Critical"),
            warningNotifications = items.Count(x => x.severity == "Warning"),
            openRisks,
            openVulnerabilities,
            failedFindings,
            notifications = items,
            categories,
            recommendations = BuildRecommendations(items.Count, openRisks, openVulnerabilities)
        });
    }

    private static string[] BuildRecommendations(int notificationCount, int openRisks, int openVulnerabilities)
    {
        var list = new List<string>();

        if (notificationCount == 0)
            list.Add("No notification events are recorded yet. Connect SMTP and trigger invitations or security workflows to validate delivery.");

        if (openRisks > 0)
            list.Add($"There are {openRisks} open risks. Send owner reminders and review remediation progress.");

        if (openVulnerabilities > 0)
            list.Add($"There are {openVulnerabilities} open vulnerabilities. Notify owners for high-priority remediation.");

        list.Add("Configure production email delivery using verified-domain SMTP or SendGrid before customer launch.");

        return list.Distinct().Take(4).ToArray();
    }

    private static string GetCategory(string subject, string body)
    {
        var value = $"{subject} {body}".ToLowerInvariant();

        if (value.Contains("invite") || value.Contains("invitation")) return "User Invitation";
        if (value.Contains("scan")) return "Scan";
        if (value.Contains("risk")) return "Risk";
        if (value.Contains("vulnerab")) return "Vulnerability";
        if (value.Contains("billing") || value.Contains("subscription")) return "Billing";
        if (value.Contains("compliance") || value.Contains("audit")) return "Compliance";

        return "System";
    }

    private static string GetSeverity(string subject, string body, bool sent, string? error)
    {
        if (!sent && !string.IsNullOrWhiteSpace(error)) return "Critical";

        var value = $"{subject} {body} {error}".ToLowerInvariant();

        if (value.Contains("critical") || value.Contains("failed") || value.Contains("error")) return "Critical";
        if (value.Contains("warning") || value.Contains("risk") || value.Contains("vulnerability")) return "Warning";

        return "Info";
    }

    private static string StripHtml(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";

        var text = System.Text.RegularExpressions.Regex.Replace(value, "<.*?>", " ");
        text = System.Net.WebUtility.HtmlDecode(text);
        text = System.Text.RegularExpressions.Regex.Replace(text, "\\s+", " ").Trim();

        return text.Length > 260 ? text[..260] + "..." : text;
    }
}
