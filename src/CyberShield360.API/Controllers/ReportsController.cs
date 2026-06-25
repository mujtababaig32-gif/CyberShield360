using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Security.Models;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class ReportsController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IReportGenerator _reports;

    public ReportsController(
        ApplicationDbContext db,
        ICurrentUser user,
        IReportGenerator reports)
    {
        _db = db;
        _user = user;
        _reports = reports;
    }

    [HttpGet("assets/{assetId:guid}/latest-full/{format}")]
    public async Task<IActionResult> DownloadLatestFullPostureReport(
        Guid assetId,
        string format,
        CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var scan = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .Where(s =>
                s.TenantId == tid &&
                s.AssetId == assetId &&
                s.Type == ScanType.FullPosture)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(ct);

        if (scan is null)
        {
            return BadRequest(new
            {
                message = "No full posture scan found for this asset. Run a Full Posture scan first."
            });
        }

        if (scan.Findings is null || !scan.Findings.Any())
        {
            return BadRequest(new
            {
                message = "This full posture scan has no findings. Run the scan again before generating a report."
            });
        }

        return await BuildScanReportResponse(scan, format, ct);
    }

    [HttpGet("scans/{scanId:guid}/{format}")]
    public async Task<IActionResult> DownloadScanReport(
        Guid scanId,
        string format,
        CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var scan = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .FirstOrDefaultAsync(s => s.Id == scanId && s.TenantId == tid, ct);

        if (scan is null)
            return NotFound(new { message = "Scan not found." });

        if (scan.Type != ScanType.FullPosture)
        {
            return BadRequest(new
            {
                message = "Executive reports can only be generated from Full Posture scans. Run a Full Posture scan first."
            });
        }

        if (scan.Findings is null || !scan.Findings.Any())
        {
            return BadRequest(new
            {
                message = "This scan has no findings. Run a full scan before generating a report."
            });
        }

        return await BuildScanReportResponse(scan, format, ct);
    }

    private async Task<IActionResult> BuildScanReportResponse(
        SecurityScan scan,
        string format,
        CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var tenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tid, ct);

        var findings = scan.Findings
            .OrderBy(f => f.Passed)
            .ThenByDescending(f => f.Severity)
            .ThenBy(f => f.Title)
            .Select(f => new FindingDto(
                f.CheckKey,
                f.Title,
                f.Severity,
                f.Passed,
                f.Detail,
                f.Recommendation
            ))
            .ToList();

        var model = new ReportModel
        {
            BrandName = "CyberShield360 By Mujtaba",
            PrimaryColorHex = "#10B5A6",
            FooterText = "Confidential Security Report - CyberShield360",
            TenantName = tenant?.Name ?? "CyberShield360 Tenant",
            AssetDomain = scan.Asset?.Domain ?? "Unknown Asset",
            ScanId = scan.Id.ToString(),
            ScanType = scan.Type.ToString(),
            GeneratedAtUtc = DateTime.UtcNow,
            OverallScore = scan.Score,
            Grade = scan.Grade.ToString(),
            Findings = findings
        };

        var safeName = MakeSafeFileName(scan.Asset?.Domain ?? "asset");
        var fileName =
            $"cybershield360-full-posture-report-{safeName}-{DateTime.UtcNow:yyyyMMddHHmmss}";

        format = format.Trim().ToLowerInvariant();

        if (format == "pdf")
        {
            var bytes = await _reports.GeneratePdfAsync(model, ct);
            return File(bytes, "application/pdf", $"{fileName}.pdf");
        }

        if (format == "xlsx")
        {
            var bytes = await _reports.GenerateExcelAsync(model, ct);

            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"{fileName}.xlsx");
        }

        return BadRequest(new { message = "Unsupported report format. Use pdf or xlsx." });
    }

    private static string MakeSafeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var safe = new string(value.Select(ch => invalid.Contains(ch) ? '-' : ch).ToArray());

        return string.IsNullOrWhiteSpace(safe) ? "asset" : safe;
    }
}