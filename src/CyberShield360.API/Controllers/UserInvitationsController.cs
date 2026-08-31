using CyberShield360.Application.Common.Exceptions;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class UserInvitationsController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IEmailSender _emailSender;

    public UserInvitationsController(
        ApplicationDbContext db,
        ICurrentUser user,
        IEmailSender emailSender)
    {
        _db = db;
        _user = user;
        _emailSender = emailSender;
    }

    public record InviteUserRequest(string Email, string Role);

    [HttpPost("send")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> SendInvite([FromBody] InviteUserRequest request, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email is required.");

        // A TenantAdmin can grant any workspace role but never the cross-tenant
        // platform-owner role, and the role must be a real, known role rather than
        // arbitrary free text an invitee's inbox would otherwise display as-is.
        var allowedInviteRoles = AppRoles.All.Where(r => r != AppRoles.SuperAdmin).ToArray();
        if (!allowedInviteRoles.Contains(request.Role, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = $"Role must be one of: {string.Join(", ", allowedInviteRoles)}."
            });
        }

        var maxUsers = await _db.Subscriptions
            .Where(s => s.TenantId == tid)
            .Select(s => (int?)s.MaxUsers)
            .FirstOrDefaultAsync(ct);

        if (maxUsers is int userLimit)
        {
            var currentUserCount = await _db.Users.CountAsync(u => u.TenantId == tid, ct);
            if (currentUserCount >= userLimit)
                throw new ForbiddenAccessException(
                    "Your plan's user limit has been reached. Upgrade your plan to invite more team members.");
        }

        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tid, ct);

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "");

        var inviteLink = $"{Request.Scheme}://{Request.Host}/invite/accept?token={token}";

        var safeTenantName = System.Net.WebUtility.HtmlEncode(tenant?.Name ?? "CyberShield360");
        var safeRole = System.Net.WebUtility.HtmlEncode(request.Role);

        var subject = $"You are invited to CyberShield360 - {safeTenantName}";

        var body = $@"
            <h2>CyberShield360 Invitation</h2>
            <p>You have been invited to join <b>{safeTenantName}</b>.</p>
            <p><b>Role:</b> {safeRole}</p>
            <p>Click below to accept your invitation:</p>
            <p><a href='{inviteLink}'>Accept Invitation</a></p>
            <p>This invitation link is generated for onboarding workflow.</p>
        ";

        var log = new NotificationLog
        {
            TenantId = tid,
            Channel = NotificationChannel.Email,
            Recipient = request.Email,
            Subject = subject,
            Body = body
        };

        try
        {
            await _emailSender.SendAsync(request.Email, subject, body, ct);
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

        return Ok(new
        {
            message = log.Sent ? "Invitation email sent." : "Invitation logged but email failed.",
            request.Email,
            request.Role,
            inviteLink,
            sent = log.Sent,
            error = log.Error
        });
    }
}