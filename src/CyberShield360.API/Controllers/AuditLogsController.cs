using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class AuditLogsController : ApiControllerBase
{
    private readonly ICurrentUser _user;
    private readonly ApplicationDbContext _db;

    public AuditLogsController(ICurrentUser user, ApplicationDbContext db)
    {
        _user = user;
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tenantId)
            return Unauthorized();

        var auditLogs = await _db.AuditLogs
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(250)
            .ToListAsync(ct);

        var logs = auditLogs.Select(x =>
        {
            var action = x.Action.ToString();
            var entity = x.EntityType ?? "System";
            var description = x.Description ?? "";
            var category = GetCategory(entity, description, action);
            var status = IsFailure(description, action) ? "Failed" : "Success";

            return new
            {
                id = x.Id,
                eventType = GetEventType(action, entity, description),
                category,
                actor = string.IsNullOrWhiteSpace(x.UserEmail) ? "System" : x.UserEmail,
                target = GetTarget(entity, x.EntityId, description),
                status,
                ipAddress = string.IsNullOrWhiteSpace(x.IpAddress) ? "Unknown" : x.IpAddress,
                description = string.IsNullOrWhiteSpace(description) ? $"{action} {entity}" : description,
                userAgent = x.UserAgent,
                createdUtc = x.CreatedAtUtc
            };
        }).ToList();

        var categories = logs
            .GroupBy(x => x.category)
            .Select(g => new { name = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var last24h = logs.Count(x => x.createdUtc >= DateTime.UtcNow.AddDays(-1));
        var privilegedEvents = logs.Count(x =>
            x.category is "User Management" or "RBAC" or "Settings" or "Billing");

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalEvents = logs.Count,
            successfulEvents = logs.Count(x => x.status == "Success"),
            failedEvents = logs.Count(x => x.status == "Failed"),
            last24hEvents = last24h,
            privilegedEvents,
            categories,
            logs,
            recommendations = BuildRecommendations(logs.Count, last24h, privilegedEvents)
        });
    }

    private static string[] BuildRecommendations(int totalEvents, int last24h, int privilegedEvents)
    {
        var items = new List<string>();

        if (totalEvents == 0)
            items.Add("No audit activity is available yet. Generate system activity by logging in, running scans, and updating records.");

        if (last24h == 0)
            items.Add("No activity was recorded in the last 24 hours. Verify audit middleware is enabled in production.");
        else
            items.Add("Review recent activity daily and investigate unexpected privileged actions.");

        if (privilegedEvents > 0)
            items.Add("Privileged user, RBAC, settings, and billing actions should be reviewed by an administrator.");

        items.Add("Retain audit logs for compliance evidence and export them before external audits.");

        return items.Distinct().Take(4).ToArray();
    }

    private static bool IsFailure(string description, string action)
    {
        var value = $"{description} {action}".ToLowerInvariant();
        return value.Contains("fail") || value.Contains("error") || value.Contains("denied") || value.Contains("unauthorized");
    }

    private static string GetEventType(string action, string entityType, string description)
    {
        var value = $"{entityType} {description}".ToLowerInvariant();

        if (action.Equals("Login", StringComparison.OrdinalIgnoreCase)) return "User Login";
        if (action.Equals("Logout", StringComparison.OrdinalIgnoreCase)) return "User Logout";
        if (action.Equals("Export", StringComparison.OrdinalIgnoreCase)) return "Data Export";
        if (action.Equals("ScanRun", StringComparison.OrdinalIgnoreCase)) return "Security Scan Run";
        if (action.Equals("Invite", StringComparison.OrdinalIgnoreCase)) return "User Invitation";
        if (value.Contains("risk")) return $"Risk {action}";
        if (value.Contains("vulnerab")) return $"Vulnerability {action}";
        if (value.Contains("asset") || value.Contains("scan")) return $"Asset / Scan {action}";
        if (value.Contains("notification")) return $"Notification {action}";
        if (value.Contains("setting") || value.Contains("brand")) return $"Settings {action}";

        return $"{entityType} {action}".Trim();
    }

    private static string GetCategory(string entityType, string description, string action)
    {
        var value = $"{entityType} {description} {action}".ToLowerInvariant();

        if (value.Contains("login") || value.Contains("logout") || value.Contains("auth")) return "Authentication";
        if (value.Contains("user") || value.Contains("invite")) return "User Management";
        if (value.Contains("role") || value.Contains("rbac")) return "RBAC";
        if (value.Contains("scan") || value.Contains("asset")) return "Asset & Scan";
        if (value.Contains("risk")) return "Risk";
        if (value.Contains("vulnerab")) return "Vulnerability";
        if (value.Contains("compliance") || value.Contains("policy") || value.Contains("framework")) return "Compliance";
        if (value.Contains("billing") || value.Contains("subscription")) return "Billing";
        if (value.Contains("setting") || value.Contains("brand")) return "Settings";
        if (value.Contains("export")) return "Export";

        return "System";
    }

    private static string GetTarget(string entityType, string? entityId, string description)
    {
        if (!string.IsNullOrWhiteSpace(entityId))
            return $"{entityType} #{entityId}";

        if (!string.IsNullOrWhiteSpace(description))
            return description.Length > 80 ? description[..80] + "..." : description;

        return entityType;
    }
}
