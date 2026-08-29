using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Risks.Commands;
using CyberShield360.Application.Features.Risks.Queries;
using CyberShield360.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

[Authorize]
public class RisksController : ApiControllerBase
{
    private readonly ICurrentUser _user;

    public RisksController(ICurrentUser user)
    {
        _user = user;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] RiskStatus? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        // Defense-in-depth: fail closed even if a token were ever issued without a
        // tenant_id claim, rather than relying solely on the global EF query filter.
        if (_user.TenantId is not Guid) return Unauthorized();

        return Ok(await Mediator.Send(new GetRisksQuery(status, page, pageSize)));
    }

    [HttpGet("heatmap")]
    public async Task<IActionResult> Heatmap()
    {
        if (_user.TenantId is not Guid) return Unauthorized();

        return Ok(await Mediator.Send(new GetRiskHeatmapQuery()));
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Create(CreateRiskCommand command)
    {
        if (_user.TenantId is not Guid) return Unauthorized();

        return Ok(await Mediator.Send(command));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRiskBody body)
    {
        if (_user.TenantId is not Guid) return Unauthorized();

        return Ok(await Mediator.Send(new UpdateRiskCommand(id, body.Status, body.MitigationPlan, body.ResidualScore)));
    }
}

public record UpdateRiskBody(RiskStatus Status, string? MitigationPlan, int? ResidualScore);
