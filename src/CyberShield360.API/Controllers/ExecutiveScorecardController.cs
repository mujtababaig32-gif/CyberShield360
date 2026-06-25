using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class ExecutiveScorecardController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public ExecutiveScorecardController(ApplicationDbContext db, ICurrentUser user)
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

        var fullPostureScans = await _db.Scans
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

        var latest = fullPostureScans
            .GroupBy(s => s.AssetId)
            .Select(g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First())
            .ToList();

        var evaluatedFindings = latest
            .SelectMany(s => s.Findings.Select(f => new { Scan = s, Finding = f }))
            .Where(x => x.Finding.Severity != Severity.Info)
            .ToList();

        var failed = evaluatedFindings
            .Where(x => !x.Finding.Passed)
            .ToList();

        var score = latest.Any()
            ? (int)Math.Round(latest.Average(s => s.Score))
            : 0;

        var high = failed.Count(x => x.Finding.Severity == Severity.High);
        var critical = failed.Count(x => x.Finding.Severity == Severity.Critical);
        var highCritical = high + critical;

        var asmFailed = failed.Count(x =>
            x.Finding.CheckKey.StartsWith("asm.", StringComparison.OrdinalIgnoreCase));

        var complianceReadiness = evaluatedFindings.Any()
            ? (int)Math.Round(evaluatedFindings.Count(x => x.Finding.Passed) / (double)evaluatedFindings.Count * 100)
            : 0;

        var scoreTrend = fullPostureScans
            .Where(s => s.CompletedUtc is not null)
            .OrderBy(s => s.CompletedUtc)
            .Select(s => new
            {
                date = s.CompletedUtc!.Value.ToString("MM/dd"),
                score = s.Score,
                domain = s.Asset != null ? s.Asset.Domain : "Unknown"
            })
            .TakeLast(30)
            .ToList();

        var weakestAssets = latest
            .OrderBy(s => s.Score)
            .Take(8)
            .Select(s => new
            {
                assetId = s.AssetId,
                domain = s.Asset != null ? s.Asset.Domain : "Unknown",
                score = s.Score,
                grade = s.Grade.ToString(),
                failedFindings = s.Findings.Count(f => !f.Passed && f.Severity != Severity.Info),
                highCriticalFindings = s.Findings.Count(f =>
                    !f.Passed && f.Severity is Severity.High or Severity.Critical),
                lastScanUtc = s.CompletedUtc ?? s.CreatedAtUtc
            })
            .ToList();

        var topRisks = failed
            .GroupBy(x => new
            {
                x.Finding.Title,
                x.Finding.Severity,
                Recommendation = x.Finding.Recommendation ?? "Review and remediate this finding."
            })
            .Select(g => new
            {
                title = g.Key.Title,
                severity = g.Key.Severity.ToString(),
                recommendation = g.Key.Recommendation,
                affectedAssets = g.Select(x => x.Scan.Asset != null ? x.Scan.Asset.Domain : "Unknown")
                    .Distinct()
                    .Take(5)
                    .ToArray(),
                count = g.Count()
            })
            .OrderByDescending(x => SeverityRank(x.severity))
            .ThenByDescending(x => x.count)
            .Take(8)
            .ToList();

        var executiveActions = BuildExecutiveActions(score, topRisks.Select(r => r.recommendation).ToList(), assets.Count, latest.Count);

        var maturity =
            score >= 85 ? "Optimized" :
            score >= 70 ? "Managed" :
            score >= 50 ? "Developing" :
            "High Risk";

        var riskLevel =
            critical > 0 ? "Critical" :
            highCritical > 5 ? "High" :
            failed.Count > 5 ? "Medium" :
            "Low";

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            overallScore = score,
            overallGrade = GetGrade(score),
            maturity,
            riskLevel,
            assetCount = assets.Count,
            monitoredAssetCount = assets.Count(a => a.MonitoringEnabled),
            fullPostureCoverage = assets.Count > 0
                ? (int)Math.Round(latest.Count / (double)assets.Count * 100)
                : 0,
            totalChecks = evaluatedFindings.Count,
            passedFindings = evaluatedFindings.Count(x => x.Finding.Passed),
            failedFindings = failed.Count,
            highFindings = high,
            criticalFindings = critical,
            highCriticalFindings = highCritical,
            attackSurfaceIssues = asmFailed,
            complianceReadiness,
            latestScanUtc = latest
                .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
                .Select(s => (DateTime?)(s.CompletedUtc ?? s.CreatedAtUtc))
                .FirstOrDefault(),
            scoreTrend,
            weakestAssets,
            topRisks,
            executiveActions
        });
    }

    private static string[] BuildExecutiveActions(
        int score,
        List<string> recommendations,
        int assetCount,
        int scannedAssetCount)
    {
        var actions = recommendations
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .Take(4)
            .ToList();

        if (scannedAssetCount < assetCount)
            actions.Add("Complete Full Posture scan coverage across all monitored assets.");

        if (score < 70)
            actions.Add("Focus remediation on High/Critical scanner rule failures before customer or audit reporting.");

        if (!actions.Any())
            actions.Add("Maintain current controls, keep scheduled scans enabled, and monitor posture drift weekly.");

        return actions.Take(6).ToArray();
    }

    private static string GetGrade(int score) =>
        score >= 90 ? "A" :
        score >= 80 ? "B" :
        score >= 70 ? "C" :
        score >= 60 ? "D" :
        "F";

    private static int SeverityRank(string severity) => severity switch
    {
        "Critical" => 4,
        "High" => 3,
        "Medium" => 2,
        "Low" => 1,
        _ => 0
    };
}
