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
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;

    public AuthController(UserManager<ApplicationUser> users, IJwtTokenService jwt,
        ApplicationDbContext db, ITenantProvider tenant, IEmailSender emailSender, IConfiguration config)
    { _users = users; _jwt = jwt; _db = db; _tenant = tenant; _emailSender = emailSender; _config = config; }

    // Every wizard tier maps to a real plan tier with real limits (stored on
    // the Subscription even though nothing enforces them yet), plus a
    // 14-day trial for all of them — there's no payment collection wired up
    // yet, so charging isn't possible at signup regardless of tier chosen.
    private static readonly Dictionary<string, (SubscriptionPlan Plan, int MaxAssets, int MaxUsers, int MaxScansPerMonth)> PlanTiers = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Starter"] = (SubscriptionPlan.Starter, 25, 3, 50),
        ["Professional"] = (SubscriptionPlan.Professional, 100, 10, 250),
        ["Enterprise"] = (SubscriptionPlan.Enterprise, 500, 25, 1000),
        ["Agency"] = (SubscriptionPlan.Agency, 5000, 100, 10000),
    };

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterTenantRequest req)
    {
        var tier = req.Plan is not null && PlanTiers.TryGetValue(req.Plan, out var found)
            ? found
            : (Plan: SubscriptionPlan.Free, MaxAssets: 1, MaxUsers: 3, MaxScansPerMonth: 10);

        // Tenant/Subscription/User creation must succeed or fail together —
        // otherwise a rejected password or duplicate email (both routine,
        // user-triggered failures below) would leave an orphaned tenant and
        // subscription behind with no user ever attached to them.
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var slug = req.TenantName.ToLowerInvariant().Replace(" ", "-");
        var tenant = new Tenant { Name = req.TenantName, Slug = $"{slug}-{Guid.NewGuid():N}".Substring(0, slug.Length + 5) };
        _db.Tenants.Add(tenant);
        _db.Subscriptions.Add(new Subscription
        {
            TenantId = tenant.Id, Plan = tier.Plan, Status = SubscriptionStatus.Trialing,
            TrialEndsUtc = DateTime.UtcNow.AddDays(14),
            MaxAssets = tier.MaxAssets, MaxUsers = tier.MaxUsers, MaxScansPerMonth = tier.MaxScansPerMonth
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
        {
            await transaction.RollbackAsync();
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        await _users.AddToRoleAsync(user, AppRoles.TenantAdmin);
        await transaction.CommitAsync();
        return Ok(await BuildResponse(user));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await _users.FindByEmailAsync(req.Email);
        if (user is null || !user.IsActive || !await _users.CheckPasswordAsync(user, req.Password))
            return Unauthorized(new { message = "Invalid credentials." });

        if (user.TwoFactorEnabled)
        {
            // Don't record the sign-in or issue any token yet — the password alone
            // isn't a completed login for an MFA-enabled account. This challenge
            // token only proves "password was correct"; it grants no API access.
            var challengeToken = _jwt.CreateRefreshToken();

            _db.MfaChallenges.Add(new MfaChallenge
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                TokenHash = _jwt.HashRefreshToken(challengeToken),
                ExpiresUtc = DateTime.UtcNow.AddMinutes(5)
            });

            await _db.SaveChangesAsync();

            return Ok(new { mfaRequired = true, mfaToken = challengeToken });
        }

        return Ok(await CompleteLoginAsync(user, req.Email));
    }

    public record LoginMfaRequest(string MfaToken, string Code);

    [HttpPost("login/mfa")]
    public async Task<IActionResult> LoginMfa([FromBody] LoginMfaRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.MfaToken) || string.IsNullOrWhiteSpace(req.Code))
            return Unauthorized(new { message = "MFA token and code are required." });

        var tokenHash = _jwt.HashRefreshToken(req.MfaToken);

        var challenge = await _db.MfaChallenges.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TokenHash == tokenHash, ct);

        if (challenge is null || challenge.Consumed || challenge.ExpiresUtc <= DateTime.UtcNow)
            return Unauthorized(new { message = "MFA challenge is invalid or has expired. Sign in again." });

        var user = await _users.FindByIdAsync(challenge.UserId.ToString());
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Account is not available." });

        var code = req.Code.Replace(" ", "");
        var validCode = await _users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code)
            || (await _users.RedeemTwoFactorRecoveryCodeAsync(user, code)).Succeeded;

        if (!validCode)
            return Unauthorized(new { message = "Invalid authentication code." });

        challenge.Consumed = true;
        await _db.SaveChangesAsync(ct);

        return Ok(await CompleteLoginAsync(user, user.Email!));
    }

    private async Task<AuthResponse> CompleteLoginAsync(ApplicationUser user, string emailFallback)
    {
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
            Recipient = user.Email ?? emailFallback,
            Subject = previousLoginUtc is null ? "Login tracking enabled" : "Successful sign-in",
            Body = previousLoginUtc is null
                ? "CyberShield360 has started tracking last-login activity for this account."
                : $"New successful sign-in detected for {user.Email}.",
            Sent = false,
            SentAtUtc = null
        });

        await _db.SaveChangesAsync();

        return await BuildResponse(user);
    }

    public record ForgotPasswordRequest(string Email);

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req, CancellationToken ct)
    {
        // Always return the same response whether or not the account exists, so this
        // endpoint cannot be used to enumerate registered emails.
        const string genericMessage = "If an account exists for that email, a reset link has been sent.";

        if (string.IsNullOrWhiteSpace(req.Email))
            return Ok(new { message = genericMessage });

        var user = await _users.FindByEmailAsync(req.Email.Trim());

        if (user is not null && user.IsActive)
        {
            var token = await _users.GeneratePasswordResetTokenAsync(user);
            var resetLink = BuildResetLink(user.Email!, token);

            var safeEmail = System.Net.WebUtility.HtmlEncode(user.Email);
            var subject = "Reset your CyberShield360 password";
            var body = $@"
                <h2>Reset your password</h2>
                <p>We received a request to reset the password for <b>{safeEmail}</b>.</p>
                <p><a href='{resetLink}'>Choose a new password</a></p>
                <p>This link expires soon. If you didn't request this, you can safely ignore this email.</p>
            ";

            var log = new NotificationLog
            {
                TenantId = user.TenantId,
                Channel = NotificationChannel.Email,
                Recipient = user.Email!,
                Subject = subject,
                Body = body
            };

            try
            {
                await _emailSender.SendAsync(user.Email!, subject, body, ct);
                log.Sent = true;
                log.SentAtUtc = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                log.Sent = false;
                log.Error = ex.Message;
            }

            _db.Notifications.Add(log);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { message = genericMessage });
    }

    public record ResetPasswordRequest(string Email, string Token, string NewPassword);

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Email, token, and new password are required." });

        var user = await _users.FindByEmailAsync(req.Email.Trim());
        if (user is null || !user.IsActive)
            return BadRequest(new { message = "This reset link is invalid or has expired." });

        var result = await _users.ResetPasswordAsync(user, req.Token, req.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "This reset link is invalid or has expired.",
                errors = result.Errors.Select(e => e.Description)
            });
        }

        user.PasswordLastChangedUtc = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        _db.AuditLogs.Add(new AuditLog
        {
            TenantId = user.TenantId,
            UserId = user.Id.ToString(),
            UserEmail = user.Email,
            Action = AuditAction.Update,
            EntityType = "Authentication",
            EntityId = user.Id.ToString(),
            Description = $"{user.Email} reset their password.",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString()
        });
        await _db.SaveChangesAsync(ct);

        return Ok(new { message = "Password updated. You can now sign in." });
    }

    private string BuildResetLink(string email, string token)
    {
        var frontendBaseUrl = ResolveFrontendBaseUrl().TrimEnd('/');
        var query = $"email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        return $"{frontendBaseUrl}/reset-password?{query}";
    }

    private string ResolveFrontendBaseUrl()
    {
        var configured = _config["App:FrontendBaseUrl"];
        if (!string.IsNullOrWhiteSpace(configured)) return configured;

        var origins = _config.GetSection("Cors:Origins").Get<string[]>() ?? [];
        var preferred = origins.FirstOrDefault(o => !o.Contains("localhost", StringComparison.OrdinalIgnoreCase))
            ?? origins.FirstOrDefault();

        return preferred ?? $"{Request.Scheme}://{Request.Host}";
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
