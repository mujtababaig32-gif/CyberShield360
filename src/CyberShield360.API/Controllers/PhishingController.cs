using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

/// <summary>
/// Phishing SIMULATION for internal, authorized employee security-awareness training ONLY.
/// A TenantAdmin must explicitly confirm authorization, and targets are restricted to the
/// tenant's own employees. No live credential capture is performed.
/// </summary>
[Authorize(Roles = "TenantAdmin")]
public class PhishingController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;
    private readonly ILogger<PhishingController> _logger;

    public PhishingController(
        ApplicationDbContext db,
        ICurrentUser user,
        IEmailSender emailSender,
        IConfiguration config,
        ILogger<PhishingController> logger)
    {
        _db = db;
        _user = user;
        _emailSender = emailSender;
        _config = config;
        _logger = logger;
    }

    [HttpGet("templates")]
    public IActionResult Templates() =>
        Ok(PhishingTemplateCatalog.All.Select(t => new { t.Name, t.Category, t.Difficulty, t.Subject }));

    [HttpPost("campaigns")]
    public async Task<IActionResult> Create([FromBody] CreateCampaignRequest req)
    {
        if (!req.AuthorizationConfirmed)
            return BadRequest(new { message = "You must confirm authorization to run an internal phishing simulation." });
        if (_user.TenantId is not Guid tid) return Unauthorized();

        // Targets must be employees of THIS tenant only.
        var validTargets = await _db.Users
            .Where(u => u.TenantId == tid && req.TargetUserIds.Contains(u.Id))
            .Select(u => u.Id).ToListAsync();

        var campaign = new PhishingCampaign
        {
            TenantId = tid, Name = req.Name, TemplateName = req.TemplateName,
            Status = PhishingCampaignStatus.Draft, AuthorizationConfirmed = true,
            ScheduledForUtc = req.ScheduledForUtc,
            LandingPageMessage = req.LandingPageMessage ?? "This was a simulated phishing test. Please review your security training."
        };
        foreach (var uid in validTargets)
            campaign.Targets.Add(new PhishingTarget { TenantId = tid, UserId = uid });

        _db.PhishingCampaigns.Add(campaign);
        await _db.SaveChangesAsync();
        return Ok(new { campaign.Id, TargetCount = validTargets.Count });
    }

    [HttpGet("campaigns/{id:guid}/results")]
    public async Task<IActionResult> Results(Guid id)
    {
        var campaign = await _db.PhishingCampaigns.Include(c => c.Targets)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (campaign is null) return NotFound();
        return Ok(new
        {
            campaign.Name, campaign.Status,
            Total = campaign.Targets.Count,
            Clicked = campaign.Targets.Count(t => t.Result == PhishingResult.Clicked),
            Reported = campaign.Targets.Count(t => t.Result == PhishingResult.Reported)
        });
    }

    [HttpPost("campaigns/{id:guid}/launch")]
    public async Task<IActionResult> Launch(Guid id, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var campaign = await _db.PhishingCampaigns
            .Include(c => c.Targets)
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tid, ct);

        if (campaign is null) return NotFound();

        if (!campaign.AuthorizationConfirmed)
            return BadRequest(new { message = "This campaign is not authorized to launch." });

        var template = PhishingTemplateCatalog.Find(campaign.TemplateName);
        if (template is null)
            return BadRequest(new { message = "Select a valid template before launching." });

        var pendingTargets = campaign.Targets.Where(t => t.Result == PhishingResult.NotSent).ToList();
        if (pendingTargets.Count == 0)
            return BadRequest(new { message = "No pending recipients to send to." });

        var userIds = pendingTargets.Select(t => t.UserId).ToList();
        var users = await _db.Users
            .Where(u => u.TenantId == tid && userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Email, u.FullName })
            .ToListAsync(ct);
        var userMap = users.ToDictionary(u => u.Id, u => u);

        var apiBaseUrl = $"{Request.Scheme}://{Request.Host}";
        var sent = 0;
        var failed = 0;

        foreach (var target in pendingTargets)
        {
            if (!userMap.TryGetValue(target.UserId, out var recipient) || string.IsNullOrWhiteSpace(recipient.Email))
            {
                failed++;
                continue;
            }

            var trackingLink = $"{apiBaseUrl}/api/v1/phishingtracking/click/{target.Id}";
            var recipientName = string.IsNullOrWhiteSpace(recipient.FullName) ? recipient.Email : recipient.FullName;

            var body = template.HtmlBody
                .Replace("{{Name}}", System.Net.WebUtility.HtmlEncode(recipientName))
                .Replace("{{Link}}", trackingLink);

            // Invisible open-tracking pixel — most mail clients load images by default.
            body += $"<img src=\"{apiBaseUrl}/api/v1/phishingtracking/open/{target.Id}\" width=\"1\" height=\"1\" alt=\"\" style=\"display:none\" />";

            try
            {
                await _emailSender.SendAsync(recipient.Email!, template.Subject, body, ct);
                target.Result = PhishingResult.Delivered;
                target.DeliveredUtc = DateTime.UtcNow;
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send phishing simulation email to {Email} for campaign {CampaignId}", recipient.Email, campaign.Id);
                failed++;
            }
        }

        campaign.Status = PhishingCampaignStatus.Running;
        await _db.SaveChangesAsync(ct);

        return Ok(new { sent, failed, status = campaign.Status.ToString() });
    }
}

public record CreateCampaignRequest(string Name, string? TemplateName, List<Guid> TargetUserIds,
    DateTime? ScheduledForUtc, string? LandingPageMessage, bool AuthorizationConfirmed);
