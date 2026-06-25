using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class AttackPathController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public AttackPathController(ApplicationDbContext db, ICurrentUser user)
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
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .Where(s => s.TenantId == tid && s.Status == ScanStatus.Completed)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .ToListAsync(ct);

        var risks = await _db.Risks
            .AsNoTracking()
            .Where(r => r.TenantId == tid && r.Status != RiskStatus.Closed)
            .ToListAsync(ct);

        var vulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .Where(v => v.TenantId == tid && v.Status != VulnerabilityStatus.Remediated && v.Status != VulnerabilityStatus.FalsePositive)
            .ToListAsync(ct);

        var latestByAsset = scans
            .GroupBy(s => s.AssetId)
            .Select(g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First())
            .ToList();

        var crownJewels = latestByAsset
            .Select(scan =>
            {
                var failed = scan.Findings.Count(f => !f.Passed);
                var highCritical = scan.Findings.Count(f => !f.Passed && f.Severity is Severity.High or Severity.Critical);
                var exposureScore = Math.Clamp((100 - scan.Score) + (highCritical * 8) + (failed * 2), 0, 100);
                var criticality = exposureScore >= 80 ? "Critical" : exposureScore >= 60 ? "High" : exposureScore >= 35 ? "Medium" : "Low";

                return new
                {
                    id = scan.AssetId,
                    asset = scan.Asset?.Domain ?? "Unknown Asset",
                    criticality,
                    exposureScore,
                    attackPaths = highCritical + Math.Max(0, failed / 4)
                };
            })
            .OrderByDescending(x => x.exposureScore)
            .Take(8)
            .ToList();

        var attackPaths = latestByAsset
            .SelectMany(scan => scan.Findings
                .Where(f => !f.Passed && f.Severity is Severity.High or Severity.Critical)
                .Select(f => new
                {
                    id = f.Id,
                    source = "Internet-facing asset",
                    target = scan.Asset?.Domain ?? "Unknown Asset",
                    risk = f.Severity.ToString(),
                    pathLength = f.CheckKey.StartsWith("asm.port") ? 2 : 3,
                    likelihood = Math.Clamp(50 + ((int)f.Severity * 10) + Math.Max(0, 100 - scan.Score) / 3, 0, 100),
                    recommendation = string.IsNullOrWhiteSpace(f.Recommendation)
                        ? "Review and remediate the failed control, then validate with a follow-up scan."
                        : f.Recommendation
                }))
            .OrderByDescending(x => x.likelihood)
            .Take(12)
            .ToList();

        var exposureChains = attackPaths
            .Select(path => new
            {
                chain = $"{path.source} → {path.target} → {path.risk} finding",
                severity = path.risk,
                status = "Requires Review"
            })
            .ToList();

        var riskDrivenPaths = risks
            .Where(r => r.InherentScore >= 16)
            .Select(r => new
            {
                id = r.Id,
                source = "Enterprise risk register",
                target = r.Title,
                risk = r.InherentScore >= 20 ? "Critical" : "High",
                pathLength = 3,
                likelihood = Math.Clamp(r.InherentScore * 4, 0, 100),
                recommendation = string.IsNullOrWhiteSpace(r.MitigationPlan)
                    ? "Assign a mitigation plan and owner for this high-scoring risk."
                    : r.MitigationPlan
            })
            .Take(5)
            .ToList();

        var combinedPaths = attackPaths.Cast<object>().Concat(riskDrivenPaths.Cast<object>()).ToList();

        var recommendations = combinedPaths.Any()
            ? combinedPaths.Select(x => x.GetType().GetProperty("recommendation")?.GetValue(x)?.ToString())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .Take(10)
                .ToList()
            : new List<string>
            {
                assets.Any()
                    ? "Run full posture scans and register business-critical assets to build attack path evidence."
                    : "Add assets and run full posture scans to generate attack path analysis."
            };

        var averageLikelihood = combinedPaths.Any()
            ? (int)Math.Round(combinedPaths.Average(x => Convert.ToInt32(x.GetType().GetProperty("likelihood")!.GetValue(x))))
            : 0;

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            assetsInScope = assets.Count,
            vulnerabilitiesInScope = vulnerabilities.Count,
            crownJewelCount = crownJewels.Count,
            attackPathCount = combinedPaths.Count,
            criticalPaths = combinedPaths.Count(x => x.GetType().GetProperty("risk")?.GetValue(x)?.ToString() == "Critical"),
            averageLikelihood,
            crownJewels,
            attackPaths = combinedPaths,
            exposureChains,
            recommendations
        });
    }
}
