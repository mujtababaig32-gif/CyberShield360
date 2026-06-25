using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Scans.Commands;
using CyberShield360.Application.Features.Scans.Queries;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class ScansController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAiRecommendationService _ai;
    private readonly ICurrentUser _user;

    public ScansController(
        ApplicationDbContext db,
        IAiRecommendationService ai,
        ICurrentUser user)
    {
        _db = db;
        _ai = ai;
        _user = user;
    }

    [HttpPost("run")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Run([FromBody] RunScanRequest req)
        => Ok(await Mediator.Send(new RunScanCommand(req.AssetId, req.Type)));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
        => Ok(await Mediator.Send(new GetScanByIdQuery(id)));

    [HttpGet("{id:guid}/recommendations")]
    public async Task<IActionResult> Recommendations(Guid id, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var scan = await _db.Scans
            .Include(s => s.Asset)
            .Include(s => s.Findings)
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tid, ct);

        if (scan is null) return NotFound();

        var failedFindings = scan.Findings
            .Where(f => !f.Passed)
            .Select(f => $"{f.Title}: {f.Detail}. Recommendation: {f.Recommendation}")
            .ToList();

        var context = string.Join("\n", failedFindings);

        var recommendations = await _ai.GetRecommendationsAsync(context, ct);

        return Ok(new
        {
            scanId = scan.Id,
            domain = scan.Asset?.Domain,
            score = scan.Score,
            grade = scan.Grade.ToString(),
            failedFindings = failedFindings.Count,
            recommendations
        });
    }
}

public record RunScanRequest(Guid AssetId, ScanType Type);