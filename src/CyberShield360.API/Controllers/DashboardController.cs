using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class DashboardController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public DashboardController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("posture")]
    public async Task<IActionResult> Posture(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .ToListAsync(ct);

        var openVulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .Where(v => v.TenantId == tid && v.Status == VulnerabilityStatus.Open)
            .ToListAsync(ct);

        var openRisks = await _db.Risks
            .AsNoTracking()
            .Where(r => r.TenantId == tid && r.Status != RiskStatus.Closed)
            .ToListAsync(ct);

        var activeAlerts = await _db.BrandAlerts
            .AsNoTracking()
            .Where(a =>
                a.TenantId == tid &&
                (a.Status == AlertStatus.New || a.Status == AlertStatus.Investigating))
            .ToListAsync(ct);

        var trainingTotal = await _db.TrainingEnrollments
            .AsNoTracking()
            .CountAsync(e => e.TenantId == tid, ct);

        var trainingCompleted = await _db.TrainingEnrollments
            .AsNoTracking()
            .CountAsync(e => e.TenantId == tid && e.Status == TrainingStatus.Completed, ct);

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

        var latestFullScans = scans
            .GroupBy(s => s.AssetId)
            .Select(g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First())
            .ToList();

        var evaluatedFindings = latestFullScans
            .SelectMany(s => s.Findings)
            .Where(f => f.Severity != Severity.Info)
            .ToList();

        var failedFindings = evaluatedFindings.Where(f => !f.Passed).ToList();
        var passedFindings = evaluatedFindings.Where(f => f.Passed).ToList();
        var highCriticalFindings = failedFindings.Count(f => f.Severity is Severity.High or Severity.Critical);

        var overallScore = latestFullScans.Any()
            ? (int)Math.Round(latestFullScans.Average(s => s.Score))
            : 0;

        var overallGrade = GetGrade(overallScore);
        var trainingCompletionPercent = trainingTotal > 0
            ? (int)Math.Round(trainingCompleted / (double)trainingTotal * 100)
            : 0;

        var scoreTrend = scans
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

        var vulnerabilityBySeverity = openVulnerabilities
            .GroupBy(v => v.Severity)
            .Select(g => new
            {
                severity = g.Key.ToString(),
                count = g.Count()
            })
            .OrderByDescending(x => SeverityRank(x.severity))
            .ToList();

        var findingBySeverity = failedFindings
            .GroupBy(f => f.Severity)
            .Select(g => new
            {
                severity = g.Key.ToString(),
                count = g.Count()
            })
            .OrderByDescending(x => SeverityRank(x.severity))
            .ToList();

        var weakestAssets = latestFullScans
            .OrderBy(s => s.Score)
            .Take(5)
            .Select(s => new
            {
                assetId = s.AssetId,
                domain = s.Asset != null ? s.Asset.Domain : "Unknown",
                score = s.Score,
                grade = s.Grade.ToString(),
                failedFindings = s.Findings.Count(f => !f.Passed && f.Severity != Severity.Info),
                lastScanUtc = s.CompletedUtc ?? s.CreatedAtUtc
            })
            .ToList();

        var latestScans = latestFullScans
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .Take(6)
            .Select(s => new
            {
                scanId = s.Id,
                assetId = s.AssetId,
                domain = s.Asset != null ? s.Asset.Domain : "Unknown",
                score = s.Score,
                grade = s.Grade.ToString(),
                failedFindings = s.Findings.Count(f => !f.Passed && f.Severity != Severity.Info),
                completedUtc = s.CompletedUtc ?? s.CreatedAtUtc
            })
            .ToList();

        var executiveActions = BuildExecutiveActions(
            overallScore,
            failedFindings,
            openVulnerabilities.Count,
            openRisks.Count,
            latestFullScans.Count,
            assets.Count);

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            overallScore,
            overallGrade,
            postureStatus = GetPostureStatus(overallScore),
            assetCount = assets.Count,
            monitoredAssetCount = assets.Count(a => a.MonitoringEnabled),
            fullPostureAssets = latestFullScans.Count,
            openVulnerabilities = openVulnerabilities.Count,
            criticalVulnerabilities = openVulnerabilities.Count(v => v.Severity == Severity.Critical),
            highVulnerabilities = openVulnerabilities.Count(v => v.Severity == Severity.High),
            openRisks = openRisks.Count,
            activeBrandAlerts = activeAlerts.Count,
            trainingCompletionPercent,
            totalChecks = evaluatedFindings.Count,
            passedFindings = passedFindings.Count,
            failedFindings = failedFindings.Count,
            highCriticalFindings,
            latestScanUtc = latestFullScans
                .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
                .Select(s => (DateTime?)(s.CompletedUtc ?? s.CreatedAtUtc))
                .FirstOrDefault(),
            vulnerabilityBySeverity,
            findingBySeverity,
            scoreTrend,
            weakestAssets,
            latestScans,
            executiveActions
        });
    }

    private static string GetGrade(int score) =>
        score >= 90 ? "A" :
        score >= 80 ? "B" :
        score >= 70 ? "C" :
        score >= 60 ? "D" :
        "F";

    private static string GetPostureStatus(int score) =>
        score >= 85 ? "Strong" :
        score >= 70 ? "Moderate" :
        score >= 50 ? "Elevated Risk" :
        "High Risk";

    private static int SeverityRank(string severity) => severity switch
    {
        "Critical" => 4,
        "High" => 3,
        "Medium" => 2,
        "Low" => 1,
        _ => 0
    };

    private static string[] BuildExecutiveActions(
        int score,
        List<ScanFinding> failedFindings,
        int openVulnerabilities,
        int openRisks,
        int fullPostureAssets,
        int totalAssets)
    {
        var actions = new List<string>();

        var priorityRecommendations = failedFindings
            .Where(f => f.Severity is Severity.Critical or Severity.High)
            .Where(f => !string.IsNullOrWhiteSpace(f.Recommendation))
            .Select(f => f.Recommendation!)
            .Distinct()
            .Take(3)
            .ToList();

        actions.AddRange(priorityRecommendations);

        if (fullPostureAssets < totalAssets)
            actions.Add("Run Full Posture scans on all monitored assets to complete executive visibility.");

        if (openVulnerabilities > 0)
            actions.Add("Review and close open vulnerabilities with priority on Critical and High severity items.");

        if (openRisks > 0)
            actions.Add("Review open risk register items and update mitigation owners and due dates.");

        if (score < 70)
            actions.Add("Prioritize remediation of failed high-impact controls before external reporting or audit readiness review.");

        if (!actions.Any())
            actions.Add("Maintain scheduled Full Posture scans and continue monitoring for posture drift.");

        return actions.Take(6).ToArray();
    }
}
