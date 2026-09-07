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
    private readonly IHibpService _hibp;

    public DarkWebController(ApplicationDbContext db, ICurrentUser user, IHibpService hibp)
    {
        _db = db;
        _user = user;
        _hibp = hibp;
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

        var tenantEmails = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tid && u.IsActive && u.Email != null)
            .Select(u => u.Email!)
            .ToListAsync(ct);

        var hibp = await _hibp.CheckEmailsAsync(tenantEmails, ct);

        var credentialLeaks = hibp.Accounts
            .Where(a => a.Breaches.Count > 0)
            .SelectMany(a => a.Breaches.Select(b => new
            {
                email = a.Email,
                breachName = b.Name,
                breachDomain = b.Domain,
                breachDate = b.BreachDate,
                dataClasses = b.DataClasses,
                sensitive = b.IsSensitive
            }))
            .OrderByDescending(x => x.breachDate)
            .ToList();

        var leakedCredentialSignals = credentialLeaks.Count;
        var breachMentions = credentialLeaks.Select(x => x.breachName).Distinct().Count();

        var breachedDomains = credentialLeaks
            .Select(x => x.email.Contains('@') ? x.email[(x.email.IndexOf('@') + 1)..].ToLowerInvariant() : string.Empty)
            .Where(d => !string.IsNullOrEmpty(d))
            .ToHashSet();

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

            var domainCredentialLeaks = credentialLeaks.Count(x =>
                x.email.EndsWith("@" + domain, StringComparison.OrdinalIgnoreCase));

            var hasVerifiedBreach = breachedDomains.Contains(domain.ToLowerInvariant()) || domainCredentialLeaks > 0;
            if (hasVerifiedBreach)
                exposureScore = Math.Max(exposureScore, 85);

            var risk = exposureScore >= 60 ? "High" : exposureScore >= 35 ? "Medium" : "Low";

            return new
            {
                domain,
                exposureType = hasVerifiedBreach ? "Verified credential breach" : sensitive,
                leakedCredentialSignals = domainCredentialLeaks,
                breachMentions = credentialLeaks
                    .Where(x => x.email.EndsWith("@" + domain, StringComparison.OrdinalIgnoreCase))
                    .Select(x => x.breachName)
                    .Distinct()
                    .Count(),
                exposureScore,
                riskLevel = risk,
                status = risk == "High" ? "Investigate" : "Monitoring",
                lastSeenUtc = DateTime.UtcNow,
                recommendation = hasVerifiedBreach
                    ? "Verified credential breach found for this domain. Force a password reset and enforce MFA for affected accounts immediately."
                    : risk == "High"
                        ? "Review exposed administrative, remote access, mail, login, or development assets and enforce MFA. This is a surface signal, not verified dark-web breach evidence."
                        : "Continue monitoring domain exposure."
            };
        })
        .OrderByDescending(x => x.exposureScore)
        .ToList();

        var integrationStatus = hibp.Configured ? "Connected" : "Not Configured";

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            monitoredDomains = domains.Count,
            totalExposures = exposures.Count,
            highRiskExposures = exposures.Count(x => x.riskLevel == "High"),
            mediumRiskExposures = exposures.Count(x => x.riskLevel == "Medium"),
            lowRiskExposures = exposures.Count(x => x.riskLevel == "Low"),
            leakedCredentialSignals,
            breachMentions,
            darkWebRiskScore = exposures.Any()
                ? (int)Math.Round(exposures.Average(x => x.exposureScore))
                : 0,
            connectorMode = hibp.Configured ? "Have I Been Pwned (live)" : "Dark-web provider not configured",
            evidenceQuality = hibp.Configured
                ? $"Credential leak data is verified against Have I Been Pwned for {tenantEmails.Count} monitored account(s). Domain exposure signals beyond confirmed breaches are still derived from tenant asset names. {hibp.ProviderStatus}"
                : "No verified breached credential data is displayed because no breach-intelligence provider is connected. Domain exposure signals are derived from tenant asset names only.",
            exposures,
            credentialLeaks,
            executiveActions = exposures
                .Where(x => x.riskLevel == "High")
                .Select(x => x.recommendation)
                .Distinct()
                .Take(5),
            integrations = new[]
            {
                new { name = "HaveIBeenPwned", status = integrationStatus },
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
