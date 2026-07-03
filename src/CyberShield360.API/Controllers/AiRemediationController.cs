using System.Text.Json;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class AiRemediationController : ApiControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ApplicationDbContext _db;
    private readonly IAiRecommendationService _ai;
    private readonly ICurrentUser _user;

    public AiRemediationController(
        ApplicationDbContext db,
        IAiRecommendationService ai,
        ICurrentUser user)
    {
        _db = db;
        _ai = ai;
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
            .Where(s =>
                s.TenantId == tid &&
                s.Status == ScanStatus.Completed &&
                s.Type == ScanType.FullPosture)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .Take(250)
            .ToListAsync(ct);

        var latestByAsset = scans
            .Where(s => s.Asset is not null)
            .GroupBy(s => s.AssetId)
            .Select(g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First())
            .OrderBy(s => s.Asset!.Domain)
            .ToList();

        var scanIds = latestByAsset.Select(s => s.Id).ToArray();

        var guidanceItems = await _db.AiRemediationGuidance
            .AsNoTracking()
            .Where(g => g.TenantId == tid && scanIds.Contains(g.ScanId))
            .OrderByDescending(g => g.GeneratedUtc)
            .ToListAsync(ct);

        var guidanceByScan = guidanceItems
            .GroupBy(g => g.ScanId)
            .ToDictionary(g => g.Key, g => g.First());

        var assets = latestByAsset.Select(scan =>
        {
            guidanceByScan.TryGetValue(scan.Id, out var guidance);

            var failed = scan.Findings.Count(f => !f.Passed && f.Severity != Severity.Info);
            var highCritical = scan.Findings.Count(f => !f.Passed && f.Severity is Severity.High or Severity.Critical);

            return new
            {
                assetId = scan.AssetId,
                scanId = scan.Id,
                domain = scan.Asset?.Domain ?? "Unknown",
                score = scan.Score,
                grade = scan.Grade.ToString(),
                failedFindings = failed,
                highCriticalFindings = highCritical,
                lastScanUtc = scan.CompletedUtc ?? scan.CreatedAtUtc,
                guidanceGenerated = guidance is not null,
                guidanceProvider = guidance?.Provider,
                guidanceGeneratedUtc = guidance?.GeneratedUtc,
                guidanceStatus = guidance?.Status ?? "Not Generated"
            };
        }).ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            scannedAssets = assets.Count,
            assetsNeedingRemediation = assets.Count(a => a.failedFindings > 0),
            highCriticalFindings = assets.Sum(a => a.highCriticalFindings),
            guidanceGenerated = assets.Count(a => a.guidanceGenerated),
            assets
        });
    }

    [HttpGet("scans/{scanId:guid}")]
    public async Task<IActionResult> GetForScan(Guid scanId, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var scan = await LoadScan(scanId, tid, ct);
        if (scan is null)
            return NotFound();

        var guidance = await _db.AiRemediationGuidance
            .AsNoTracking()
            .Where(g => g.TenantId == tid && g.ScanId == scanId)
            .OrderByDescending(g => g.GeneratedUtc)
            .FirstOrDefaultAsync(ct);

        if (guidance is null)
        {
            return Ok(new
            {
                scanId = scan.Id,
                assetId = scan.AssetId,
                domain = scan.Asset?.Domain ?? "Unknown",
                score = scan.Score,
                grade = scan.Grade.ToString(),
                failedFindings = scan.Findings.Count(f => !f.Passed && f.Severity != Severity.Info),
                highCriticalFindings = scan.Findings.Count(f => !f.Passed && f.Severity is Severity.High or Severity.Critical),
                provider = "Not Generated",
                status = "Not Generated",
                executiveSummary = "Generate AI remediation guidance for this scan to create a saved remediation plan.",
                businessImpact = "Guidance has not been generated yet.",
                actions = Array.Empty<object>(),
                verificationSteps = Array.Empty<string>(),
                generatedUtc = (DateTime?)null
            });
        }

        return Ok(ToResponse(guidance));
    }

    [HttpPost("scans/{scanId:guid}/generate")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> GenerateForScan(Guid scanId, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var scan = await LoadScan(scanId, tid, ct);
        if (scan is null)
            return NotFound();

        var context = BuildContext(scan);
        var plan = await _ai.GenerateRemediationPlanAsync(context, ct);

        var guidance = new AiRemediationGuidance
        {
            TenantId = tid,
            ScanId = scan.Id,
            AssetId = scan.AssetId,
            Domain = scan.Asset?.Domain ?? "Unknown",
            Score = scan.Score,
            Grade = scan.Grade,
            FailedFindings = plan.FailedFindings,
            HighCriticalFindings = plan.HighCriticalFindings,
            Provider = plan.Provider,
            Status = "Generated",
            ExecutiveSummary = plan.ExecutiveSummary,
            BusinessImpact = plan.BusinessImpact,
            PrioritizedActionsJson = JsonSerializer.Serialize(plan.Actions, JsonOptions),
            VerificationStepsJson = JsonSerializer.Serialize(plan.VerificationSteps, JsonOptions),
            RawModelJson = JsonSerializer.Serialize(plan, JsonOptions),
            GeneratedUtc = DateTime.UtcNow
        };

        _db.AiRemediationGuidance.Add(guidance);
        await _db.SaveChangesAsync(ct);

        return Ok(ToResponse(guidance));
    }

    private async Task<SecurityScan?> LoadScan(Guid scanId, Guid tenantId, CancellationToken ct)
        => await _db.Scans
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .FirstOrDefaultAsync(s => s.Id == scanId && s.TenantId == tenantId, ct);

    private static AiRemediationContextDto BuildContext(SecurityScan scan)
    {
        var failedFindings = scan.Findings
            .Where(f => !f.Passed && f.Severity != Severity.Info)
            .OrderByDescending(f => f.Severity)
            .Select(f => new AiRemediationFindingContextDto(
                f.CheckKey,
                f.Title,
                f.Severity.ToString(),
                f.Detail ?? string.Empty,
                f.Recommendation ?? string.Empty))
            .ToList();

        return new AiRemediationContextDto(
            scan.Id,
            scan.Asset?.Domain ?? "Unknown",
            scan.Score,
            scan.Grade.ToString(),
            failedFindings);
    }

    private static object ToResponse(AiRemediationGuidance guidance)
    {
        var actions = Deserialize<IReadOnlyList<AiRemediationActionDto>>(guidance.PrioritizedActionsJson)
            ?? Array.Empty<AiRemediationActionDto>();
        var verificationSteps = Deserialize<IReadOnlyList<string>>(guidance.VerificationStepsJson)
            ?? Array.Empty<string>();

        return new
        {
            guidance.Id,
            guidance.ScanId,
            guidance.AssetId,
            guidance.Domain,
            guidance.Score,
            grade = guidance.Grade.ToString(),
            guidance.FailedFindings,
            guidance.HighCriticalFindings,
            guidance.Provider,
            guidance.Status,
            guidance.ExecutiveSummary,
            guidance.BusinessImpact,
            actions,
            verificationSteps,
            guidance.GeneratedUtc
        };
    }

    private static T? Deserialize<T>(string value)
    {
        try { return JsonSerializer.Deserialize<T>(value, JsonOptions); }
        catch { return default; }
    }
}
