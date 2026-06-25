using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class FrameworkMappingController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public FrameworkMappingController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .ToListAsync(ct);

        var scans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Findings)
            .Where(s => s.TenantId == tid && s.Status == ScanStatus.Completed && s.Type == ScanType.FullPosture)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .Take(250)
            .ToListAsync(ct);

        var latestScans = scans
            .GroupBy(s => s.AssetId)
            .Select(g => g.First())
            .ToList();

        var findings = latestScans
            .SelectMany(s => s.Findings)
            .Where(f => f.Severity != Severity.Info)
            .ToList();

        var vulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .Where(v => v.TenantId == tid)
            .ToListAsync(ct);

        var risks = await _db.Risks
            .AsNoTracking()
            .Where(r => r.TenantId == tid)
            .ToListAsync(ct);

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tid)
            .ToListAsync(ct);

        var totalChecks = findings.Count;
        var passedChecks = findings.Count(f => f.Passed);
        var failedChecks = findings.Count(f => !f.Passed);
        var highCriticalFailed = findings.Count(f => !f.Passed && f.Severity is Severity.High or Severity.Critical);

        int ScoreFor(params string[] prefixes)
        {
            var scoped = findings
                .Where(f => prefixes.Any(p => f.CheckKey.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            if (!scoped.Any())
                return totalChecks == 0 ? 0 : (int)Math.Round(passedChecks * 100.0 / totalChecks);

            return (int)Math.Round(scoped.Count(f => f.Passed) * 100.0 / scoped.Count);
        }

        static string StatusFor(int score)
        {
            if (score >= 85) return "Implemented";
            if (score >= 65) return "Partial";
            return "Needs Evidence";
        }

        var isoScore = (int)Math.Round(new[] { ScoreFor("headers.", "http."), ScoreFor("ssl."), ScoreFor("dns."), ScoreFor("email."), ScoreFor("asm.") }.Average());
        var nistScore = (int)Math.Round(new[] { ScoreFor("asm."), ScoreFor("headers.", "http."), ScoreFor("dns."), ScoreFor("ssl.") }.Average());
        var socScore = (int)Math.Round(new[] { ScoreFor("headers."), ScoreFor("email."), ScoreFor("ssl."), users.Any() ? 80 : 45 }.Average());
        var cisScore = (int)Math.Round(new[] { ScoreFor("asm."), ScoreFor("dns."), ScoreFor("headers."), vulnerabilities.Any() ? Math.Max(0, 100 - vulnerabilities.Count(v => v.Status == VulnerabilityStatus.Open) * 10) : 80 }.Average());

        var frameworks = new[]
        {
            Framework("ISO 27001", "2022", isoScore, 18),
            Framework("NIST CSF", "2.0", nistScore, 22),
            Framework("SOC 2", "Trust Services Criteria", socScore, 15),
            Framework("CIS Controls", "v8", cisScore, 20)
        };

        var controls = new[]
        {
            Control("ISO 27001", "A.8.8", "Management of technical vulnerabilities", "Vulnerability Management", vulnerabilities.Any(v => v.Status == VulnerabilityStatus.Open) ? "Partial" : StatusFor(cisScore), "Vulnerability Register + Scan Findings", "Security Analyst", vulnerabilities.Any(v => v.Status == VulnerabilityStatus.Open) ? "Open vulnerabilities require remediation evidence." : "Evidence is available."),
            Control("ISO 27001", "A.5.15", "Access control", "Identity & Access", users.Any() ? "Partial" : "Needs Evidence", "User records + RBAC", "IT Manager", "Attach MFA and access review evidence."),
            Control("NIST CSF", "ID.AM", "Asset Management", "Identify", assets.Any() ? "Implemented" : "Needs Evidence", "Asset Inventory", "IT Operations", assets.Any() ? "Asset register exists." : "Add assets to inventory."),
            Control("NIST CSF", "PR.PS", "Platform security", "Protect", StatusFor(ScoreFor("headers.", "ssl.")), "Security headers + TLS checks", "Security Officer", "Improve missing headers and TLS controls."),
            Control("SOC 2", "CC6.1", "Logical access controls", "Security", users.Any() ? "Partial" : "Needs Evidence", "User records", "IT Manager", "Collect access review and MFA evidence."),
            Control("SOC 2", "CC7.1", "System operations monitoring", "Availability", latestScans.Any() ? "Partial" : "Needs Evidence", "Full posture scans", "SOC Lead", "Maintain recurring full posture scans."),
            Control("CIS Controls", "CIS 7", "Continuous Vulnerability Management", "Vulnerability Management", failedChecks > 0 ? "Partial" : latestScans.Any() ? "Implemented" : "Needs Evidence", "Scan results and remediation workflow", "Security Analyst", "Track remediation SLA and aging."),
            Control("CIS Controls", "CIS 12", "Network Infrastructure Management", "Network", StatusFor(ScoreFor("dns.", "asm.port.")), "DNS and port exposure checks", "Infrastructure Owner", "Reduce unnecessary exposure and document exceptions.")
        };

        var gaps = controls
            .Where(c => c.status != "Implemented")
            .Select(c => new
            {
                c.framework,
                c.controlId,
                c.title,
                severity = c.status == "Needs Evidence" ? "High" : "Medium",
                c.owner,
                gap = c.gap,
                recommendation = $"Improve evidence and remediation for {c.controlId} - {c.title}."
            })
            .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalFrameworks = frameworks.Length,
            averageReadiness = frameworks.Any() ? (int)Math.Round(frameworks.Average(f => f.readiness)) : 0,
            totalMappedControls = frameworks.Sum(f => f.mappedControls),
            totalGaps = gaps.Count,
            totalSecurityChecks = totalChecks,
            passedSecurityChecks = passedChecks,
            failedSecurityChecks = failedChecks,
            highCriticalFailed,
            assetCoverage = assets.Count == 0 ? 0 : (int)Math.Round(latestScans.Count * 100.0 / assets.Count),
            frameworks,
            controls,
            gaps,
            evidenceMappings = controls.Select(c => new
            {
                c.framework,
                c.controlId,
                c.title,
                evidenceSource = c.evidence,
                evidenceStatus = c.status == "Implemented" ? "Mapped" : c.status == "Partial" ? "Needs Evidence" : "Missing",
                c.owner
            }),
            recommendations = gaps
                .Select(g => g.recommendation)
                .Distinct()
                .Take(8),
            dataQuality = new
            {
                source = "Latest FullPosture scans, vulnerabilities, risks, assets, and users",
                note = "Framework readiness is an operational mapping and should be reviewed by a compliance professional before external audit submission."
            }
        });
    }

    private static FrameworkRow Framework(string name, string version, int readiness, int mappedControls)
    {
        var passedControls = (int)Math.Round(mappedControls * readiness / 100.0);

        return new FrameworkRow(
            name,
            version,
            readiness,
            readiness >= 85 ? "Ready" : readiness >= 65 ? "In Progress" : "Needs Review",
            mappedControls,
            passedControls,
            mappedControls - passedControls);
    }

    private static ControlRow Control(
        string framework,
        string controlId,
        string title,
        string domain,
        string status,
        string evidence,
        string owner,
        string gap) => new(framework, controlId, title, domain, status, evidence, owner, gap);

    private record FrameworkRow(
        string name,
        string version,
        int readiness,
        string status,
        int mappedControls,
        int passedControls,
        int failedControls);

    private record ControlRow(
        string framework,
        string controlId,
        string title,
        string domain,
        string status,
        string evidence,
        string owner,
        string gap);
}
