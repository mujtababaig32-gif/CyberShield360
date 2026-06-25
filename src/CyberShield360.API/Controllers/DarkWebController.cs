using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class DarkWebController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public DarkWebController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .ToListAsync(ct);

        var domains = assets
            .Select(a => a.Domain)
            .Distinct()
            .OrderBy(x => x)
            .ToList();

        var exposures = domains.Select(domain =>
        {
            var sensitive = SensitiveSignal(domain);
            var exposureScore = sensitive switch
            {
                "Administrative portal exposure" => 70,
                "Remote access surface exposure" => 65,
                "Mail service exposure" => 55,
                "Development environment exposure" => 50,
                "Authentication surface exposure" => 45,
                "Customer portal exposure" => 35,
                _ => 10
            };

            var risk = exposureScore >= 60 ? "High" : exposureScore >= 35 ? "Medium" : "Low";

            return new
            {
                domain,
                exposureType = sensitive,
                leakedCredentialSignals = 0,
                breachMentions = 0,
                exposureScore,
                riskLevel = risk,
                status = risk == "High" ? "Investigate" : "Monitoring",
                lastSeenUtc = DateTime.UtcNow,
                recommendation = risk == "High"
                    ? "Review exposed administrative, remote access, mail, login, or development assets and enforce MFA. This is a surface signal, not verified dark-web breach evidence."
                    : "Continue monitoring domain exposure. Configure a breach-intelligence provider for verified leak evidence."
            };
        })
        .OrderByDescending(x => x.exposureScore)
        .ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            monitoredDomains = domains.Count,
            totalExposures = exposures.Count,
            highRiskExposures = exposures.Count(x => x.riskLevel == "High"),
            mediumRiskExposures = exposures.Count(x => x.riskLevel == "Medium"),
            lowRiskExposures = exposures.Count(x => x.riskLevel == "Low"),
            leakedCredentialSignals = 0,
            breachMentions = 0,
            darkWebRiskScore = exposures.Any()
                ? (int)Math.Round(exposures.Average(x => x.exposureScore))
                : 0,
            connectorMode = "Dark-web provider not configured",
            evidenceQuality = "No verified breached credential data is displayed because no breach-intelligence provider is connected. Domain exposure signals are derived from tenant asset names only.",
            exposures,
            credentialLeaks = Array.Empty<object>(),
            executiveActions = exposures
                .Where(x => x.riskLevel == "High")
                .Select(x => x.recommendation)
                .Distinct()
                .Take(5),
            integrations = new[]
            {
                new { name = "HaveIBeenPwned", status = "Not Configured" },
                new { name = "DeHashed", status = "Not Configured" },
                new { name = "LeakCheck", status = "Not Configured" },
                new { name = "IntelX", status = "Not Configured" }
            }
        });
    }

    private static string SensitiveSignal(string domain)
    {
        var d = domain.ToLowerInvariant();
        if (d.Contains("admin")) return "Administrative portal exposure";
        if (d.Contains("vpn") || d.Contains("rdp")) return "Remote access surface exposure";
        if (d.Contains("mail") || d.Contains("smtp")) return "Mail service exposure";
        if (d.Contains("dev") || d.Contains("staging") || d.Contains("test")) return "Development environment exposure";
        if (d.Contains("login") || d.Contains("auth") || d.Contains("sso")) return "Authentication surface exposure";
        if (d.Contains("portal")) return "Customer portal exposure";
        return "Domain monitoring";
    }
}
