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

    public GlobalSearchController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(q))
            return Ok(new
            {
                query = q,
                totalResults = 0,
                results = Array.Empty<object>(),
                suggestions = DefaultSuggestions()
            });

        var query = q.Trim().ToLowerInvariant();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .Where(a =>
                a.Domain.ToLower().Contains(query) ||
                (a.DisplayName != null && a.DisplayName.ToLower().Contains(query)))
            .OrderBy(a => a.Domain)
            .Take(6)
            .Select(a => new
            {
                id = a.Id.ToString(),
                title = a.DisplayName ?? a.Domain,
                subtitle = a.Domain,
                category = "Asset",
                route = "/assets",
                icon = "🌐",
                score = 90
            })
            .ToListAsync(ct);

        var risks = await _db.Risks
            .AsNoTracking()
            .Where(r => r.TenantId == tid)
            .Where(r =>
                r.Title.ToLower().Contains(query) ||
                (r.Description != null && r.Description.ToLower().Contains(query)) ||
                (r.Category != null && r.Category.ToLower().Contains(query)))
            .OrderByDescending(r => r.InherentScore)
            .Take(6)
            .Select(r => new
            {
                id = r.Id.ToString(),
                title = r.Title,
                subtitle = r.Description ?? r.Category ?? r.Status.ToString(),
                category = "Risk",
                route = "/risks",
                icon = "⚠️",
                score = r.InherentScore
            })
            .ToListAsync(ct);

        var vulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .Where(v => v.TenantId == tid)
            .Where(v =>
                v.Title.ToLower().Contains(query) ||
                (v.Description != null && v.Description.ToLower().Contains(query)) ||
                (v.CveId != null && v.CveId.ToLower().Contains(query)))
            .OrderByDescending(v => v.Severity)
            .Take(6)
            .Select(v => new
            {
                id = v.Id.ToString(),
                title = v.Title,
                subtitle = v.CveId ?? v.Severity.ToString(),
                category = "Vulnerability",
                route = "/vulnerabilities",
                icon = "🛡️",
                score = (int)v.Severity
            })
            .ToListAsync(ct);

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tid)
            .Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(query)) ||
                (u.FullName != null && u.FullName.ToLower().Contains(query)))
            .OrderBy(u => u.Email)
            .Take(6)
            .Select(u => new
            {
                id = u.Id.ToString(),
                title = u.FullName ?? u.Email ?? "User",
                subtitle = u.Email ?? "Tenant user",
                category = "User",
                route = "/user-management",
                icon = "👥",
                score = 50
            })
            .ToListAsync(ct);

        var staticResults = StaticResults()
            .Where(x =>
                x.title.ToLowerInvariant().Contains(query) ||
                x.subtitle.ToLowerInvariant().Contains(query) ||
                x.category.ToLowerInvariant().Contains(query))
            .Take(10)
            .Cast<object>()
            .ToList();

        var results = assets.Cast<object>()
            .Concat(risks)
            .Concat(vulnerabilities)
            .Concat(users)
            .Concat(staticResults)
            .Take(25)
            .ToList();

        return Ok(new
        {
            query = q,
            totalResults = results.Count,
            results,
            suggestions = DefaultSuggestions()
        });
    }

    private static string[] DefaultSuggestions() => new[]
    {
        "critical risks",
        "cloud posture",
        "audit logs",
        "users",
        "vulnerabilities",
        "full posture",
        "billing",
        "settings"
    };

    private record StaticSearchItem(string id, string title, string subtitle, string category, string route, string icon, int score);

    private static IEnumerable<StaticSearchItem> StaticResults() => new[]
    {
        new StaticSearchItem("dashboard", "Dashboard", "Executive security overview", "Page", "/", "📊", 100),
        new StaticSearchItem("assets", "Assets & Scans", "Run full posture scans and download reports", "Page", "/assets", "🌐", 100),
        new StaticSearchItem("vulnerabilities", "Vulnerabilities", "Review findings and remediation", "Page", "/vulnerabilities", "🛡️", 100),
        new StaticSearchItem("risks", "Risk Register", "Track likelihood, impact, and mitigation", "Page", "/risks", "⚠️", 100),
        new StaticSearchItem("compliance", "Compliance Center", "Compliance posture and audit readiness", "Page", "/compliance", "📋", 100),
        new StaticSearchItem("rbac", "RBAC Engine", "Roles and permission mapping", "Page", "/rbac", "🔐", 100),
        new StaticSearchItem("audit", "Audit Logs", "System activity and user actions", "Page", "/audit-logs", "🧾", 100),
        new StaticSearchItem("notifications", "Notifications", "Email and system delivery events", "Page", "/notifications", "🔔", 100),
        new StaticSearchItem("settings", "Settings", "Branding and deployment readiness", "Page", "/settings", "⚙️", 100),
        new StaticSearchItem("billing", "Billing", "Plans and subscription configuration", "Page", "/billing", "💳", 100)
    };
}
