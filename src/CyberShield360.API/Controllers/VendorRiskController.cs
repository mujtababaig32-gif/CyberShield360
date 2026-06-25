using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class VendorRiskController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public VendorRiskController(ApplicationDbContext db, ICurrentUser user)
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

        var latestByAsset = scans
            .GroupBy(s => s.AssetId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First());

        var vendors = assets.Select(asset =>
        {
            latestByAsset.TryGetValue(asset.Id, out var scan);
            var findings = scan?.Findings.ToList() ?? new List<CyberShield360.Domain.Entities.ScanFinding>();
            var failed = findings.Count(f => !f.Passed && f.Severity != Severity.Info);
            var high = findings.Count(f => !f.Passed && f.Severity is Severity.High or Severity.Critical);
            var emailFails = findings.Count(f => !f.Passed && f.CheckKey.StartsWith("email."));
            var asmFails = findings.Count(f => !f.Passed && f.CheckKey.StartsWith("asm."));
            var complianceRisk = scan is null ? 0 : Math.Min(100, failed * 5 + high * 10 + emailFails * 8 + asmFails * 6);

            var risk = scan is null ? "Not Assessed" :
                complianceRisk >= 75 ? "Critical" :
                complianceRisk >= 50 ? "High" :
                complianceRisk >= 25 ? "Medium" :
                "Low";

            var status = risk switch
            {
                "Critical" => "Needs Immediate Review",
                "High" => "Review Required",
                "Medium" => "Monitor",
                "Low" => "Approved",
                _ => "Assessment Required"
            };

            return new
            {
                vendorName = asset.DisplayName ?? asset.Domain,
                website = asset.Domain,
                securityScore = scan?.Score ?? 0,
                grade = scan?.Grade.ToString() ?? "N/A",
                complianceRisk,
                riskRating = risk,
                reviewStatus = status,
                businessCriticality = asset.IsPrimary ? "High" : "Medium",
                failedFindings = failed,
                highFindings = high,
                emailSecurityIssues = emailFails,
                attackSurfaceIssues = asmFails,
                lastReviewedUtc = scan?.CompletedUtc,
                recommendedAction = risk switch
                {
                    "Critical" => "Request remediation plan and review contract/security controls.",
                    "High" => "Request updated security evidence and schedule reassessment.",
                    "Medium" => "Monitor vendor and review during the next vendor cycle.",
                    "Low" => "Vendor currently acceptable based on available scan data.",
                    _ => "Run a Full Posture scan to create an evidence-backed vendor scorecard."
                }
            };
        })
        .OrderByDescending(v => v.complianceRisk)
        .ThenBy(v => v.vendorName)
        .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalVendors = vendors.Count,
            criticalVendors = vendors.Count(v => v.riskRating == "Critical"),
            highRiskVendors = vendors.Count(v => v.riskRating == "High"),
            pendingReviews = vendors.Count(v => v.reviewStatus.Contains("Review") || v.reviewStatus.Contains("Required")),
            approvedVendors = vendors.Count(v => v.reviewStatus == "Approved"),
            vendors
        });
    }
}
