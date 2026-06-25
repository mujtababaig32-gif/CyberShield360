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
    public async Task<IActionResult> SendInvite([FromBody] InviteUserRequest request, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email is required.");

        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tid, ct);

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "");

        var inviteLink = $"{Request.Scheme}://{Request.Host}/invite/accept?token={token}";

        var subject = $"You are invited to CyberShield360 - {tenant?.Name ?? "Security Workspace"}";

        var body = $@"
            <h2>CyberShield360 Invitation</h2>
            <p>You have been invited to join <b>{tenant?.Name ?? "CyberShield360"}</b>.</p>
            <p><b>Role:</b> {request.Role}</p>
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