using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class AssetInventoryController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public AssetInventoryController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .ToListAsync(ct);

        var scans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Findings)
            .Where(s => s.TenantId == tid && s.Status == ScanStatus.Completed)
            .OrderByDescending(s => s.CompletedUtc)
            .ToListAsync(ct);

        var latestByAsset = scans
            .GroupBy(s => s.AssetId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.CompletedUtc).First());

        var inventory = assets.Select(asset =>
        {
            latestByAsset.TryGetValue(asset.Id, out var scan);

            var findings = scan?.Findings?.ToList() ?? new();
            var failed = findings.Count(f => !f.Passed);
            var high = findings.Count(f => !f.Passed && f.Severity == Severity.High);
            var critical = findings.Count(f => !f.Passed && f.Severity == Severity.Critical);
            var asmFailed = findings.Count(f => !f.Passed && f.CheckKey.StartsWith("asm."));

            var internetFacing = findings.Any(f =>
                f.CheckKey == "http.https_status" ||
                f.CheckKey == "asm.port.80" ||
                f.CheckKey == "asm.port.443");

            var tech = findings
                .Where(f => f.CheckKey == "asm.tech_stack")
                .Select(f => f.Detail)
                .FirstOrDefault();

            var riskScore = Math.Min(100,
                (failed * 5) +
                (high * 10) +
                (critical * 20) +
                (asmFailed * 8));

            var criticality =
                asset.IsPrimary ? "High" :
                riskScore >= 70 ? "High" :
                riskScore >= 40 ? "Medium" :
                "Low";

            var environment =
                asset.Domain.Contains("dev") || asset.Domain.Contains("test") || asset.Domain.Contains("staging")
                    ? "Non-Production"
                    : "Production";

            var owner =
                asset.IsPrimary ? "Security / IT Owner" : "Application Owner";

            var riskRating =
                riskScore >= 75 ? "Critical" :
                riskScore >= 50 ? "High" :
                riskScore >= 25 ? "Medium" :
                "Low";

            var action =
                riskRating switch
                {
                    "Critical" => "Immediate remediation required. Assign owner and review exposed services.",
                    "High" => "Prioritize remediation in the next sprint or security cycle.",
                    "Medium" => "Track remediation and validate controls in the next scheduled scan.",
                    _ => "Maintain monitoring and review periodically."
                };

            return new
            {
                id = asset.Id,
                domain = asset.Domain,
                displayName = asset.DisplayName,
                isPrimary = asset.IsPrimary,
                monitoringEnabled = asset.MonitoringEnabled,
                environment,
                criticality,
                owner,
                internetFacing,
                latestScore = scan?.Score ?? 0,
                latestGrade = scan?.Grade.ToString() ?? "-",
                lastScannedUtc = scan?.CompletedUtc,
                failedFindings = failed,
                highFindings = high,
                criticalFindings = critical,
                attackSurfaceFindings = asmFailed,
                technology = string.IsNullOrWhiteSpace(tech) ? "Unknown" : tech,
                riskScore,
                riskRating,
                recommendedAction = action
            };
        })
        .OrderByDescending(a => a.riskScore)
        .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalAssets = inventory.Count,
            productionAssets = inventory.Count(a => a.environment == "Production"),
            internetFacingAssets = inventory.Count(a => a.internetFacing),
            highCriticalityAssets = inventory.Count(a => a.criticality == "High"),
            highRiskAssets = inventory.Count(a => a.riskRating == "High" || a.riskRating == "Critical"),
            assets = inventory
        });
    }
}