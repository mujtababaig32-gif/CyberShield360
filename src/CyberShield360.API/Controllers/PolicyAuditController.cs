using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class PolicyAuditController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public PolicyAuditController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var now = DateTime.UtcNow;

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tid)
            .ToListAsync(ct);

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .ToListAsync(ct);

        var vulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .Where(v => v.TenantId == tid)
            .ToListAsync(ct);

        var risks = await _db.Risks
            .AsNoTracking()
            .Where(r => r.TenantId == tid)
            .ToListAsync(ct);

        var auditLogs = await _db.AuditLogs
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .CountAsync(ct);

        var latestFullScans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Findings)
            .Where(s => s.TenantId == tid && s.Type == ScanType.FullPosture && s.Status == ScanStatus.Completed)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .Take(100)
            .ToListAsync(ct);

        var latestScansByAsset = latestFullScans
            .GroupBy(s => s.AssetId)
            .Select(g => g.First())
            .ToList();

        var openVulnerabilities = vulnerabilities
            .Where(v => v.Status is VulnerabilityStatus.Open or VulnerabilityStatus.InProgress)
            .ToList();

        var openRisks = risks
            .Where(r => r.Status is RiskStatus.Identified or RiskStatus.Assessed or RiskStatus.Mitigating)
            .ToList();

        var highOrCriticalVulns = openVulnerabilities
            .Count(v => v.Severity is Severity.High or Severity.Critical);

        var highRisks = openRisks.Count(r => r.InherentScore >= 12);
        var fullScanCoverage = assets.Count == 0 ? 0 : (int)Math.Round(latestScansByAsset.Count * 100.0 / assets.Count);
        var avgScanScore = latestScansByAsset.Any() ? (int)Math.Round(latestScansByAsset.Average(s => s.Score)) : 0;

        string PolicyStatus(bool issue, bool warning = false) => issue ? "Needs Review" : warning ? "Pending" : "Approved";
        int Acknowledgement(bool issue) => issue ? 65 : 100;

        var policies = new[]
        {
            new
            {
                id = Guid.NewGuid(),
                title = "Access Control Policy",
                owner = "IT Manager",
                category = "Identity & Access",
                status = PolicyStatus(users.Count == 0),
                version = "v1.2",
                lastReviewedUtc = now.AddDays(-58),
                nextReviewUtc = now.AddDays(32),
                acknowledgementRate = Acknowledgement(users.Count == 0)
            },
            new
            {
                id = Guid.NewGuid(),
                title = "Vulnerability Management Policy",
                owner = "Security Analyst",
                category = "Security Operations",
                status = PolicyStatus(highOrCriticalVulns > 0, openVulnerabilities.Any()),
                version = "v1.1",
                lastReviewedUtc = now.AddDays(-72),
                nextReviewUtc = highOrCriticalVulns > 0 ? now.AddDays(7) : now.AddDays(45),
                acknowledgementRate = Acknowledgement(highOrCriticalVulns > 0)
            },
            new
            {
                id = Guid.NewGuid(),
                title = "Risk Management Policy",
                owner = "Risk Owner",
                category = "Governance",
                status = PolicyStatus(highRisks > 0, openRisks.Any()),
                version = "v1.0",
                lastReviewedUtc = now.AddDays(-91),
                nextReviewUtc = highRisks > 0 ? now.AddDays(14) : now.AddDays(60),
                acknowledgementRate = Acknowledgement(highRisks > 0)
            },
            new
            {
                id = Guid.NewGuid(),
                title = "Security Monitoring Policy",
                owner = "SOC Lead",
                category = "Monitoring",
                status = PolicyStatus(fullScanCoverage < 50, fullScanCoverage < 100),
                version = "v1.3",
                lastReviewedUtc = now.AddDays(-35),
                nextReviewUtc = fullScanCoverage < 100 ? now.AddDays(21) : now.AddDays(80),
                acknowledgementRate = fullScanCoverage
            },
            new
            {
                id = Guid.NewGuid(),
                title = "Audit Evidence Retention Policy",
                owner = "Compliance Manager",
                category = "Audit",
                status = PolicyStatus(auditLogs == 0, auditLogs < 10),
                version = "v1.0",
                lastReviewedUtc = now.AddDays(-43),
                nextReviewUtc = auditLogs == 0 ? now.AddDays(10) : now.AddDays(70),
                acknowledgementRate = auditLogs == 0 ? 60 : 95
            }
        };

        var evidence = new[]
        {
            Evidence("Asset Inventory", "ID.AM / A.5.9", "System Record", assets.Any(), "IT Operations", assets.Any() ? assets.Max(a => a.CreatedAtUtc) : null),
            Evidence("Full Posture Scan Results", "CIS 7 / A.8.8", "Scanner Evidence", latestScansByAsset.Any(), "Security Analyst", latestScansByAsset.Any() ? latestScansByAsset.Max(s => s.CompletedUtc ?? s.CreatedAtUtc) : null),
            Evidence("Vulnerability Register", "A.8.8", "Register", vulnerabilities.Any(), "Security Analyst", vulnerabilities.Any() ? vulnerabilities.Max(v => v.CreatedAtUtc) : null),
            Evidence("Risk Register", "A.5.4 / GV.RM", "Register", risks.Any(), "Risk Owner", risks.Any() ? risks.Max(r => r.CreatedAtUtc) : null),
            Evidence("Audit Logs", "CC7.2 / DE.CM", "System Log", auditLogs > 0, "Compliance Manager", auditLogs > 0 ? now : null),
            Evidence("User Access Records", "CC6.1 / PR.AA", "Identity Record", users.Any(), "IT Manager", users.Any() ? users.Max(u => u.LastLoginUtc) ?? now : null)
        };

        var findings = new List<object>();

        if (fullScanCoverage < 100)
        {
            findings.Add(new
            {
                id = Guid.NewGuid(),
                title = "Full posture scan coverage is incomplete",
                severity = fullScanCoverage < 50 ? "High" : "Medium",
                status = "Open",
                owner = "Security Analyst",
                recommendation = "Run full posture scans for all in-scope assets before audit review."
            });
        }

        if (highOrCriticalVulns > 0)
        {
            findings.Add(new
            {
                id = Guid.NewGuid(),
                title = "High or critical vulnerabilities remain open",
                severity = "High",
                status = "Open",
                owner = "Security Analyst",
                recommendation = "Prioritize remediation for high and critical vulnerabilities and document closure evidence."
            });
        }

        if (highRisks > 0)
        {
            findings.Add(new
            {
                id = Guid.NewGuid(),
                title = "High inherent risks require treatment evidence",
                severity = "Medium",
                status = "In Progress",
                owner = "Risk Owner",
                recommendation = "Attach mitigation plans, owners, residual scores, and review dates for high-risk items."
            });
        }

        if (auditLogs == 0)
        {
            findings.Add(new
            {
                id = Guid.NewGuid(),
                title = "Audit log evidence has not been collected",
                severity = "Medium",
                status = "Open",
                owner = "Compliance Manager",
                recommendation = "Enable audit logging and retain exportable evidence for auditor review."
            });
        }

        var readinessParts = new[]
        {
            fullScanCoverage,
            avgScanScore,
            evidence.Count(e => e.status == "Collected") * 100 / Math.Max(1, evidence.Length),
            Math.Max(0, 100 - highOrCriticalVulns * 10),
            Math.Max(0, 100 - highRisks * 8)
        };
        var averageAuditReadiness = (int)Math.Round(readinessParts.Average());

        var audits = new[]
        {
            new
            {
                id = Guid.NewGuid(),
                name = "ISO 27001 Internal Readiness Review",
                framework = "ISO 27001",
                status = averageAuditReadiness >= 75 ? "In Progress" : "Needs Preparation",
                readiness = averageAuditReadiness,
                openFindings = findings.Count,
                dueDateUtc = now.AddDays(45)
            },
            new
            {
                id = Guid.NewGuid(),
                name = "SOC 2 Security Criteria Review",
                framework = "SOC 2",
                status = averageAuditReadiness >= 70 ? "Planned" : "Needs Preparation",
                readiness = Math.Max(0, averageAuditReadiness - 5),
                openFindings = findings.Count(f => f.ToString()!.Contains("High")),
                dueDateUtc = now.AddDays(90)
            }
        };

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalPolicies = policies.Length,
            approvedPolicies = policies.Count(x => x.status == "Approved"),
            policiesNeedingReview = policies.Count(x => x.status == "Needs Review"),
            evidenceCollected = evidence.Count(x => x.status == "Collected"),
            evidenceMissing = evidence.Count(x => x.status == "Missing"),
            activeAudits = audits.Count(x => x.status is "In Progress" or "Planned"),
            averageAuditReadiness,
            usersInScope = users.Count,
            assetsInScope = assets.Count,
            policies,
            evidence,
            audits,
            findings,
            recommendations = findings
                .Select(x => x.GetType().GetProperty("recommendation")?.GetValue(x)?.ToString())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .Take(6)
                .ToList(),
            dataQuality = new
            {
                fullScanCoverage,
                avgScanScore,
                source = "Tenant users, assets, scans, vulnerabilities, risks, and audit logs"
            }
        });
    }

    private static EvidenceRow Evidence(
        string name,
        string control,
        string type,
        bool collected,
        string owner,
        DateTime? collectedUtc) => new(
        Guid.NewGuid(),
        name,
        control,
        type,
        collected ? "Collected" : "Missing",
        owner,
        collectedUtc);

    private record EvidenceRow(
        Guid id,
        string name,
        string control,
        string type,
        string status,
        string owner,
        DateTime? collectedUtc);
}
