using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class IncidentPlaybookController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public IncidentPlaybookController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tid && u.IsActive)
            .CountAsync(ct);

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .ToListAsync(ct);

        var openVulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .Where(v => v.TenantId == tid && v.Status != VulnerabilityStatus.Remediated && v.Status != VulnerabilityStatus.FalsePositive)
            .ToListAsync(ct);

        var openRisks = await _db.Risks
            .AsNoTracking()
            .Where(r => r.TenantId == tid && r.Status != RiskStatus.Closed)
            .ToListAsync(ct);

        var brandAlerts = await _db.BrandAlerts
            .AsNoTracking()
            .Where(a => a.TenantId == tid && a.Status != AlertStatus.Resolved && a.Status != AlertStatus.Dismissed)
            .ToListAsync(ct);

        var latestScans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .Where(s => s.TenantId == tid && s.Status == ScanStatus.Completed)
            .OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc)
            .Take(25)
            .ToListAsync(ct);

        var criticalVulns = openVulnerabilities.Count(v => v.Severity == Severity.Critical);
        var highVulns = openVulnerabilities.Count(v => v.Severity == Severity.High);
        var highRisks = openRisks.Count(r => r.InherentScore >= 16);
        var highBrandAlerts = brandAlerts.Count(a => a.Severity is Severity.High or Severity.Critical);
        var assetsWithHighFindings = latestScans.Count(s => s.Findings.Any(f => !f.Passed && f.Severity is Severity.High or Severity.Critical));

        var playbooks = new List<object>
        {
            new
            {
                id = Guid.NewGuid(),
                name = "Vulnerability Triage & Remediation",
                category = "Exposure Management",
                severity = criticalVulns > 0 ? "Critical" : highVulns > 0 ? "High" : "Medium",
                steps = 7,
                owner = "Security Operations",
                status = openVulnerabilities.Any() ? "Active" : "Ready",
                lastTestedUtc = (DateTime?)null
            },
            new
            {
                id = Guid.NewGuid(),
                name = "Risk Escalation Workflow",
                category = "Enterprise Risk",
                severity = highRisks > 0 ? "High" : "Medium",
                steps = 6,
                owner = "Risk Owner",
                status = openRisks.Any() ? "Active" : "Ready",
                lastTestedUtc = (DateTime?)null
            },
            new
            {
                id = Guid.NewGuid(),
                name = "Brand Alert Investigation",
                category = "Threat Response",
                severity = highBrandAlerts > 0 ? "High" : "Medium",
                steps = 5,
                owner = "Threat Intelligence",
                status = brandAlerts.Any() ? "Active" : "Ready",
                lastTestedUtc = (DateTime?)null
            },
            new
            {
                id = Guid.NewGuid(),
                name = "Failed Control Response",
                category = "Security Posture",
                severity = assetsWithHighFindings > 0 ? "High" : "Medium",
                steps = 6,
                owner = "Security Analyst",
                status = latestScans.Any() ? "Active" : "Ready",
                lastTestedUtc = (DateTime?)null
            }
        };

        var incidents = new List<object>();

        if (criticalVulns + highVulns > 0)
        {
            incidents.Add(new
            {
                id = Guid.NewGuid(),
                title = "Open high-impact vulnerabilities requiring triage",
                severity = criticalVulns > 0 ? "Critical" : "High",
                status = "Open",
                playbook = "Vulnerability Triage & Remediation",
                affectedAssets = openVulnerabilities.Where(v => v.AssetId.HasValue).Select(v => v.AssetId).Distinct().Count(),
                openedUtc = openVulnerabilities.OrderBy(v => v.CreatedAtUtc).Select(v => v.CreatedAtUtc).FirstOrDefault(),
                owner = "Security Operations"
            });
        }

        if (highRisks > 0)
        {
            incidents.Add(new
            {
                id = Guid.NewGuid(),
                title = "High enterprise risks require ownership review",
                severity = "High",
                status = "Investigating",
                playbook = "Risk Escalation Workflow",
                affectedAssets = 0,
                openedUtc = openRisks.OrderBy(r => r.CreatedAtUtc).Select(r => r.CreatedAtUtc).FirstOrDefault(),
                owner = "Risk Owner"
            });
        }

        if (highBrandAlerts > 0)
        {
            incidents.Add(new
            {
                id = Guid.NewGuid(),
                title = "Brand or external exposure alert requires investigation",
                severity = "High",
                status = "Investigating",
                playbook = "Brand Alert Investigation",
                affectedAssets = brandAlerts.Select(a => a.RelatedDomain).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().Count(),
                openedUtc = brandAlerts.OrderBy(a => a.DetectedAtUtc).Select(a => a.DetectedAtUtc).FirstOrDefault(),
                owner = "Threat Intelligence"
            });
        }

        if (assetsWithHighFindings > 0)
        {
            incidents.Add(new
            {
                id = Guid.NewGuid(),
                title = "High-severity failed security controls detected in recent scans",
                severity = "High",
                status = "Open",
                playbook = "Failed Control Response",
                affectedAssets = assetsWithHighFindings,
                openedUtc = latestScans.OrderByDescending(s => s.CompletedUtc ?? s.CreatedAtUtc).Select(s => s.CompletedUtc ?? s.CreatedAtUtc).FirstOrDefault(),
                owner = "Security Analyst"
            });
        }

        var steps = new[]
        {
            new { playbook = "Vulnerability Triage & Remediation", order = 1, action = "Confirm affected asset and business owner.", status = openVulnerabilities.Any() ? "In Progress" : "Ready", owner = "Security Analyst" },
            new { playbook = "Vulnerability Triage & Remediation", order = 2, action = "Prioritize by criticality, exploitability, and exposure.", status = openVulnerabilities.Any() ? "Pending" : "Ready", owner = "Security Operations" },
            new { playbook = "Risk Escalation Workflow", order = 1, action = "Validate risk score and assign accountable owner.", status = openRisks.Any() ? "In Progress" : "Ready", owner = "Risk Owner" },
            new { playbook = "Brand Alert Investigation", order = 1, action = "Validate source, preserve evidence, and classify alert.", status = brandAlerts.Any() ? "In Progress" : "Ready", owner = "Threat Intelligence" },
            new { playbook = "Failed Control Response", order = 1, action = "Review failed scan findings and confirm false positives.", status = latestScans.Any() ? "In Progress" : "Ready", owner = "Security Analyst" }
        };

        var escalations = new[]
        {
            new { severity = "Critical", notify = "CISO, Incident Commander, System Owner", sla = "15 minutes", channel = "Email + Phone/Chat" },
            new { severity = "High", notify = "SOC Lead, Asset Owner", sla = "1 hour", channel = "Email + Chat" },
            new { severity = "Medium", notify = "Security Analyst", sla = "4 hours", channel = "Email" }
        };

        var recommendations = new List<string>();
        if (criticalVulns > 0)
            recommendations.Add("Escalate critical vulnerabilities and confirm remediation owners immediately.");
        if (highRisks > 0)
            recommendations.Add("Review high-scoring enterprise risks and update mitigation plans.");
        if (assetsWithHighFindings > 0)
            recommendations.Add("Use recent scan findings to drive response tasks and validation scans.");
        if (!recommendations.Any())
            recommendations.Add("No active incident signals were found. Keep playbooks tested and escalation contacts current.");

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalPlaybooks = playbooks.Count,
            activePlaybooks = playbooks.Count,
            openIncidents = incidents.Count,
            criticalPlaybooks = playbooks.Count(x => x.ToString()!.Contains("Critical", StringComparison.OrdinalIgnoreCase)),
            responseSteps = steps.Length,
            usersInScope = users,
            assetsInScope = assets.Count,
            playbooks,
            incidents,
            steps,
            escalations,
            recommendations
        });
    }
}
