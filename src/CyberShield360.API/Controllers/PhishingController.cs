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
    public PhishingController(ApplicationDbContext db, ICurrentUser user) { _db = db; _user = user; }

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
}

public record CreateCampaignRequest(string Name, string? TemplateName, List<Guid> TargetUserIds,
    DateTime? ScheduledForUtc, string? LandingPageMessage, bool AuthorizationConfirmed);
