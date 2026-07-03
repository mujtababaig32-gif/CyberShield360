using System.Text;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class SocController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public SocController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var completedFullPostureScans = await _db.Scans
            .AsNoTracking()
            .Include(x => x.Findings)
            .Include(x => x.Asset)
            .Where(x =>
                x.TenantId == tid &&
                x.Status == ScanStatus.Completed &&
                x.Type == ScanType.FullPosture)
            .OrderByDescending(x => x.CompletedUtc ?? x.CreatedAtUtc)
            .Take(300)
            .ToListAsync(ct);

        var latestScans = completedFullPostureScans
            .GroupBy(x => x.AssetId)
            .Select(g => g.OrderByDescending(x => x.CompletedUtc ?? x.CreatedAtUtc).First())
            .ToList();

        var failedSignals = latestScans
            .SelectMany(scan => scan.Findings
                .Where(f => !f.Passed && f.Severity != Severity.Info)
                .Select(f => new SocSignal(scan, f)))
            .ToList();

        var resolvedSignals = latestScans
            .SelectMany(scan => scan.Findings
                .Where(f => f.Passed && f.Severity != Severity.Info)
                .Select(f => new SocSignal(scan, f)))
            .ToList();

        var groupedAlerts = failedSignals
            .GroupBy(x => new
            {
                CheckKey = NormalizeKey(x.Finding.CheckKey),
                Title = NormalizeTitle(x.Finding.Title),
                x.Finding.Severity,
                Recommendation = NormalizeTitle(x.Finding.Recommendation ?? string.Empty)
            })
            .Select(g =>
            {
                var items = g.ToList();
                var severity = g.Key.Severity;
                var affectedAssets = items
                    .Select(x => AssetName(x.Scan))
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(x => x)
                    .Take(8)
                    .ToArray();

                var firstSeenUtc = items
                    .Min(x => x.Scan.CompletedUtc ?? x.Scan.CreatedAtUtc);

                var lastSeenUtc = items
                    .Max(x => x.Scan.CompletedUtc ?? x.Scan.CreatedAtUtc);

                var title = items.First().Finding.Title;
                var checkKey = items.First().Finding.CheckKey;
                var recommendation = items.First().Finding.Recommendation;

                return new
                {
                    id = StableAlertId(checkKey, title, severity.ToString()),
                    title,
                    severity = severity.ToString(),
                    source = checkKey,
                    status = AlertStatusFor(severity),
                    priority = PriorityFor(severity, affectedAssets.Length),
                    category = CategoryFor(checkKey),
                    mitreTactic = MitreTacticFor(checkKey),
                    affectedAssetCount = affectedAssets.Length,
                    affectedAssets,
                    occurrenceCount = items.Count,
                    firstSeenUtc,
                    lastSeenUtc,
                    createdUtc = firstSeenUtc,
                    sourceScanIds = items
                        .Select(x => x.Scan.Id)
                        .Distinct()
                        .Take(8)
                        .ToArray(),
                    recommendation = string.IsNullOrWhiteSpace(recommendation)
                        ? DefaultRecommendation(checkKey)
                        : recommendation,
                    businessImpact = BusinessImpactFor(checkKey, severity)
                };
            })
            .OrderByDescending(x => SeverityRank(x.severity))
            .ThenByDescending(x => x.affectedAssetCount)
            .ThenByDescending(x => x.occurrenceCount)
            .ThenByDescending(x => x.lastSeenUtc)
            .Take(50)
            .ToList();

        var criticalAlerts = groupedAlerts.Count(x => x.severity == Severity.Critical.ToString());
        var highAlerts = groupedAlerts.Count(x => x.severity == Severity.High.ToString());
        var mediumAlerts = groupedAlerts.Count(x => x.severity == Severity.Medium.ToString());
        var lowAlerts = groupedAlerts.Count(x => x.severity == Severity.Low.ToString());

        var statusSummary = groupedAlerts
            .GroupBy(x => x.status)
            .Select(g => new
            {
                status = g.Key,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .ToList();

        var categorySummary = groupedAlerts
            .GroupBy(x => x.category)
            .Select(g => new
            {
                category = g.Key,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            monitoredAssets = latestScans.Count,
            totalSignals = failedSignals.Count,
            groupedAlerts = groupedAlerts.Count,
            deduplicatedSignals = Math.Max(0, failedSignals.Count - groupedAlerts.Count),

            criticalAlerts,
            highAlerts,
            mediumAlerts,
            lowAlerts,

            openIncidents = groupedAlerts.Count(x => x.status != "Resolved"),
            resolvedIncidents = resolvedSignals.Count,

            mttrHours = groupedAlerts.Any(x => x.severity is "Critical" or "High") ? 4.5 : 0,

            statusSummary,
            categorySummary,
            alerts = groupedAlerts
        });
    }

    private sealed record SocSignal(SecurityScan Scan, ScanFinding Finding);

    private static string AssetName(SecurityScan scan) =>
        scan.Asset?.Domain ?? scan.Asset?.DisplayName ?? "Unknown asset";

    private static string NormalizeKey(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "unknown" : value.Trim().ToLowerInvariant();

    private static string NormalizeTitle(string? value) =>
        string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToLowerInvariant();

    private static string StableAlertId(string checkKey, string title, string severity)
    {
        var raw = $"{checkKey}-{severity}-{title}".ToLowerInvariant();
        var builder = new StringBuilder(raw.Length);

        foreach (var ch in raw)
        {
            if (char.IsLetterOrDigit(ch))
                builder.Append(ch);
            else if (builder.Length == 0 || builder[^1] != '-')
                builder.Append('-');
        }

        return builder.ToString().Trim('-');
    }

    private static int SeverityRank(string severity) => severity switch
    {
        "Critical" => 4,
        "High" => 3,
        "Medium" => 2,
        "Low" => 1,
        _ => 0
    };

    private static string AlertStatusFor(Severity severity) => severity switch
    {
        Severity.Critical => "Open",
        Severity.High => "Open",
        Severity.Medium => "In Progress",
        Severity.Low => "Monitoring",
        _ => "Resolved"
    };

    private static string PriorityFor(Severity severity, int affectedAssetCount)
    {
        if (severity == Severity.Critical)
            return "Immediate";

        if (severity == Severity.High || affectedAssetCount >= 3)
            return "Priority";

        if (severity == Severity.Medium)
            return "Planned";

        return "Monitor";
    }

    private static string CategoryFor(string checkKey)
    {
        var key = NormalizeKey(checkKey);

        if (key.StartsWith("ssl.") || key.Contains("tls") || key.Contains("https"))
            return "SSL / TLS";

        if (key.StartsWith("headers.") || key.Contains("header") || key.Contains("hsts") || key.Contains("csp"))
            return "Security Headers";

        if (key.StartsWith("dns.") || key.Contains("dns") || key.Contains("mx") || key.Contains("caa"))
            return "DNS";

        if (key.Contains("spf") || key.Contains("dkim") || key.Contains("dmarc"))
            return "Email Security";

        if (key.StartsWith("asm.") || key.Contains("port") || key.Contains("exposure"))
            return "Attack Surface";

        if (key.Contains("tech") || key.Contains("fingerprint"))
            return "Technology Exposure";

        return "Posture Finding";
    }

    private static string MitreTacticFor(string checkKey)
    {
        var key = NormalizeKey(checkKey);

        if (key.Contains("spf") || key.Contains("dkim") || key.Contains("dmarc"))
            return "Credential Access / Initial Access";

        if (key.StartsWith("asm.") || key.Contains("port") || key.Contains("exposure"))
            return "Initial Access";

        if (key.Contains("tech") || key.Contains("fingerprint") || key.StartsWith("dns."))
            return "Discovery";

        if (key.StartsWith("headers.") || key.StartsWith("ssl."))
            return "Defense Evasion / Impact";

        return "Discovery";
    }

    private static string BusinessImpactFor(string checkKey, Severity severity)
    {
        var category = CategoryFor(checkKey);
        var severityText = severity.ToString().ToLowerInvariant();

        return category switch
        {
            "Email Security" => $"This {severityText} email-security signal may increase spoofing, phishing, invoice-fraud, or brand trust risk.",
            "SSL / TLS" => $"This {severityText} transport-security signal may reduce user trust and weaken secure communication posture.",
            "Security Headers" => $"This {severityText} web-hardening signal may leave the site more exposed to browser-based attacks or policy gaps.",
            "Attack Surface" => $"This {severityText} exposure signal may increase the chance of unauthorized access or internet-facing service abuse.",
            "DNS" => $"This {severityText} DNS signal may affect trust, reliability, domain control, or email/web routing posture.",
            _ => $"This {severityText} posture signal should be reviewed because it may increase business or operational risk."
        };
    }

    private static string DefaultRecommendation(string checkKey)
    {
        var category = CategoryFor(checkKey);

        return category switch
        {
            "Email Security" => "Review SPF, DKIM, and DMARC records. Move toward stronger policy enforcement after testing.",
            "SSL / TLS" => "Review certificate validity, HTTPS enforcement, TLS posture, and renewal monitoring.",
            "Security Headers" => "Add or strengthen missing security headers such as HSTS, CSP, X-Frame-Options, and related browser controls.",
            "Attack Surface" => "Review exposed services, close unnecessary ports, and verify the asset is intentionally internet-facing.",
            "DNS" => "Review DNS records for completeness, ownership, mail routing, CAA, and domain hygiene.",
            _ => "Review the finding, confirm business impact, assign an owner, and verify remediation with a follow-up scan."
        };
    }
}
