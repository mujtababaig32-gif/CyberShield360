using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Vulnerabilities.Commands;
using CyberShield360.Application.Features.Vulnerabilities.Queries;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class VulnerabilitiesController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public VulnerabilitiesController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] VulnerabilityStatus? status,
        [FromQuery] Severity? severity,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
        => Ok(await Mediator.Send(new GetVulnerabilitiesQuery(status, severity, page, pageSize)));

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var vulnerabilities = await _db.Vulnerabilities
            .AsNoTracking()
            .Where(v => v.TenantId == tid)
            .ToListAsync(ct);

        var open = vulnerabilities.Where(v => v.Status == VulnerabilityStatus.Open).ToList();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            total = vulnerabilities.Count,
            open = open.Count,
            inProgress = vulnerabilities.Count(v => v.Status == VulnerabilityStatus.InProgress),
            remediated = vulnerabilities.Count(v => v.Status == VulnerabilityStatus.Remediated),
            accepted = vulnerabilities.Count(v => v.Status == VulnerabilityStatus.Accepted),
            falsePositive = vulnerabilities.Count(v => v.Status == VulnerabilityStatus.FalsePositive),
            critical = open.Count(v => v.Severity == Severity.Critical),
            high = open.Count(v => v.Severity == Severity.High),
            overdue = open.Count(v => v.DueDateUtc.HasValue && v.DueDateUtc.Value < DateTime.UtcNow),
            bySeverity = vulnerabilities
                .GroupBy(v => v.Severity)
                .Select(g => new { severity = g.Key.ToString(), count = g.Count() })
                .OrderByDescending(x => x.severity)
                .ToList()
        });
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Create([FromBody] CreateVulnerabilityCommand command)
        => Ok(await Mediator.Send(command));

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest req)
        => Ok(await Mediator.Send(new UpdateVulnerabilityStatusCommand(id, req.Status, req.Notes)));
}

public record UpdateStatusRequest(VulnerabilityStatus Status, string? Notes);
