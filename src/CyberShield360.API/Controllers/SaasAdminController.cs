using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class SaasAdminController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public SaasAdminController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var tenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tid, ct);

        var subscription = await SafeFirstOrDefaultAsync(() => _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tid, ct));

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tid)
            .OrderBy(u => u.Email)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.IsActive,
                u.EmailConfirmed,
                u.LastLoginUtc
            })
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);

        var assetCount = await SafeCountAsync(() => _db.Assets.AsNoTracking().CountAsync(a => a.TenantId == tid, ct));
        var scansThisMonth = await SafeCountAsync(() => _db.Scans.AsNoTracking().CountAsync(s => s.TenantId == tid && s.CreatedAtUtc >= monthStart, ct));
        var scheduledScans = await SafeCountAsync(() => _db.ScheduledScans.AsNoTracking().CountAsync(s => s.TenantId == tid && s.Enabled, ct));
        var notifications = await SafeCountAsync(() => _db.Notifications.AsNoTracking().CountAsync(n => n.TenantId == tid, ct));
        var auditEvents = await SafeCountAsync(() => _db.AuditLogs.AsNoTracking().CountAsync(a => a.TenantId == tid, ct));
        var reports = await SafeCountAsync(() => _db.Reports.AsNoTracking().CountAsync(r => r.TenantId == tid, ct));

        var userCards = users.Select(u => new
        {
            id = u.Id,
            fullName = u.FullName,
            email = u.Email,
            isActive = u.IsActive,
            emailConfirmed = u.EmailConfirmed,
            lastLoginUtc = u.LastLoginUtc,
            role = u.Email != null && u.Email.Contains("admin", StringComparison.OrdinalIgnoreCase)
                ? "TenantAdmin"
                : "SecurityAnalyst",
            loginMethod = "Email + Password",
            mfaStatus = "Not Connected"
        }).ToList();

        var maxAssets = subscription?.MaxAssets ?? 25;
        var maxUsers = subscription?.MaxUsers ?? 10;
        var maxScans = subscription?.MaxScansPerMonth ?? 100;

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            tenant = new
            {
                id = tenant?.Id,
                name = tenant?.Name ?? "Unknown Tenant",
                slug = tenant?.Slug,
                primaryDomain = tenant?.PrimaryDomain,
                status = tenant?.IsActive == true ? "Active" : "Inactive",
                plan = subscription?.Plan.ToString() ?? SubscriptionPlan.Free.ToString(),
                billingStatus = subscription?.Status.ToString() ?? SubscriptionStatus.Incomplete.ToString(),
                trialEndsUtc = subscription?.TrialEndsUtc,
                currentPeriodEndUtc = subscription?.CurrentPeriodEndUtc,
                whiteLabelEnabled = tenant?.WhiteLabelEnabled ?? false
            },
            limits = new
            {
                maxAssets,
                maxUsers,
                maxScansPerMonth = maxScans,
                assetUsagePercent = Percentage(assetCount, maxAssets),
                userUsagePercent = Percentage(users.Count, maxUsers),
                scanUsagePercent = Percentage(scansThisMonth, maxScans)
            },
            totals = new
            {
                users = users.Count,
                activeUsers = users.Count(x => x.IsActive),
                inactiveUsers = users.Count(x => !x.IsActive),
                assets = assetCount,
                scansThisMonth,
                scheduledScans,
                notifications,
                auditEvents,
                reports
            },
            loginMethods = new[]
            {
                new { provider = "Email + Password", status = "Enabled", priority = "Core" },
                new { provider = "Google Login", status = "Available when Google OAuth credentials are configured", priority = "Optional" },
                new { provider = "Microsoft Login", status = "Available when Microsoft OAuth credentials are configured", priority = "Optional" },
                new { provider = "MFA", status = "Not Connected", priority = "High" }
            },
            saasReadiness = new[]
            {
                new { item = "Tenant Isolation", status = "Enabled", priority = "Critical" },
                new { item = "User Management", status = users.Count > 0 ? "Active" : "Needs Users", priority = "High" },
                new { item = "Audit Logs", status = auditEvents > 0 ? "Active" : "No Events Yet", priority = "High" },
                new { item = "SMTP Email", status = notifications > 0 ? "Validated / Events Present" : "Needs Test", priority = "High" },
                new { item = "Subscription Billing", status = subscription?.Status.ToString() ?? "Not Configured", priority = "High" },
                new { item = "White Label", status = tenant?.WhiteLabelEnabled == true ? "Enabled" : "Disabled", priority = "Medium" }
            },
            users = userCards,
            recommendations = new[]
            {
                "Move secrets from appsettings.json to environment variables before deployment.",
                "Enable MFA for tenant administrators before onboarding customers.",
                "Configure billing and production SMTP before launch.",
                "Review tenant plan limits and upgrade if usage approaches quota."
            }
        });
    }

    private static int Percentage(int used, int limit)
    {
        if (limit <= 0) return 0;
        return Math.Clamp((int)Math.Round((double)used / limit * 100), 0, 999);
    }

    private static async Task<int> SafeCountAsync(Func<Task<int>> action)
    {
        try
        {
            return await action();
        }
        catch
        {
            return 0;
        }
    }

    private static async Task<T?> SafeFirstOrDefaultAsync<T>(Func<Task<T?>> action)
    {
        try
        {
            return await action();
        }
        catch
        {
            return default;
        }
    }
}
