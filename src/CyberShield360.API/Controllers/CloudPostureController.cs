using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class CloudPostureController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public CloudPostureController(ApplicationDbContext db, ICurrentUser user)
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
            .Take(100)
            .ToListAsync(ct);

        var latest = scans
            .GroupBy(s => s.AssetId)
            .Select(g => g.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).First())
            .ToList();

        var findings = latest
            .SelectMany(s => s.Findings.Select(f => new
            {
                Id = f.Id,
                Provider = "External Surface",
                Resource = s.Asset != null ? s.Asset.Domain : "Unknown asset",
                Category = CategoryFor(f.CheckKey),
                f.Title,
                Severity = f.Severity.ToString(),
                Status = f.Passed ? "Passed" : "Open",
                Recommendation = f.Passed ? "No action required." : f.Recommendation ?? "Review this signal."
            }))
            .Where(f => f.Status == "Open" && f.Category is "IAM Risk" or "Storage Exposure" or "Network Exposure")
            .OrderByDescending(f => SeverityWeight(f.Severity))
            .Take(25)
            .ToList();

        var iamRisks = findings.Where(f => f.Category == "IAM Risk").ToList();
        var storageRisks = findings.Where(f => f.Category == "Storage Exposure").ToList();
        var networkRisks = findings.Where(f => f.Category == "Network Exposure").ToList();

        var accounts = new[]
        {
            new { id = Guid.NewGuid(), provider = "AWS", accountName = "AWS Connector", accountId = "not-connected", status = "Not Connected", postureScore = 0, regionCount = 0, lastScannedUtc = (DateTime?)null },
            new { id = Guid.NewGuid(), provider = "Azure", accountName = "Azure Connector", accountId = "not-connected", status = "Not Connected", postureScore = 0, regionCount = 0, lastScannedUtc = (DateTime?)null },
            new { id = Guid.NewGuid(), provider = "GCP", accountName = "GCP Connector", accountId = "not-connected", status = "Not Connected", postureScore = 0, regionCount = 0, lastScannedUtc = (DateTime?)null }
        };

        var openFindings = findings.Count;
        var highFindings = findings.Count(f => f.Severity is "High" or "Critical");
        var averagePostureScore = latest.Any() ? (int)Math.Round(latest.Average(s => s.Score)) : 0;

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            connectedAccounts = 0,
            totalAccounts = accounts.Length,
            averagePostureScore,
            openFindings,
            highFindings,
            iamRiskCount = iamRisks.Count,
            storageRiskCount = storageRisks.Count,
            networkRiskCount = networkRisks.Count,
            assetsInScope = assets.Count,
            connectorMode = "Cloud connectors not connected",
            evidenceQuality = "Cloud provider APIs are not connected yet. This view shows cloud-readiness signals derived from tenant assets and scan evidence only.",
            accounts,
            findings,
            iamRisks,
            storageRisks,
            networkRisks,
            recommendations = findings
                .Where(f => f.Status == "Open")
                .Select(f => f.Recommendation)
                .Distinct()
                .Take(8),
            integrations = new[]
            {
                new { provider = "AWS", status = "Not Connected", method = "Read-only IAM Role" },
                new { provider = "Azure", status = "Not Connected", method = "Service Principal" },
                new { provider = "GCP", status = "Not Connected", method = "Service Account" }
            }
        });
    }

    private static string CategoryFor(string key)
    {
        if (key.StartsWith("email.") || key.Contains("dmarc") || key.Contains("spf")) return "IAM Risk";
        if (key.StartsWith("dns.") || key.Contains("caa")) return "Storage Exposure";
        if (key.StartsWith("asm.port.") || key.StartsWith("http.")) return "Network Exposure";
        if (key.StartsWith("headers.")) return "Network Exposure";
        return "Evidence Signal";
    }

    private static int SeverityWeight(string severity) => severity switch
    {
        "Critical" => 4,
        "High" => 3,
        "Medium" => 2,
        "Low" => 1,
        _ => 0
    };
}
