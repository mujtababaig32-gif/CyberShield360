using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class SocController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public SocController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var scans = await _db.Scans
            .Include(x => x.Findings)
            .Include(x => x.Asset)
            .Where(x => x.TenantId == tid)
            .OrderByDescending(x => x.CompletedUtc)
            .Take(100)
            .ToListAsync(ct);

        var findings = scans.SelectMany(x => x.Findings).ToList();

        var alerts = findings
            .Where(x => !x.Passed)
            .OrderByDescending(x => x.Severity)
            .Take(25)
            .Select(x => new
            {
                title = x.Title,
                severity = x.Severity.ToString(),
                source = x.CheckKey,
                recommendation = x.Recommendation,
                createdUtc = DateTime.UtcNow
            });

        return Ok(new
        {
            criticalAlerts = findings.Count(x => !x.Passed && x.Severity == Severity.Critical),
            highAlerts = findings.Count(x => !x.Passed && x.Severity == Severity.High),
            mediumAlerts = findings.Count(x => !x.Passed && x.Severity == Severity.Medium),
            lowAlerts = findings.Count(x => !x.Passed && x.Severity == Severity.Low),

            openIncidents = findings.Count(x => !x.Passed),
            resolvedIncidents = findings.Count(x => x.Passed),

            mttrHours = 4.5,

            alerts
        });
    }
}