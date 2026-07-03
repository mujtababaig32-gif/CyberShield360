using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class GlobalSearchController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;
    private readonly ILogger<GlobalSearchController> _logger;

    public GlobalSearchController(ApplicationDbContext db, ICurrentUser user, ILogger<GlobalSearchController> logger)
    {
        _db = db;
        _user = user;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var rawQuery = q?.Trim() ?? string.Empty;
        var query = rawQuery.ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(new SearchResponse(
                rawQuery,
                0,
                Array.Empty<SearchResult>(),
                DefaultSuggestions(),
                false,
                null));
        }

        var results = new List<SearchResult>();

        // Always return matching modules first. This keeps search useful even if an optional table
        // is not migrated yet during local/prod upgrade work.
        results.AddRange(StaticResults()
            .Where(x => Matches(query, x.Title, x.Subtitle, x.Category, x.Route))
            .Take(12));

        await AddSafeAsync(results, "assets", async () =>
        {
            var rows = await _db.Assets
                .AsNoTracking()
                .Where(a => a.TenantId == tid)
                .Where(a =>
                    a.Domain.ToLower().Contains(query) ||
                    (a.DisplayName != null && a.DisplayName.ToLower().Contains(query)))
                .OrderBy(a => a.Domain)
                .Take(6)
                .Select(a => new SearchResult(
                    a.Id.ToString(),
                    a.DisplayName ?? a.Domain,
                    a.Domain,
                    "Asset",
                    "/assets",
                    "🌐",
                    a.Scans
                        .OrderByDescending(s => s.CompletedUtc ?? s.StartedUtc ?? s.CreatedAtUtc)
                        .Select(s => (int?)s.Score)
                        .FirstOrDefault()))
                .ToListAsync(ct);

            return rows;
        });

        await AddSafeAsync(results, "risks", async () =>
        {
            var riskRows = await _db.Risks
                .AsNoTracking()
                .Where(r => r.TenantId == tid)
                .Where(r =>
                    r.Title.ToLower().Contains(query) ||
                    (r.Description != null && r.Description.ToLower().Contains(query)) ||
                    (r.Category != null && r.Category.ToLower().Contains(query)))
                .OrderByDescending(r => r.Impact)
                .ThenByDescending(r => r.Likelihood)
                .Take(6)
                .Select(r => new
                {
                    r.Id,
                    r.Title,
                    r.Description,
                    r.Category,
                    r.Status,
                    r.Likelihood,
                    r.Impact
                })
                .ToListAsync(ct);

            return riskRows
                .Select(r => new SearchResult(
                    r.Id.ToString(),
                    r.Title,
                    r.Description ?? r.Category ?? r.Status.ToString(),
                    "Risk",
                    "/risks",
                    "⚠️",
                    (int)r.Likelihood * (int)r.Impact))
                .ToList();
        });

        await AddSafeAsync(results, "vulnerabilities", async () =>
        {
            var rows = await _db.Vulnerabilities
                .AsNoTracking()
                .Where(v => v.TenantId == tid)
                .Where(v =>
                    v.Title.ToLower().Contains(query) ||
                    (v.Description != null && v.Description.ToLower().Contains(query)) ||
                    (v.CveId != null && v.CveId.ToLower().Contains(query)))
                .OrderByDescending(v => v.Severity)
                .Take(6)
                .Select(v => new SearchResult(
                    v.Id.ToString(),
                    v.Title,
                    v.CveId ?? v.Severity.ToString(),
                    "Vulnerability",
                    "/vulnerabilities",
                    "🛡️",
                    (int?)v.Severity))
                .ToListAsync(ct);

            return rows;
        });

        await AddSafeAsync(results, "vendors", async () =>
        {
            var rows = await _db.Vendors
                .AsNoTracking()
                .Where(v => v.TenantId == tid)
                .Where(v =>
                    v.VendorName.ToLower().Contains(query) ||
                    v.Website.ToLower().Contains(query) ||
                    (v.ServiceType != null && v.ServiceType.ToLower().Contains(query)))
                .OrderBy(v => v.VendorName)
                .Take(6)
                .Select(v => new SearchResult(
                    v.Id.ToString(),
                    v.VendorName,
                    v.Website,
                    "Vendor",
                    "/vendor-risk",
                    "🏢",
                    null))
                .ToListAsync(ct);

            return rows;
        });

        await AddSafeAsync(results, "users", async () =>
        {
            var rows = await _db.Users
                .AsNoTracking()
                .Where(u => u.TenantId == tid)
                .Where(u =>
                    (u.Email != null && u.Email.ToLower().Contains(query)) ||
                    (u.FullName != null && u.FullName.ToLower().Contains(query)))
                .OrderBy(u => u.Email)
                .Take(6)
                .Select(u => new SearchResult(
                    u.Id.ToString(),
                    u.FullName ?? u.Email ?? "User",
                    u.Email ?? "Tenant user",
                    "User",
                    "/user-management",
                    "👥",
                    null))
                .ToListAsync(ct);

            return rows;
        });

        var finalResults = results
            .GroupBy(x => $"{x.Category}:{x.Id}")
            .Select(g => g.First())
            .Take(30)
            .ToArray();

        return Ok(new SearchResponse(
            rawQuery,
            finalResults.Length,
            finalResults,
            DefaultSuggestions(),
            false,
            null));
    }

    private async Task AddSafeAsync(List<SearchResult> results, string source, Func<Task<List<SearchResult>>> search)
    {
        try
        {
            results.AddRange(await search());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Global Search skipped {Source} results because the source query failed.", source);
        }
    }

    private static bool Matches(string query, params string?[] values)
    {
        return values.Any(value =>
            !string.IsNullOrWhiteSpace(value) &&
            value.ToLowerInvariant().Contains(query));
    }

    private static string[] DefaultSuggestions() => new[]
    {
        "assets",
        "full posture",
        "critical risks",
        "vendor risk",
        "reports",
        "compliance",
        "audit logs",
        "settings"
    };

    private static IEnumerable<SearchResult> StaticResults() => new[]
    {
        new SearchResult("dashboard", "Dashboard", "Security overview and KPI scorecards", "Page", "/", "📊", 100),
        new SearchResult("executive-scorecard", "Executive Scorecard", "Board-ready posture summary and actions", "Page", "/executive-scorecard", "📈", 100),
        new SearchResult("search", "Global Search", "Find assets, modules, vendors, risks, and users", "Page", "/search", "🔎", 100),
        new SearchResult("ai-copilot", "AI Copilot", "Security advisor and guided workspace questions", "Page", "/ai-copilot", "🤖", 100),

        new SearchResult("assets", "Assets & Scans", "Run full posture scans and download reports", "Page", "/assets", "🌐", 100),
        new SearchResult("scheduled-scans", "Scheduled Scans", "Recurring posture assessments", "Page", "/scheduled-scans", "⏰", 100),
        new SearchResult("asset-inventory", "Asset Inventory", "Public asset inventory and ownership", "Page", "/asset-inventory", "🗂️", 100),
        new SearchResult("vulnerabilities", "Vulnerabilities", "Track technical findings and remediation", "Page", "/vulnerabilities", "🛡️", 100),
        new SearchResult("cloud-posture", "Cloud Posture", "AWS, Azure, and GCP posture connector area", "Page", "/cloud-posture", "☁️", 100),
        new SearchResult("attack-path", "Attack Path", "Exposure paths and risk chains", "Page", "/attack-path", "🕸️", 100),

        new SearchResult("risks", "Risk Register", "Track likelihood, impact, and mitigation", "Page", "/risks", "⚠️", 100),
        new SearchResult("critical-risks", "Critical Risks", "High-priority business and security risks", "Page", "/risks", "🚨", 100),
        new SearchResult("compliance", "Compliance Center", "Compliance posture and audit readiness", "Page", "/compliance", "📋", 100),
        new SearchResult("policy-audit", "Policy & Audit", "Policy review and audit evidence", "Page", "/policy-audit", "📄", 100),
        new SearchResult("framework-mapping", "Framework Mapping", "Controls mapped to frameworks", "Page", "/framework-mapping", "🧩", 100),
        new SearchResult("vendor-risk", "Vendor Risk", "Assess third-party and supplier domains", "Page", "/vendor-risk", "🏢", 100),

        new SearchResult("soc", "SOC Center", "Alerts and security operations queue", "Page", "/soc", "🚨", 100),
        new SearchResult("threat-intelligence", "Threat Intelligence", "Domain and reputation intelligence", "Page", "/threat-intelligence", "🎯", 100),
        new SearchResult("dark-web", "Dark Web", "Breach and exposure monitoring area", "Page", "/dark-web", "🕶️", 100),
        new SearchResult("incident-playbooks", "Incident Playbooks", "Guided response workflows", "Page", "/incident-playbooks", "🧯", 100),
        new SearchResult("ai-remediation", "AI Remediation", "Finding-based remediation guidance", "Page", "/ai-remediation", "🛠️", 100),
        new SearchResult("audit-logs", "Audit Logs", "System activity and operator evidence", "Page", "/audit-logs", "🧾", 100),

        new SearchResult("service-overview", "Service Overview", "Assessment and remediation service model", "Page", "/service-overview", "🧭", 100),
        new SearchResult("client-onboarding", "Client Onboarding", "Client intake and scope setup", "Page", "/client-onboarding", "🤝", 100),
        new SearchResult("client-packages", "Client Packages", "Commercial service packages", "Page", "/client-packages", "📦", 100),
        new SearchResult("client-training", "Client Training", "Client education and security guidance", "Page", "/client-training", "🧑‍🏫", 100),
        new SearchResult("client-quotation", "Client Quotation", "Proposal and quotation builder", "Page", "/client-quotation", "💼", 100),
        new SearchResult("report-builder", "Report Builder", "Executive PDF and Excel report workflow", "Page", "/report-builder", "📑", 100),
        new SearchResult("fix-plan", "Fix Plan", "Prioritized remediation plan", "Page", "/fix-plan", "🛠️", 100),
        new SearchResult("billing", "Billing", "Plans and subscription configuration", "Page", "/billing", "💳", 100),

        new SearchResult("saas-admin", "SaaS Admin", "Tenant and platform administration", "Page", "/saas-admin", "🏗️", 100),
        new SearchResult("user-management", "User Management", "Users, invitations, and reports", "Page", "/user-management", "👥", 100),
        new SearchResult("rbac", "RBAC Engine", "Roles and permission mapping", "Page", "/rbac", "🔐", 100),
        new SearchResult("notifications", "Notifications", "Email and system delivery events", "Page", "/notifications", "🔔", 100),
        new SearchResult("profile", "My Profile", "Account and security profile", "Page", "/profile", "👤", 100),
        new SearchResult("settings", "Settings", "Branding and deployment readiness", "Page", "/settings", "⚙️", 100)
    };

    private sealed record SearchResponse(
        string Query,
        int TotalResults,
        IReadOnlyCollection<SearchResult> Results,
        IReadOnlyCollection<string> Suggestions,
        bool Partial,
        string? Warning);

    private sealed record SearchResult(
        string Id,
        string Title,
        string Subtitle,
        string Category,
        string Route,
        string Icon,
        int? Score);
}
