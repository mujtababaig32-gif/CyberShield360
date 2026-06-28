using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Scans.Commands;
using CyberShield360.Domain.Entities;
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

        var vendors = await _db.Vendors
            .AsNoTracking()
            .Include(v => v.Asset)
            .Where(v => v.TenantId == tid)
            .OrderBy(v => v.VendorName)
            .ToListAsync(ct);

        var assetIds = vendors.Select(v => v.AssetId).Distinct().ToList();

        var scans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .Where(s =>
                s.TenantId == tid &&
                assetIds.Contains(s.AssetId) &&
                s.Status == ScanStatus.Completed &&
                s.Type == ScanType.FullPosture)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .ToListAsync(ct);

        var latestByAsset = scans
            .GroupBy(s => s.AssetId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First());

        var rows = vendors.Select(vendor =>
        {
            latestByAsset.TryGetValue(vendor.AssetId, out var scan);
            var findings = scan?.Findings.ToList() ?? new List<ScanFinding>();
            var failed = findings.Count(f => !f.Passed && f.Severity != Severity.Info);
            var high = findings.Count(f => !f.Passed && f.Severity is Severity.High or Severity.Critical);
            var emailFails = findings.Count(f =>
                !f.Passed &&
                (f.CheckKey.StartsWith("email.", StringComparison.OrdinalIgnoreCase) ||
                 f.CheckKey.StartsWith("spf.", StringComparison.OrdinalIgnoreCase) ||
                 f.CheckKey.StartsWith("dkim.", StringComparison.OrdinalIgnoreCase) ||
                 f.CheckKey.StartsWith("dmarc.", StringComparison.OrdinalIgnoreCase)));
            var asmFails = findings.Count(f =>
                !f.Passed &&
                (f.CheckKey.StartsWith("asm.", StringComparison.OrdinalIgnoreCase) ||
                 f.CheckKey.StartsWith("ports.", StringComparison.OrdinalIgnoreCase) ||
                 f.CheckKey.StartsWith("exposure.", StringComparison.OrdinalIgnoreCase)));

            var complianceRisk = CalculateComplianceRisk(scan, failed, high, emailFails, asmFails, vendor.BusinessCriticality);
            var risk = scan is null ? "Not Assessed" : RiskRating(complianceRisk);
            var status = ResolveReviewStatus(vendor.ReviewStatus, risk);

            return new
            {
                id = vendor.Id,
                assetId = vendor.AssetId,
                latestScanId = scan?.Id,
                vendorName = vendor.VendorName,
                website = vendor.Website,
                serviceType = vendor.ServiceType,
                contactEmail = vendor.ContactEmail,
                notes = vendor.Notes,
                securityScore = scan?.Score ?? 0,
                grade = scan?.Grade.ToString() ?? "N/A",
                complianceRisk,
                riskRating = risk,
                reviewStatus = status,
                businessCriticality = vendor.BusinessCriticality,
                failedFindings = failed,
                highFindings = high,
                emailSecurityIssues = emailFails,
                attackSurfaceIssues = asmFails,
                lastReviewedUtc = vendor.LastReviewedUtc ?? scan?.CompletedUtc,
                recommendedAction = RecommendedAction(risk, vendor.BusinessCriticality, failed, high, emailFails, asmFails)
            };
        })
        .OrderByDescending(v => v.complianceRisk)
        .ThenBy(v => v.vendorName)
        .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalVendors = rows.Count,
            criticalVendors = rows.Count(v => v.riskRating == "Critical"),
            highRiskVendors = rows.Count(v => v.riskRating == "High"),
            pendingReviews = rows.Count(v =>
                v.reviewStatus.Contains("Review", StringComparison.OrdinalIgnoreCase) ||
                v.reviewStatus.Contains("Required", StringComparison.OrdinalIgnoreCase)),
            approvedVendors = rows.Count(v => v.reviewStatus == "Approved"),
            vendors = rows
        });
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Create([FromBody] CreateVendorRequest req, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var vendorName = req.VendorName.Trim();
        var website = NormalizeDomain(req.Website);

        if (string.IsNullOrWhiteSpace(vendorName))
            return BadRequest(new { message = "Vendor name is required." });

        if (string.IsNullOrWhiteSpace(website))
            return BadRequest(new { message = "Website/domain is required." });

        var existingVendor = await _db.Vendors.AnyAsync(v =>
            v.TenantId == tid &&
            v.Website == website,
            ct);

        if (existingVendor)
            return Conflict(new { message = "Vendor already exists for this domain.", website });

        var asset = await _db.Assets.FirstOrDefaultAsync(a =>
            a.TenantId == tid &&
            a.Domain == website,
            ct);

        if (asset is null)
        {
            asset = new MonitoredAsset
            {
                TenantId = tid,
                Domain = website,
                DisplayName = vendorName,
                IsPrimary = false,
                MonitoringEnabled = true
            };

            _db.Assets.Add(asset);
            await _db.SaveChangesAsync(ct);
        }
        else if (string.IsNullOrWhiteSpace(asset.DisplayName))
        {
            asset.DisplayName = vendorName;
        }

        var vendor = new Vendor
        {
            TenantId = tid,
            VendorName = vendorName,
            Website = website,
            AssetId = asset.Id,
            BusinessCriticality = NormalizeCriticality(req.BusinessCriticality),
            ServiceType = CleanOptional(req.ServiceType),
            ContactEmail = CleanOptional(req.ContactEmail),
            Notes = CleanOptional(req.Notes),
            ReviewStatus = "Assessment Required"
        };

        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Summary), new { id = vendor.Id }, new
        {
            vendor.Id,
            vendor.AssetId,
            vendor.VendorName,
            vendor.Website,
            vendor.BusinessCriticality,
            vendor.ReviewStatus
        });
    }

    [HttpPost("{id:guid}/assess")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Assess(Guid id, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var vendor = await _db.Vendors
            .Include(v => v.Asset)
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tid, ct);

        if (vendor is null)
            return NotFound();

        if (vendor.Asset is null)
            return BadRequest(new { message = "Vendor asset is missing. Recreate the vendor record." });

        var scanResult = await Mediator.Send(new RunScanCommand(vendor.AssetId, ScanType.FullPosture), ct);

        var latestScan = await _db.Scans
            .Where(s => s.TenantId == tid && s.AssetId == vendor.AssetId && s.Type == ScanType.FullPosture)
            .OrderByDescending(s => s.CompletedUtc ?? s.StartedUtc ?? s.CreatedAtUtc)
            .FirstOrDefaultAsync(ct);

        vendor.LastReviewedUtc = DateTime.UtcNow;
        vendor.LastAssessmentScanId = latestScan?.Id;

        if (latestScan is not null && latestScan.Status == ScanStatus.Completed)
        {
            var failed = await _db.ScanFindings.CountAsync(f =>
                f.ScanId == latestScan.Id &&
                !f.Passed &&
                f.Severity != Severity.Info,
                ct);

            var high = await _db.ScanFindings.CountAsync(f =>
                f.ScanId == latestScan.Id &&
                !f.Passed &&
                f.Severity >= Severity.High,
                ct);

            var emailFails = await _db.ScanFindings.CountAsync(f =>
                f.ScanId == latestScan.Id &&
                !f.Passed &&
                (f.CheckKey.StartsWith("email.") ||
                 f.CheckKey.StartsWith("spf.") ||
                 f.CheckKey.StartsWith("dkim.") ||
                 f.CheckKey.StartsWith("dmarc.")),
                ct);

            var asmFails = await _db.ScanFindings.CountAsync(f =>
                f.ScanId == latestScan.Id &&
                !f.Passed &&
                (f.CheckKey.StartsWith("asm.") ||
                 f.CheckKey.StartsWith("ports.") ||
                 f.CheckKey.StartsWith("exposure.")),
                ct);

            var risk = CalculateComplianceRisk(latestScan, failed, high, emailFails, asmFails, vendor.BusinessCriticality);
            vendor.ReviewStatus = ResolveReviewStatus(vendor.ReviewStatus, RiskRating(risk));
        }
        else
        {
            vendor.ReviewStatus = "Assessment Failed";
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            vendor.Id,
            vendor.VendorName,
            vendor.Website,
            vendor.AssetId,
            latestScanId = latestScan?.Id,
            scan = scanResult,
            reviewStatus = vendor.ReviewStatus,
            vendor.LastReviewedUtc
        });
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateVendorStatusRequest req, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tid, ct);
        if (vendor is null)
            return NotFound();

        vendor.ReviewStatus = string.IsNullOrWhiteSpace(req.ReviewStatus)
            ? vendor.ReviewStatus
            : req.ReviewStatus.Trim();

        vendor.BusinessCriticality = NormalizeCriticality(req.BusinessCriticality ?? vendor.BusinessCriticality);
        vendor.Notes = CleanOptional(req.Notes) ?? vendor.Notes;

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            vendor.Id,
            vendor.ReviewStatus,
            vendor.BusinessCriticality,
            vendor.Notes
        });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tid, ct);
        if (vendor is null)
            return NotFound();

        _db.Vendors.Remove(vendor);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }

    private static int CalculateComplianceRisk(
        SecurityScan? scan,
        int failed,
        int high,
        int emailFails,
        int asmFails,
        string criticality)
    {
        if (scan is null)
            return 0;

        var scoreRisk = Math.Max(0, 100 - scan.Score);
        var findingRisk = failed * 3 + high * 10 + emailFails * 8 + asmFails * 6;
        var criticalityModifier = criticality.Equals("Critical", StringComparison.OrdinalIgnoreCase) ? 15 :
            criticality.Equals("High", StringComparison.OrdinalIgnoreCase) ? 10 :
            criticality.Equals("Medium", StringComparison.OrdinalIgnoreCase) ? 5 : 0;

        return Math.Clamp(scoreRisk + findingRisk + criticalityModifier, 0, 100);
    }

    private static string RiskRating(int complianceRisk) => complianceRisk switch
    {
        >= 80 => "Critical",
        >= 55 => "High",
        >= 30 => "Medium",
        _ => "Low"
    };

    private static string ResolveReviewStatus(string currentStatus, string risk)
    {
        if (currentStatus.Equals("Accepted", StringComparison.OrdinalIgnoreCase) ||
            currentStatus.Equals("Approved", StringComparison.OrdinalIgnoreCase))
            return currentStatus;

        return risk switch
        {
            "Critical" => "Needs Immediate Review",
            "High" => "Review Required",
            "Medium" => "Monitor",
            "Low" => "Approved",
            _ => "Assessment Required"
        };
    }

    private static string RecommendedAction(
        string risk,
        string criticality,
        int failed,
        int high,
        int emailFails,
        int asmFails) => risk switch
    {
        "Critical" => $"Request a remediation plan before approval. This vendor has {high} high/critical finding(s) and is marked {criticality} criticality.",
        "High" => $"Request updated security evidence and reassess after remediation. Failed checks: {failed}, email issues: {emailFails}, exposure issues: {asmFails}.",
        "Medium" => "Monitor this vendor and include it in the next vendor review cycle.",
        "Low" => "Vendor currently appears acceptable based on available external posture evidence.",
        _ => "Run a Full Posture assessment to create an evidence-backed vendor scorecard."
    };

    private static string NormalizeCriticality(string? value)
    {
        var cleaned = string.IsNullOrWhiteSpace(value) ? "Medium" : value.Trim();

        return cleaned.ToLowerInvariant() switch
        {
            "critical" => "Critical",
            "high" => "High",
            "medium" => "Medium",
            "low" => "Low",
            _ => "Medium"
        };
    }

    private static string NormalizeDomain(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
            return string.Empty;

        return domain
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
            .Trim()
            .TrimEnd('/')
            .Split('/')[0]
            .Split('?')[0]
            .Split('#')[0]
            .ToLowerInvariant();
    }

    private static string? CleanOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record CreateVendorRequest(
    string VendorName,
    string Website,
    string? BusinessCriticality,
    string? ServiceType,
    string? ContactEmail,
    string? Notes);

public record UpdateVendorStatusRequest(
    string? ReviewStatus,
    string? BusinessCriticality,
    string? Notes);
