using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class ComplianceController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public ComplianceController(ApplicationDbContext db, ICurrentUser user)
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
            .OrderBy(a => a.Domain)
            .ToListAsync(ct);

        var scans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .Where(s =>
                s.TenantId == tid &&
                s.Status == ScanStatus.Completed &&
                s.Type == ScanType.FullPosture)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .Take(250)
            .ToListAsync(ct);

        var latestScans = scans
            .GroupBy(s => s.AssetId)
            .Select(g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First())
            .ToList();

        var findings = latestScans
            .SelectMany(s => s.Findings.Select(f => new { Scan = s, Finding = f }))
            .Where(x => x.Finding.Severity != Severity.Info)
            .ToList();

        var failed = findings.Where(x => !x.Finding.Passed).ToList();
        var passed = findings.Where(x => x.Finding.Passed).ToList();
        var totalControls = findings.Count;
        var overallScore = totalControls == 0
            ? 0
            : (int)Math.Round(passed.Count * 100.0 / totalControls);

        int ScoreFor(params string[] prefixes)
        {
            var scoped = findings
                .Where(x => prefixes.Any(p => x.Finding.CheckKey.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            if (!scoped.Any())
                return totalControls == 0 ? 0 : overallScore;

            return (int)Math.Round(scoped.Count(x => x.Finding.Passed) * 100.0 / scoped.Count);
        }

        static string ReadinessStatus(int score)
        {
            if (score >= 85) return "Ready";
            if (score >= 70) return "Mostly Ready";
            if (score >= 50) return "Needs Work";
            return "High Gap";
        }

        FrameworkScore Framework(string name, int score) => new(name, score, ReadinessStatus(score));

        var webScore = ScoreFor("headers.", "http.");
        var tlsScore = ScoreFor("ssl.");
        var dnsScore = ScoreFor("dns.");
        var emailScore = ScoreFor("email.");
        var asmScore = ScoreFor("asm.");

        var frameworks = new[]
        {
            Framework("ISO 27001", (int)Math.Round(new[] { webScore, tlsScore, dnsScore, emailScore, asmScore }.Average())),
            Framework("NIST CSF", (int)Math.Round(new[] { asmScore, dnsScore, tlsScore, webScore }.Average())),
            Framework("SOC 2", (int)Math.Round(new[] { webScore, tlsScore, emailScore }.Average())),
            Framework("CIS Controls", (int)Math.Round(new[] { asmScore, webScore, dnsScore }.Average()))
        };

        var categories = new[]
        {
            new { name = "Web Security", score = webScore },
            new { name = "TLS / Certificate", score = tlsScore },
            new { name = "DNS Health", score = dnsScore },
            new { name = "Email Security", score = emailScore },
            new { name = "Attack Surface", score = asmScore }
        };

        var failedControls = failed
            .OrderByDescending(x => x.Finding.Severity)
            .ThenBy(x => x.Scan.Asset?.Domain ?? string.Empty)
            .Take(25)
            .Select(x => new
            {
                domain = x.Scan.Asset?.Domain ?? "Unknown Asset",
                checkKey = x.Finding.CheckKey,
                title = x.Finding.Title,
                severity = x.Finding.Severity.ToString(),
                framework = FrameworkFor(x.Finding.CheckKey),
                control = ControlFor(x.Finding.CheckKey),
                recommendation = x.Finding.Recommendation ?? "Review and remediate this control based on business context."
            })
            .ToList();

        var domainCompliance = latestScans
            .OrderBy(s => s.Score)
            .Select(s => new
            {
                domain = s.Asset?.Domain ?? "Unknown Asset",
                score = s.Score,
                grade = s.Grade.ToString(),
                completedUtc = s.CompletedUtc ?? s.CreatedAtUtc,
                totalChecks = s.Findings.Count(f => f.Severity != Severity.Info),
                failedChecks = s.Findings.Count(f => f.Severity != Severity.Info && !f.Passed)
            })
            .ToList();

        var recommendations = failedControls
            .Select(x => x.recommendation)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .Take(8)
            .ToList();

        if (!recommendations.Any() && assets.Any())
            recommendations.Add("Maintain recurring full posture scans and keep evidence updated for audit readiness.");

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            assetCount = assets.Count,
            scannedAssets = latestScans.Count,
            totalControls,
            passedControls = passed.Count,
            failedControlsCount = failed.Count,
            criticalFailed = failed.Count(x => x.Finding.Severity == Severity.Critical),
            highFailed = failed.Count(x => x.Finding.Severity == Severity.High),
            overallScore,
            frameworks,
            domains = domainCompliance,
            categories,
            failedControls,
            recommendations,
            dataQuality = new
            {
                source = "Latest completed FullPosture scans per asset",
                assetsWithoutFullPostureScan = Math.Max(0, assets.Count - latestScans.Count),
                note = "Compliance readiness is calculated from real CyberShield360 scan findings and available tenant records."
            }
        });
    }

    private static string FrameworkFor(string checkKey)
    {
        if (checkKey.StartsWith("headers.", StringComparison.OrdinalIgnoreCase)) return "SOC 2 / NIST CSF";
        if (checkKey.StartsWith("ssl.", StringComparison.OrdinalIgnoreCase)) return "ISO 27001 / CIS";
        if (checkKey.StartsWith("dns.", StringComparison.OrdinalIgnoreCase)) return "CIS Controls";
        if (checkKey.StartsWith("email.", StringComparison.OrdinalIgnoreCase)) return "NIST CSF / SOC 2";
        if (checkKey.StartsWith("asm.", StringComparison.OrdinalIgnoreCase)) return "ISO 27001 / CIS";
        return "General Control";
    }

    private static string ControlFor(string checkKey)
    {
        if (checkKey.StartsWith("headers.", StringComparison.OrdinalIgnoreCase)) return "Secure Configuration";
        if (checkKey.StartsWith("ssl.", StringComparison.OrdinalIgnoreCase)) return "Cryptographic Protection";
        if (checkKey.StartsWith("dns.", StringComparison.OrdinalIgnoreCase)) return "Infrastructure Resilience";
        if (checkKey.StartsWith("email.", StringComparison.OrdinalIgnoreCase)) return "Email Authentication";
        if (checkKey.StartsWith("asm.", StringComparison.OrdinalIgnoreCase)) return "Attack Surface Management";
        return "Security Control";
    }

    private record FrameworkScore(string name, int score, string status);

}

