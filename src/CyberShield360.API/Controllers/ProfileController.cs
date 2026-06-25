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

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            user = new
            {
                id = currentUser?.Id,
                name = currentUser?.FullName ?? "CyberShield User",
                email = currentUser?.Email ?? _user.Email,
                role = "Tenant Admin",
                mfaStatus = "Not Enabled",
                loginMethod = "Email + Password"
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
                passwordLastChanged = "Not tracked",
                activeSessions = 1,
                lastLogin = "Not tracked"
            },
            recommendations = new[]
            {
                "Enable MFA for administrator accounts.",
                "Connect Microsoft or Google login for enterprise SSO.",
                "Review user access every 90 days.",
                "Keep tenant billing and security contacts updated."
            }
        });
    }
}