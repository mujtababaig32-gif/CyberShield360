using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class RbacController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public RbacController(ApplicationDbContext db, ICurrentUser user)
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
            .Where(x => x.TenantId == tid)
            .OrderBy(x => x.Email)
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.FullName,
                x.IsActive,
                x.EmailConfirmed,
                x.LastLoginUtc
            })
            .ToListAsync(ct);

        var userIds = users.Select(x => x.Id).ToList();

        var userRoles = await (
            from ur in _db.UserRoles.AsNoTracking()
            join r in _db.Roles.AsNoTracking() on ur.RoleId equals r.Id
            where userIds.Contains(ur.UserId)
            select new { ur.UserId, Role = r.Name ?? "Unknown", r.Description }
        ).ToListAsync(ct);

        var roleCards = AppRoles.All
            .Select(role => new
            {
                role,
                description = GetRoleDescription(role),
                users = userRoles.Count(x => x.Role == role),
                privilege = GetPrivilege(role),
                mfaRecommended = role is AppRoles.SuperAdmin or AppRoles.TenantAdmin
            })
            .ToList();

        var userCards = users.Select(u =>
        {
            var roles = userRoles
                .Where(r => r.UserId == u.Id)
                .Select(r => r.Role)
                .Distinct()
                .OrderBy(r => r)
                .ToArray();

            return new
            {
                id = u.Id,
                email = u.Email,
                fullName = u.FullName,
                isActive = u.IsActive,
                emailConfirmed = u.EmailConfirmed,
                lastLoginUtc = u.LastLoginUtc,
                roles,
                accessLevel = roles.Contains(AppRoles.SuperAdmin) || roles.Contains(AppRoles.TenantAdmin)
                    ? "Privileged"
                    : roles.Contains(AppRoles.Auditor)
                        ? "Audit"
                        : roles.Any()
                            ? "Standard"
                            : "Unassigned"
            };
        }).ToList();

        var permissions = new[]
        {
            new { module = "Dashboard", tenantAdmin = true, securityAnalyst = true, auditor = true, member = true },
            new { module = "Assets & Scans", tenantAdmin = true, securityAnalyst = true, auditor = true, member = false },
            new { module = "Vulnerabilities", tenantAdmin = true, securityAnalyst = true, auditor = true, member = false },
            new { module = "Risks", tenantAdmin = true, securityAnalyst = true, auditor = true, member = false },
            new { module = "Compliance", tenantAdmin = true, securityAnalyst = true, auditor = true, member = false },
            new { module = "Users & RBAC", tenantAdmin = true, securityAnalyst = false, auditor = true, member = false },
            new { module = "Settings", tenantAdmin = true, securityAnalyst = false, auditor = false, member = false },
            new { module = "Billing", tenantAdmin = true, securityAnalyst = false, auditor = false, member = false }
        };

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalUsers = users.Count,
            activeUsers = users.Count(x => x.IsActive),
            privilegedUsers = userCards.Count(x => x.accessLevel == "Privileged"),
            unassignedUsers = userCards.Count(x => x.accessLevel == "Unassigned"),
            totalRoles = roleCards.Count,
            roles = roleCards,
            users = userCards,
            permissions,
            recommendations = new[]
            {
                "Keep TenantAdmin assignments limited to trusted administrators.",
                "Review unassigned or inactive users before external audits.",
                "Enable MFA for privileged roles before production launch.",
                "Use Auditor role for evidence review without granting write access."
            }
        });
    }

    private static string GetRoleDescription(string role) => role switch
    {
        AppRoles.SuperAdmin => "Platform owner with full cross-tenant administration.",
        AppRoles.TenantAdmin => "Tenant administrator with billing, user, and configuration access.",
        AppRoles.SecurityAnalyst => "Security operations user for scans, vulnerabilities, and remediation.",
        AppRoles.Auditor => "Read-focused evidence and audit review role.",
        AppRoles.Member => "Limited workspace member access.",
        _ => "Custom role."
    };

    private static string GetPrivilege(string role) => role switch
    {
        AppRoles.SuperAdmin => "Critical",
        AppRoles.TenantAdmin => "High",
        AppRoles.SecurityAnalyst => "Medium",
        AppRoles.Auditor => "Low",
        AppRoles.Member => "Low",
        _ => "Custom"
    };
}
