using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class ProfileController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public ProfileController(ApplicationDbContext db, ICurrentUser user)
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

        var currentUser = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == _user.UserId, ct);

        var primaryRole = _user.Roles.FirstOrDefault() ?? "Member";
        var loginMethod = string.IsNullOrWhiteSpace(currentUser?.PasswordHash)
            ? "Passwordless / OAuth"
            : "Email + Password";
        var mfaEnabled = currentUser?.TwoFactorEnabled == true;

        var recommendations = new List<string>();

        if (!mfaEnabled)
            recommendations.Add("Enable multi-factor authentication for this account to protect it against password compromise.");

        if (currentUser?.LastLoginUtc is null)
            recommendations.Add("Login tracking will populate after the next successful sign-in.");

        if (currentUser?.PasswordLastChangedUtc is null && loginMethod == "Email + Password")
            recommendations.Add("Password-change tracking will use the next successful password update or baseline capture.");

        recommendations.Add("Review user access every 90 days and remove accounts that no longer need access.");
        recommendations.Add("Keep tenant billing, security contacts, and notification settings updated before client launch.");

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            user = new
            {
                id = currentUser?.Id,
                name = currentUser?.FullName ?? "CyberShield User",
                email = currentUser?.Email ?? _user.Email,
                role = FormatRole(primaryRole),
                mfaStatus = mfaEnabled ? "Enabled" : "Not Enabled",
                loginMethod,
                mfaAvailable = true,
                mfaMessage = mfaEnabled
                    ? "Multi-factor authentication is enabled for this account."
                    : "Multi-factor authentication is not enabled for this account."
            },
            tenant = new
            {
                id = tenant?.Id,
                name = tenant?.Name ?? "CyberShield360 Tenant",
                status = tenant?.IsActive == true ? "Active" : "Inactive",
                plan = "Growth"
            },
            security = new
            {
                passwordLastChangedUtc = currentUser?.PasswordLastChangedUtc,
                activeSessions = 1,
                lastLoginUtc = currentUser?.LastLoginUtc,
                accountStatus = currentUser?.IsActive == true ? "Active" : "Inactive",
                loginTracking = currentUser?.LastLoginUtc is null ? "Pending next login" : "Active",
                passwordTracking = currentUser?.PasswordLastChangedUtc is null
                    ? (loginMethod == "Passwordless / OAuth" ? "Not required for OAuth" : "Baseline pending")
                    : "Active"
            },
            recommendations = recommendations.Distinct().Take(5).ToArray()
        });
    }

    private static string FormatRole(string role) => role switch
    {
        "TenantAdmin" => "Tenant Admin",
        "SecurityAnalyst" => "Security Analyst",
        "SuperAdmin" => "Super Admin",
        _ => role
    };
}
