using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class ThreatIntelligenceController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public ThreatIntelligenceController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var scans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .Where(s => s.TenantId == tid && s.Status == ScanStatus.Completed)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .Take(100)
            .ToListAsync(ct);

        var latest = scans
            .GroupBy(s => s.AssetId)
            .Select(g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First())
            .ToList();

        var findings = latest.SelectMany(s => s.Findings.Select(f => new
        {
            Domain = s.Asset != null ? s.Asset.Domain : "Unknown",
            f.CheckKey,
            f.Title,
            f.Severity,
            f.Passed,
            f.Detail,
            f.Recommendation
        })).Where(f => f.Severity != Severity.Info).ToList();

        var exposedPorts = findings.Count(f => !f.Passed && f.CheckKey.StartsWith("asm.port."));
        var emailThreats = findings.Count(f => !f.Passed && f.CheckKey.StartsWith("email."));
        var webThreats = findings.Count(f => !f.Passed && (f.CheckKey.StartsWith("headers.") || f.CheckKey.StartsWith("http.")));
        var dnsThreats = findings.Count(f => !f.Passed && f.CheckKey.StartsWith("dns."));

        var threatScore = Math.Min(100,
            (exposedPorts * 12) +
            (emailThreats * 10) +
            (webThreats * 8) +
            (dnsThreats * 6));

        var threatLevel =
            threatScore >= 75 ? "Critical" :
            threatScore >= 50 ? "High" :
            threatScore >= 25 ? "Medium" :
            "Low";

        var indicators = findings
            .Where(f => !f.Passed)
            .OrderByDescending(f => f.Severity)
            .ThenBy(f => f.Domain)
            .Take(30)
            .Select(f => new
            {
                f.Domain,
                Indicator = f.CheckKey,
                Type = TypeFor(f.CheckKey),
                Severity = f.Severity.ToString(),
                Evidence = f.Detail ?? f.Title,
                Recommendation = f.Recommendation ?? "Review and remediate this threat indicator."
            })
            .ToList();

        var domainRisk = latest
            .Select(s =>
            {
                var failed = s.Findings.Count(f => !f.Passed && f.Severity != Severity.Info);
                var high = s.Findings.Count(f => !f.Passed && f.Severity is Severity.High or Severity.Critical);
                var asm = s.Findings.Count(f => !f.Passed && f.CheckKey.StartsWith("asm."));
                var risk = Math.Min(100, failed * 6 + high * 10 + asm * 12);

                return new
                {
                    domain = s.Asset != null ? s.Asset.Domain : "Unknown",
                    score = s.Score,
                    risk,
                    riskLevel = risk >= 75 ? "Critical" : risk >= 50 ? "High" : risk >= 25 ? "Medium" : "Low",
                    lastSeenUtc = s.CompletedUtc
                };
            })
            .OrderByDescending(x => x.risk)
            .Take(15)
            .ToList();

        var actions = indicators
            .Select(i => i.Recommendation)
            .Distinct()
            .Take(8)
            .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            threatScore,
            threatLevel,
            monitoredAssets = latest.Count,
            exposedPorts,
            emailThreats,
            webThreats,
            dnsThreats,
            indicators,
            domainRisk,
            actions
        });
    }

    private static string TypeFor(string key)
    {
        if (key.StartsWith("asm.port.")) return "Exposed Service";
        if (key.StartsWith("email.")) return "Email Spoofing Risk";
        if (key.StartsWith("headers.")) return "Web Header Weakness";
        if (key.StartsWith("http.")) return "Web Exposure";
        if (key.StartsWith("dns.")) return "DNS Hygiene";
        if (key.StartsWith("ssl.")) return "TLS Risk";
        return "Security Signal";
    }
}
