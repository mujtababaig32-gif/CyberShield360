using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Auth.Dtos;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

[Authorize]
public class GoogleAuthController : ApiControllerBase
{
    private readonly ICurrentUser _user;
    private readonly UserManager<ApplicationUser> _users;
    private readonly IJwtTokenService _jwt;
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public GoogleAuthController(
        ICurrentUser user,
        UserManager<ApplicationUser> users,
        IJwtTokenService jwt,
        ApplicationDbContext db,
        IConfiguration config)
    {
        _user = user;
        _users = users;
        _jwt = jwt;
        _db = db;
        _config = config;
    }

    [HttpGet("summary")]
    public IActionResult Summary()
    {
        if (_user.TenantId is not Guid)
            return Unauthorized();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            provider = "Google Workspace",
            configuration = new
            {
                clientId = string.IsNullOrWhiteSpace(_config["GoogleAuth:ClientId"])
                    ? "Not Configured"
                    : "Configured",
                clientSecret = string.IsNullOrWhiteSpace(_config["GoogleAuth:ClientSecret"])
                    ? "Not Configured"
                    : "Configured",
                loginMode = "Google Identity Token",
                status = "Configured"
            },
            capabilities = new[]
            {
                "Google OAuth Login",
                "Google Token Verification",
                "Automatic User Provisioning",
                "Tenant Creation for New Google Users",
                "JWT Session Generation",
                "Role Assignment",
                "Google Login Audit Logging",
                "Google Login Notifications"
            }
        });
    }

    public record GoogleLoginRequest(string Credential);

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Credential))
            return BadRequest(new { message = "Google credential is required." });

        var clientId = _config["GoogleAuth:ClientId"];

        if (string.IsNullOrWhiteSpace(clientId))
            return StatusCode(500, new { message = "Google Client ID is not configured." });

        GoogleJsonWebSignature.Payload payload;

        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(
                request.Credential,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { clientId }
                });
        }
        catch
        {
            return Unauthorized(new { message = "Invalid Google login. Please try again." });
        }

        if (string.IsNullOrWhiteSpace(payload.Email))
            return Unauthorized(new { message = "Google account email could not be verified." });

        var email = payload.Email;
        var name = string.IsNullOrWhiteSpace(payload.Name) ? email : payload.Name;

        var user = await _users.FindByEmailAsync(email);

        if (user is null)
        {
            var tenant = new Tenant
            {
                Name = $"{name}'s Workspace",
                Slug = $"google-{Guid.NewGuid():N}"[..18],
                IsActive = true
            };

            _db.Tenants.Add(tenant);

            _db.Subscriptions.Add(new Subscription
            {
                TenantId = tenant.Id,
                Plan = SubscriptionPlan.Free,
                Status = SubscriptionStatus.Trialing,
                TrialEndsUtc = DateTime.UtcNow.AddDays(14)
            });

            await _db.SaveChangesAsync();

            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FullName = name,
                TenantId = tenant.Id,
                IsActive = true,
                LastLoginUtc = DateTime.UtcNow
            };

            var createResult = await _users.CreateAsync(user);

            if (!createResult.Succeeded)
                return BadRequest(new
                {
                    message = "Could not create Google user.",
                    errors = createResult.Errors.Select(e => e.Description)
                });

            await _users.AddToRoleAsync(user, AppRoles.TenantAdmin);
        }

        if (!user.IsActive)
            return Unauthorized(new { message = "This user account is disabled." });

        user.LastLoginUtc = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        _db.AuditLogs.Add(new AuditLog
        {
            TenantId = user.TenantId,
            UserId = user.Id.ToString(),
            UserEmail = user.Email,
            Action = AuditAction.Login,
            EntityType = "Authentication",
            EntityId = user.Id.ToString(),
            Description = $"{user.Email} signed in using Google OAuth.",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString()
        });

        _db.Notifications.Add(new NotificationLog
        {
            TenantId = user.TenantId,
            Channel = NotificationChannel.InApp,
            Recipient = user.Email!,
            Subject = "New Google sign-in detected",
            Body = $"{user.Email} signed in using Google OAuth.",
            Sent = false,
            SentAtUtc = null,
            Error = null
        });

        await _db.SaveChangesAsync();

        var roles = await _users.GetRolesAsync(user);
        var (token, expires) = _jwt.CreateToken(user.Id, user.Email!, user.TenantId, roles);

        return Ok(new AuthResponse(
            token,
            _jwt.CreateRefreshToken(),
            expires,
            user.TenantId,
            user.Email!,
            roles.ToArray()
        ));
    }
}