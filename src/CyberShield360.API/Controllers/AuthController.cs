using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Auth.Dtos;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

public class AuthController : ApiControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly IJwtTokenService _jwt;
    private readonly ApplicationDbContext _db;
    private readonly ITenantProvider _tenant;

    public AuthController(UserManager<ApplicationUser> users, IJwtTokenService jwt,
        ApplicationDbContext db, ITenantProvider tenant)
    { _users = users; _jwt = jwt; _db = db; _tenant = tenant; }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterTenantRequest req)
    {
        var slug = req.TenantName.ToLowerInvariant().Replace(" ", "-");
        var tenant = new Tenant { Name = req.TenantName, Slug = $"{slug}-{Guid.NewGuid():N}".Substring(0, slug.Length + 5) };
        _db.Tenants.Add(tenant);
        _db.Subscriptions.Add(new Subscription
        {
            TenantId = tenant.Id, Plan = SubscriptionPlan.Free, Status = SubscriptionStatus.Trialing,
            TrialEndsUtc = DateTime.UtcNow.AddDays(14)
        });
        await _db.SaveChangesAsync();

        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            EmailConfirmed = true,
            TenantId = tenant.Id,
            FullName = req.FullName,
            IsActive = true,
            PasswordLastChangedUtc = DateTime.UtcNow
        };
        var result = await _users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await _users.AddToRoleAsync(user, AppRoles.TenantAdmin);
        return Ok(await BuildResponse(user));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await _users.FindByEmailAsync(req.Email);
        if (user is null || !user.IsActive || !await _users.CheckPasswordAsync(user, req.Password))
            return Unauthorized(new { message = "Invalid credentials." });

        var now = DateTime.UtcNow;
        var previousLoginUtc = user.LastLoginUtc;

        user.LastLoginUtc = now;

        // Existing accounts created before this field existed will capture a safe baseline on next login.
        user.PasswordLastChangedUtc ??= now;

        await _users.UpdateAsync(user);

        _db.AuditLogs.Add(new AuditLog
        {
            TenantId = user.TenantId,
            UserId = user.Id.ToString(),
            UserEmail = user.Email,
            Action = AuditAction.Login,
            EntityType = "Authentication",
            EntityId = user.Id.ToString(),
            Description = previousLoginUtc is null
                ? $"{user.Email} signed in. Login tracking is now active for this account."
                : $"{user.Email} signed in successfully.",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString()
        });

        _db.Notifications.Add(new NotificationLog
        {
            TenantId = user.TenantId,
            Channel = NotificationChannel.InApp,
            Recipient = user.Email ?? req.Email,
            Subject = previousLoginUtc is null ? "Login tracking enabled" : "Successful sign-in",
            Body = previousLoginUtc is null
                ? "CyberShield360 has started tracking last-login activity for this account."
                : $"New successful sign-in detected for {user.Email}.",
            Sent = false,
            SentAtUtc = null
        });

        await _db.SaveChangesAsync();

        return Ok(await BuildResponse(user));
    }

    private async Task<AuthResponse> BuildResponse(ApplicationUser user)
    {
        var roles = await _users.GetRolesAsync(user);
        var (token, expires) = _jwt.CreateToken(user.Id, user.Email!, user.TenantId, roles);
        return new AuthResponse(token, _jwt.CreateRefreshToken(), expires, user.TenantId, user.Email!, roles.ToArray());
    }
}
