using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class UserManagementController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public UserManagementController(
        ApplicationDbContext db,
        ICurrentUser user)
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
                x.LastLoginUtc,
                x.TenantId
            })
            .ToListAsync(ct);

        var userIds = users.Select(x => x.Id).ToList();

        var userRoles = await (
            from ur in _db.UserRoles.AsNoTracking()
            join r in _db.Roles.AsNoTracking()
                on ur.RoleId equals r.Id
            where userIds.Contains(ur.UserId)
            select new
            {
                ur.UserId,
                Role = r.Name ?? "Unknown"
            }
        ).ToListAsync(ct);

        var roleSummary = userRoles
            .GroupBy(x => x.Role)
            .Select(g => new
            {
                role = g.Key,
                count = g.Select(x => x.UserId).Distinct().Count()
            })
            .OrderByDescending(x => x.count)
            .ThenBy(x => x.role)
            .ToList();

        var invitationLogs = await _db.Notifications
            .AsNoTracking()
            .Where(n =>
                n.TenantId == tid &&
                (
                    n.Subject.Contains("Invitation") ||
                    n.Subject.Contains("Invite") ||
                    n.Body.Contains("invited") ||
                    n.Body.Contains("invitation")
                ))
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(25)
            .Select(n => new
            {
                id = n.Id,
                email = n.Recipient,
                role = "Invited User",
                status = n.Sent ? "Sent" : "Created",
                invitedUtc = n.CreatedAtUtc,
                subject = n.Subject,
                message = n.Body
            })
            .ToListAsync(ct);

        var userList = users.Select(x =>
        {
            var roles = userRoles
                .Where(r => r.UserId == x.Id)
                .Select(r => r.Role)
                .Distinct()
                .OrderBy(r => r)
                .ToArray();

            return new
            {
                id = x.Id,
                email = x.Email,
                fullName = x.FullName,
                isActive = x.IsActive,
                emailConfirmed = x.EmailConfirmed,
                lastLoginUtc = x.LastLoginUtc,
                roles
            };
        }).ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,

            totalUsers = users.Count,
            activeUsers = users.Count(x => x.IsActive),
            inactiveUsers = users.Count(x => !x.IsActive),
            confirmedUsers = users.Count(x => x.EmailConfirmed),
            unconfirmedUsers = users.Count(x => !x.EmailConfirmed),

            totalRolesAssigned = userRoles.Count,
            roleSummary,

            pendingInvitations = invitationLogs.Count(x => x.status != "Sent"),
            invitations = invitationLogs,

            users = userList,

            recommendations = new[]
            {
                "Review inactive users regularly.",
                "Ensure every admin account uses strong authentication.",
                "Remove unused accounts from the tenant.",
                "Create a dedicated UserInvitation table later for full invitation tracking."
            }
        });
    }
}