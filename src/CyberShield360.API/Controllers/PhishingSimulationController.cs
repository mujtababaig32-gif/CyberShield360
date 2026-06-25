using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class PhishingSimulationController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public PhishingSimulationController(ApplicationDbContext db, ICurrentUser user)
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
            .Where(u => u.TenantId == tid && u.IsActive)
            .Select(u => new { u.Id, u.Email, u.FullName, u.JobTitle })
            .ToListAsync(ct);

        var campaigns = await _db.PhishingCampaigns
            .AsNoTracking()
            .Include(c => c.Targets)
            .Where(c => c.TenantId == tid)
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync(ct);

        var userMap = users.ToDictionary(u => u.Id, u => u);
        var allTargets = campaigns.SelectMany(c => c.Targets.Select(t => new { Campaign = c, Target = t })).ToList();

        var recipients = allTargets.Select(x =>
        {
            userMap.TryGetValue(x.Target.UserId, out var u);
            var result = x.Target.Result;
            var submitted = result == PhishingResult.Submitted;
            var clicked = submitted || result == PhishingResult.Clicked;
            var opened = clicked || result == PhishingResult.Opened;
            var delivered = opened || result == PhishingResult.Delivered || result == PhishingResult.Reported;
            var reported = result == PhishingResult.Reported;

            var risk = submitted
                ? "Critical"
                : clicked
                    ? "High"
                    : opened && !reported
                        ? "Medium"
                        : "Low";

            return new
            {
                userId = x.Target.UserId,
                name = u is null ? "Unknown User" : string.IsNullOrWhiteSpace(u.FullName) ? u.Email : u.FullName,
                email = u?.Email ?? "unknown",
                department = string.IsNullOrWhiteSpace(u?.JobTitle) ? "Unassigned" : u.JobTitle,
                campaignName = x.Campaign.Name,
                sent = delivered,
                opened,
                clicked,
                submittedCredentials = submitted,
                reportedPhish = reported,
                riskLevel = risk,
                lastEventUtc = x.Target.ReportedUtc ?? x.Target.ClickedUtc ?? x.Target.OpenedUtc ?? x.Target.DeliveredUtc ?? x.Campaign.ScheduledForUtc ?? x.Campaign.CreatedAtUtc,
                recommendedAction = submitted
                    ? "Reset credentials and assign immediate coaching."
                    : clicked
                        ? "Assign phishing refresher training."
                        : opened && !reported
                            ? "Encourage reporting of suspicious messages."
                            : "No immediate action required."
            };
        }).ToList();

        var total = recipients.Count;
        var sentCount = recipients.Count(x => x.sent);
        var openedCount = recipients.Count(x => x.opened);
        var clickedCount = recipients.Count(x => x.clicked);
        var submittedCount = recipients.Count(x => x.submittedCredentials);
        var reportedCount = recipients.Count(x => x.reportedPhish);

        var campaignCards = campaigns.Select(c =>
        {
            var targets = c.Targets.ToList();
            var targetCount = targets.Count;
            var opened = targets.Count(t => t.Result is PhishingResult.Opened or PhishingResult.Clicked or PhishingResult.Submitted);
            var clicked = targets.Count(t => t.Result is PhishingResult.Clicked or PhishingResult.Submitted);
            var submitted = targets.Count(t => t.Result == PhishingResult.Submitted);
            var reported = targets.Count(t => t.Result == PhishingResult.Reported);

            return new
            {
                id = c.Id,
                name = c.Name,
                status = c.Status.ToString(),
                template = string.IsNullOrWhiteSpace(c.TemplateName) ? "No template selected" : c.TemplateName,
                audience = targetCount == 0 ? "No targets assigned" : $"{targetCount} assigned targets",
                sentCount = targetCount,
                openRate = targetCount == 0 ? 0 : (int)Math.Round(opened * 100.0 / targetCount),
                clickRate = targetCount == 0 ? 0 : (int)Math.Round(clicked * 100.0 / targetCount),
                submissionRate = targetCount == 0 ? 0 : (int)Math.Round(submitted * 100.0 / targetCount),
                reportRate = targetCount == 0 ? 0 : (int)Math.Round(reported * 100.0 / targetCount),
                launchedUtc = c.ScheduledForUtc ?? c.CreatedAtUtc,
                authorizationConfirmed = c.AuthorizationConfirmed
            };
        }).ToList();

        var templates = campaigns
            .Where(c => !string.IsNullOrWhiteSpace(c.TemplateName))
            .Select(c => c.TemplateName!)
            .Distinct()
            .OrderBy(x => x)
            .Select(name => new
            {
                name,
                category = name.Contains("invoice", StringComparison.OrdinalIgnoreCase) ? "Business Email Compromise" :
                           name.Contains("password", StringComparison.OrdinalIgnoreCase) ? "Credential Awareness" :
                           "Security Awareness",
                difficulty = "Configurable",
                status = "Used In Campaign"
            })
            .ToList();

        var recommendations = new List<string>();
        if (!campaigns.Any())
            recommendations.Add("Create an authorized phishing simulation campaign before measuring user behavior.");
        if (campaigns.Any(c => !c.AuthorizationConfirmed))
            recommendations.Add("Confirm authorization for all phishing simulations before launch.");
        if (submittedCount > 0)
            recommendations.Add("Reset credentials and coach users who submitted information during simulations.");
        if (clickedCount > 0)
            recommendations.Add("Assign refresher training to users who clicked simulation links.");
        if (total > 0 && reportedCount * 100.0 / total < 20)
            recommendations.Add("Improve reporting culture by teaching users how to report suspicious emails.");
        if (!recommendations.Any())
            recommendations.Add("Simulation results are healthy. Continue periodic authorized testing.");

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            totalRecipients = total,
            emailsSent = sentCount,
            opened = openedCount,
            clicked = clickedCount,
            submittedCredentials = submittedCount,
            reportedPhish = reportedCount,
            clickRate = total == 0 ? 0 : (int)Math.Round(clickedCount * 100.0 / total),
            submissionRate = total == 0 ? 0 : (int)Math.Round(submittedCount * 100.0 / total),
            reportRate = total == 0 ? 0 : (int)Math.Round(reportedCount * 100.0 / total),
            highRiskUsers = recipients.Count(x => x.riskLevel is "High" or "Critical"),
            campaigns = campaignCards,
            recipients,
            templates,
            recommendations
        });
    }
}
