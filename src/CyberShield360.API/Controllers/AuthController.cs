using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Auth.Dtos;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[EnableRateLimiting("auth")]
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

    public record RefreshTokenRequest(string RefreshToken);

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return Unauthorized(new { message = "Refresh token is required." });

        var tokenHash = _jwt.HashRefreshToken(req.RefreshToken);

        // The caller has no access token yet at this point, so there is no tenant
        // context to filter by — the token hash itself is what identifies the record.
        var stored = await _db.RefreshTokens.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

        if (stored is null)
            return Unauthorized(new { message = "Invalid refresh token." });

        if (stored.RevokedUtc is not null)
        {
            // A revoked token being presented again means it was likely stolen from
            // an earlier response: revoke every other active token for this user.
            var activeTokens = await _db.RefreshTokens.IgnoreQueryFilters()
                .Where(t => t.UserId == stored.UserId && t.RevokedUtc == null)
                .ToListAsync(ct);

            foreach (var active in activeTokens)
                active.RevokedUtc = DateTime.UtcNow;

            if (activeTokens.Count > 0)
                await _db.SaveChangesAsync(ct);

            return Unauthorized(new { message = "Refresh token has already been used." });
        }

        if (stored.ExpiresUtc <= DateTime.UtcNow)
            return Unauthorized(new { message = "Refresh token has expired." });

        var user = await _users.FindByIdAsync(stored.UserId.ToString());
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Account is not available." });

        var newRefreshToken = _jwt.CreateRefreshToken();
        var newHash = _jwt.HashRefreshToken(newRefreshToken);

        stored.RevokedUtc = DateTime.UtcNow;
        stored.ReplacedByTokenHash = newHash;

        _db.RefreshTokens.Add(new RefreshToken
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            TokenHash = newHash,
            ExpiresUtc = DateTime.UtcNow.AddDays(30)
        });

        var roles = await _users.GetRolesAsync(user);
        var (accessToken, expires) = _jwt.CreateToken(user.Id, user.Email!, user.TenantId, roles);

        await _db.SaveChangesAsync(ct);

        return Ok(new AuthResponse(accessToken, newRefreshToken, expires, user.TenantId, user.Email!, roles.ToArray()));
    }

    private async Task<AuthResponse> BuildResponse(ApplicationUser user)
    {
        var roles = await _users.GetRolesAsync(user);
        var (token, expires) = _jwt.CreateToken(user.Id, user.Email!, user.TenantId, roles);
        var refreshToken = await IssueRefreshTokenAsync(user);
        return new AuthResponse(token, refreshToken, expires, user.TenantId, user.Email!, roles.ToArray());
    }

    private async Task<string> IssueRefreshTokenAsync(ApplicationUser user)
    {
        var refreshToken = _jwt.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            TenantId = user.TenantId,
            UserId = user.Id,
            TokenHash = _jwt.HashRefreshToken(refreshToken),
            ExpiresUtc = DateTime.UtcNow.AddDays(30)
        });

        await _db.SaveChangesAsync();

        return refreshToken;
    }
}
